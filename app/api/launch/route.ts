import { NextRequest, NextResponse } from 'next/server'
import {
  Connection,
  Keypair,
  Transaction,
  ComputeBudgetProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
  OnlinePumpSdk,
  PUMP_SDK,
  PUMP_PROGRAM_ID,
  bondingCurveV2Pda,
} from '@pump-fun/pump-sdk'
import BN from 'bn.js'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { keypairFromEncrypted, getWalletBalance, generateWallet } from '@/lib/wallet'

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'

// SOL costs for the full launch+deploy flow
const LAUNCH_FEE_SOL  = 0.025  // pump.fun token creation + tx fees
const DEPLOY_MIN_SOL  = 0.05   // minimum left in wallet after launch (covers agent tx fees)
const TOTAL_MIN_SOL   = LAUNCH_FEE_SOL + DEPLOY_MIN_SOL // ~0.075 SOL baseline (+ initial buy on top)

export async function POST(req: NextRequest) {
  const tag = '[LAUNCH]'
  try {
    const session = await getSession()
    if (!session) {
      console.log(`${tag} unauthorized request`)
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const fd = await req.formData()
    const name = fd.get('name') as string
    const symbol = fd.get('symbol') as string
    const description = fd.get('description') as string
    const twitter = (fd.get('twitter') as string) || ''
    const telegram = (fd.get('telegram') as string) || ''
    const website = (fd.get('website') as string) || ''
    const imageFile = fd.get('image') as File
    const initialBuyStr = fd.get('initialBuy') as string

    if (!name || !symbol || !description || !imageFile) {
      return NextResponse.json({ error: 'missing required fields (name, symbol, description, image)' }, { status: 400 })
    }

    console.log(`${tag} user ${session.userId} launching token: ${symbol} (${name})`)

    // Get user wallet
    const { data: walletRow, error: walletErr } = await supabaseAdmin
      .from('wallets')
      .select('public_key, encrypted_private_key')
      .eq('user_id', session.userId)
      .single()

    if (walletErr || !walletRow) {
      console.error(`${tag} wallet not found for user ${session.userId}: ${walletErr?.message}`)
      return NextResponse.json({ error: 'wallet not found' }, { status: 400 })
    }

    // Master wallet — pays for the transaction
    const keypair = keypairFromEncrypted(walletRow.encrypted_private_key)
    console.log(`${tag} master wallet: ${walletRow.public_key}`)

    // Agent wallet — dedicated keypair that becomes the pump.fun creator (receives fees)
    const agentWallet = generateWallet()
    const agentKeypair = keypairFromEncrypted(agentWallet.encryptedPrivateKey)
    console.log(`${tag} agent wallet (creator): ${agentWallet.publicKey}`)

    // Pre-flight balance check — must have enough for launch fee + initial buy + deploy minimum
    const initialBuySol = parseFloat(initialBuyStr || '0')
    const requiredSol = TOTAL_MIN_SOL + Math.max(0, initialBuySol)

    let balance = 0
    try {
      balance = await getWalletBalance(walletRow.public_key)
    } catch (err) {
      console.error(`${tag} failed to fetch balance: ${err instanceof Error ? err.message : err}`)
      return NextResponse.json({ error: 'failed to check wallet balance' }, { status: 500 })
    }

    console.log(`${tag} balance: ${balance.toFixed(4)} SOL — required: ${requiredSol.toFixed(4)} SOL`)

    if (balance < requiredSol) {
      const needed = requiredSol - balance
      return NextResponse.json(
        {
          error: `insufficient balance. wallet has ${balance.toFixed(4)} SOL but needs at least ${requiredSol.toFixed(4)} SOL (~0.025 for launch fee + ${initialBuySol} initial buy + 0.075 to keep agent running). top up ${needed.toFixed(4)} more SOL and try again.`,
        },
        { status: 402 }
      )
    }

    // Step 1: Upload image + metadata to pump.fun IPFS
    console.log(`${tag} uploading metadata to pump.fun IPFS`)
    const uploadForm = new FormData()
    uploadForm.append('file', imageFile, imageFile.name)
    uploadForm.append('name', name)
    uploadForm.append('symbol', symbol)
    uploadForm.append('description', description)
    uploadForm.append('twitter', twitter)
    uploadForm.append('telegram', telegram)
    uploadForm.append('website', website)
    uploadForm.append('showName', 'true')

    const ipfsRes = await fetch('https://pump.fun/api/ipfs', {
      method: 'POST',
      body: uploadForm,
    })

    if (!ipfsRes.ok) {
      const errText = await ipfsRes.text()
      console.error(`${tag} IPFS upload failed (${ipfsRes.status}): ${errText}`)
      return NextResponse.json({ error: `ipfs upload failed: ${errText}` }, { status: 500 })
    }

    const ipfsData = await ipfsRes.json()
    const metadataUri = ipfsData.metadataUri
    console.log(`${tag} IPFS response: ${JSON.stringify(ipfsData)}`)

    // Try to get image URL — pump.fun embeds it inside the metadata JSON
    let imageUrl: string = ipfsData.imageUri || ipfsData.image || ''
    if (!imageUrl && metadataUri) {
      try {
        const metaRes = await fetch(metadataUri)
        if (metaRes.ok) {
          const meta = await metaRes.json()
          imageUrl = meta.image || ''
          console.log(`${tag} image from metadata: ${imageUrl}`)
        }
      } catch (e) {
        console.error(`${tag} failed to fetch metadata for image URL: ${e}`)
      }
    }
    console.log(`${tag} metadata uploaded: ${metadataUri} | image: ${imageUrl || '(none)'}`)

    // Step 2: Create token on pump.fun
    const connection = new Connection(RPC_URL, 'confirmed')
    const sdk = new OnlinePumpSdk(connection)
    const mint = Keypair.generate()

    console.log(`${tag} creating token on pump.fun — mint: ${mint.publicKey.toBase58()} | initial buy: ${initialBuySol} SOL`)

    const global = await sdk.fetchGlobal()
    const solAmount = new BN(Math.floor(Math.max(initialBuySol, 0) * 1e9))


    let ixArray: import('@solana/web3.js').TransactionInstruction[]

    if (initialBuySol > 0) {
      // For a brand-new token the bonding curve doesn't exist on-chain yet,
      // so we can't call fetchBuyState. Calculate using pump.fun's known initial
      // virtual reserves (constant for every new token).
      // pump.fun charges a 1% trading fee — only solAmount*0.99 enters the curve.
      // We also apply a small 1% safety buffer to avoid slippage failures.
      const INIT_VIRTUAL_TOKENS = new BN('1073000191000000') // 1,073,000,191 tokens
      const INIT_VIRTUAL_SOL   = new BN('30000000000')       // 30 SOL in lamports
      const effectiveSol = solAmount.muln(98).divn(100)      // ~2% off for fee + buffer
      const tokenAmount = INIT_VIRTUAL_TOKENS.mul(effectiveSol).div(INIT_VIRTUAL_SOL.add(effectiveSol))

      console.log(`${tag} initial buy token estimate: ${tokenAmount.toString()} (for ${initialBuySol} SOL, effective: ${effectiveSol.toString()} lamports)`)

      const result = await PUMP_SDK.createAndBuyInstructions({
        global,
        mint: mint.publicKey,
        name,
        symbol,
        uri: metadataUri,
        creator: agentKeypair.publicKey,
        user: keypair.publicKey,
        solAmount,
        amount: tokenAmount,
      })
      ixArray = result as unknown as import('@solana/web3.js').TransactionInstruction[]
    } else {
      const result = await PUMP_SDK.createInstruction({
        mint: mint.publicKey,
        name,
        symbol,
        uri: metadataUri,
        creator: agentKeypair.publicKey,
        user: keypair.publicKey,
      })
      ixArray = result as unknown as import('@solana/web3.js').TransactionInstruction[]
    }

    // Append V2 PDA (required after program upgrade)
    for (const ix of ixArray as unknown as { programId: import('@solana/web3.js').PublicKey; keys: { pubkey: import('@solana/web3.js').PublicKey; isSigner: boolean; isWritable: boolean }[] }[]) {
      if (ix.programId.equals(PUMP_PROGRAM_ID)) {
        ix.keys.push({ pubkey: bondingCurveV2Pda(mint.publicKey), isSigner: false, isWritable: false })
      }
    }

    const tx = new Transaction()
    tx.instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100_000 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ...ixArray
    )

    const { blockhash } = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    tx.feePayer = keypair.publicKey

    const sig = await sendAndConfirmTransaction(connection, tx, [keypair, mint], {
      skipPreflight: false,
      preflightCommitment: 'processed',
    })

    const mintAddress = mint.publicKey.toBase58()
    console.log(`${tag} token created! mint: ${mintAddress} | tx: ${sig}`)

    return NextResponse.json({
      mint: mintAddress,
      imageUrl,
      metadataUri,
      agentWalletPublicKey: agentWallet.publicKey,
      agentWalletEncryptedPk: agentWallet.encryptedPrivateKey,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error(`${tag} unhandled error: ${msg}`)
    if (stack) console.error(`${tag} stack: ${stack}`)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
