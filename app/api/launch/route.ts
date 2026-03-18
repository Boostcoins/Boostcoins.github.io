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
  getBuyTokenAmountFromSolAmount,
  bondingCurveV2Pda,
} from '@pump-fun/pump-sdk'
import BN from 'bn.js'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { keypairFromEncrypted } from '@/lib/wallet'

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

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
      return NextResponse.json({ error: 'missing fields' }, { status: 400 })
    }

    // Get user wallet
    const { data: walletRow } = await supabaseAdmin
      .from('wallets')
      .select('public_key, encrypted_private_key')
      .eq('user_id', session.userId)
      .single()

    if (!walletRow) return NextResponse.json({ error: 'wallet not found' }, { status: 400 })

    const keypair = keypairFromEncrypted(walletRow.encrypted_private_key)

    // Step 1: Upload image + metadata to pump.fun IPFS
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
      return NextResponse.json({ error: `ipfs upload failed: ${errText}` }, { status: 500 })
    }

    const { metadataUri } = await ipfsRes.json()

    // Step 2: Create token on pump.fun
    const connection = new Connection(RPC_URL, 'confirmed')
    const sdk = new OnlinePumpSdk(connection)
    const mint = Keypair.generate()
    const initialBuySol = parseFloat(initialBuyStr || '0')

    const global = await sdk.fetchGlobal()
    const solAmount = new BN(Math.floor(Math.max(initialBuySol, 0) * 1e9))

    let ixArray: import('@solana/web3.js').TransactionInstruction[]

    if (initialBuySol > 0) {
      const buyState = await sdk.fetchBuyState(mint.publicKey, keypair.publicKey)
      const tokenAmount = getBuyTokenAmountFromSolAmount({
        global,
        feeConfig: null,
        mintSupply: buyState.bondingCurve?.tokenTotalSupply ?? new BN(0),
        bondingCurve: buyState.bondingCurve,
        amount: solAmount,
      })
      const result = await PUMP_SDK.createAndBuyInstructions({
        global,
        mint: mint.publicKey,
        name,
        symbol,
        uri: metadataUri,
        creator: keypair.publicKey,
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
        creator: keypair.publicKey,
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

    await sendAndConfirmTransaction(connection, tx, [keypair, mint], {
      skipPreflight: false,
      preflightCommitment: 'processed',
    })

    return NextResponse.json({ mint: mint.publicKey.toBase58() })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
