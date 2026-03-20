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
import { validateApiKey } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { keypairFromEncrypted, getWalletBalance, generateWallet } from '@/lib/wallet'
import { fireWebhooks } from '@/lib/webhooks'

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
const LAUNCH_FEE_SOL = 0.025
const DEPLOY_MIN_SOL = 0.05
const TOTAL_MIN_SOL = LAUNCH_FEE_SOL + DEPLOY_MIN_SOL

export async function POST(req: NextRequest) {
  const tag = '[API:LAUNCH]'

  const auth = await validateApiKey(req.headers.get('authorization'))
  if (!auth) {
    return NextResponse.json({ error: 'invalid or missing API key' }, { status: 401 })
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    let name: string, symbol: string, description: string, agentName: string, persona: string
    let twitter = '', telegram = '', website = ''
    let imageFile: File | null = null
    let initialBuySol = 0

    if (contentType.includes('multipart/form-data')) {
      const fd = await req.formData()
      name = fd.get('name') as string
      symbol = fd.get('symbol') as string
      description = fd.get('description') as string
      agentName = (fd.get('agent_name') as string) || name
      persona = fd.get('persona') as string
      twitter = (fd.get('twitter') as string) || ''
      telegram = (fd.get('telegram') as string) || ''
      website = (fd.get('website') as string) || ''
      imageFile = fd.get('image') as File
      initialBuySol = parseFloat((fd.get('initial_buy') as string) || '0')
    } else {
      return NextResponse.json({
        error: 'content-type must be multipart/form-data (image upload required)',
        required: ['name', 'symbol', 'description', 'persona', 'image'],
        optional: ['agent_name', 'twitter', 'telegram', 'website', 'initial_buy'],
      }, { status: 400 })
    }

    if (!name || !symbol || !description || !persona || !imageFile) {
      return NextResponse.json({
        error: 'missing required fields',
        required: ['name', 'symbol', 'description', 'persona', 'image'],
      }, { status: 400 })
    }

    console.log(`${tag} user ${auth.userId} launching: $${symbol} (${name})`)

    const { count } = await supabaseAdmin
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('status', 'active')

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: 'maximum 3 active agents per account' }, { status: 403 })
    }

    const { data: walletRow } = await supabaseAdmin
      .from('wallets')
      .select('public_key, encrypted_private_key')
      .eq('user_id', auth.userId)
      .single()

    if (!walletRow) {
      return NextResponse.json({ error: 'wallet not found — log in to dashboard first' }, { status: 404 })
    }

    const keypair = keypairFromEncrypted(walletRow.encrypted_private_key)
    const agentWallet = generateWallet()

    const requiredSol = TOTAL_MIN_SOL + Math.max(0, initialBuySol)
    let balance = 0
    try {
      balance = await getWalletBalance(walletRow.public_key)
    } catch {
      return NextResponse.json({ error: 'failed to check wallet balance' }, { status: 500 })
    }

    if (balance < requiredSol) {
      return NextResponse.json({
        error: `insufficient balance: ${balance.toFixed(4)} SOL (need ${requiredSol.toFixed(4)} SOL)`,
        wallet: walletRow.public_key,
        fund: `send ${(requiredSol - balance).toFixed(4)} more SOL to ${walletRow.public_key}`,
      }, { status: 402 })
    }

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

    const ipfsRes = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: uploadForm })
    if (!ipfsRes.ok) {
      const errText = await ipfsRes.text()
      return NextResponse.json({ error: `ipfs upload failed: ${errText}` }, { status: 500 })
    }

    const ipfsData = await ipfsRes.json()
    const metadataUri = ipfsData.metadataUri

    let imageUrl: string = ipfsData.imageUri || ipfsData.image || ''
    if (!imageUrl && metadataUri) {
      try {
        const metaRes = await fetch(metadataUri)
        if (metaRes.ok) {
          const meta = await metaRes.json()
          imageUrl = meta.image || ''
        }
      } catch {}
    }

    console.log(`${tag} creating token on pump.fun`)
    const connection = new Connection(RPC_URL, 'confirmed')
    const sdk = new OnlinePumpSdk(connection)
    const mint = Keypair.generate()
    const global = await sdk.fetchGlobal()
    const solAmount = new BN(Math.floor(Math.max(initialBuySol, 0) * 1e9))
    const agentKeypair = keypairFromEncrypted(agentWallet.encryptedPrivateKey)

    type Ix = { programId: import('@solana/web3.js').PublicKey; keys: { pubkey: import('@solana/web3.js').PublicKey; isSigner: boolean; isWritable: boolean }[] }
    let ixArray: import('@solana/web3.js').TransactionInstruction[]

    if (initialBuySol > 0) {
      const INIT_VIRTUAL_TOKENS = new BN('1073000191000000')
      const INIT_VIRTUAL_SOL = new BN('30000000000')
      const effectiveSol = solAmount.muln(98).divn(100)
      const tokenAmount = INIT_VIRTUAL_TOKENS.mul(effectiveSol).div(INIT_VIRTUAL_SOL.add(effectiveSol))

      const result = await PUMP_SDK.createV2AndBuyInstructions({
        global, mint: mint.publicKey, name, symbol, uri: metadataUri,
        creator: agentKeypair.publicKey, user: keypair.publicKey,
        solAmount, amount: tokenAmount, mayhemMode: false,
      })
      ixArray = result as unknown as import('@solana/web3.js').TransactionInstruction[]
    } else {
      const result = await PUMP_SDK.createV2Instruction({
        mint: mint.publicKey, name, symbol, uri: metadataUri,
        creator: agentKeypair.publicKey, user: keypair.publicKey, mayhemMode: false,
      })
      ixArray = [result] as unknown as import('@solana/web3.js').TransactionInstruction[]
    }

    for (const ix of ixArray as unknown as Ix[]) {
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
      skipPreflight: false, preflightCommitment: 'processed',
    })

    const mintAddress = mint.publicKey.toBase58()
    console.log(`${tag} token created: ${mintAddress} | tx: ${sig}`)

    const { data: agent, error: insertErr } = await supabaseAdmin
      .from('agents')
      .insert({
        user_id: auth.userId,
        name: agentName.trim(),
        token_name: symbol.trim().toUpperCase(),
        token_ca: mintAddress,
        persona: persona.trim(),
        status: 'active',
        image_url: imageUrl || null,
        twitter: twitter || null,
        telegram: telegram || null,
        website: website || null,
        wallet_public_key: agentWallet.publicKey,
        wallet_encrypted_pk: agentWallet.encryptedPrivateKey,
      })
      .select('id')
      .single()

    if (insertErr || !agent) {
      console.error(`${tag} agent insert failed: ${insertErr?.message}`)
      return NextResponse.json({
        error: 'token created but agent deploy failed',
        mint: mintAddress,
        tx: sig,
      }, { status: 500 })
    }

    await supabaseAdmin.from('agent_stats').insert({
      agent_id: agent.id, total_claimed: 0, total_burned: 0, total_lp: 0,
    })

    fireWebhooks(agent.id, 'deploy', {
      agent_id: agent.id, mint: mintAddress, name: agentName, symbol,
    }).catch(() => {})

    console.log(`${tag} complete: agent ${agent.id} for $${symbol} (${mintAddress})`)

    return NextResponse.json({
      success: true,
      agent_id: agent.id,
      mint: mintAddress,
      tx: sig,
      image_url: imageUrl,
      wallet: walletRow.public_key,
      agent_page: `https://www.giveyourcoinapilot.fun/agent/${agent.id}`,
      pump_fun: `https://pump.fun/coin/${mintAddress}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`${tag} error: ${msg}`)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
