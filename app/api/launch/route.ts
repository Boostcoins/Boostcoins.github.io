import { NextRequest, NextResponse } from 'next/server'
import { Connection, Keypair, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'
import { PumpSdk } from '@pump-fun/pump-sdk'
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
    uploadForm.append('twitter', '')
    uploadForm.append('telegram', '')
    uploadForm.append('website', '')
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
    const sdk = new PumpSdk(connection)

    const mint = Keypair.generate()
    const initialBuySol = parseFloat(initialBuyStr || '0')

    let instructions: { instructions: import('@solana/web3.js').TransactionInstruction[] }

    if (initialBuySol > 0) {
      const global = await sdk.fetchGlobal()
      const solAmount = new BN(Math.floor(initialBuySol * 1e9))
      const { getBuyTokenAmountFromSolAmount } = await import('@pump-fun/pump-sdk')
      const tokenAmount = getBuyTokenAmountFromSolAmount(global, null, solAmount)

      instructions = await sdk.createAndBuyInstructions({
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
    } else {
      instructions = await sdk.createInstruction({
        mint: mint.publicKey,
        name,
        symbol,
        uri: metadataUri,
        creator: keypair.publicKey,
        user: keypair.publicKey,
      })
    }

    const tx = new Transaction()
    const ixArray = Array.isArray(instructions) ? instructions : instructions.instructions
    tx.add(...ixArray)

    const { blockhash } = await connection.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    tx.feePayer = keypair.publicKey

    const signers = [keypair, mint]
    await sendAndConfirmTransaction(connection, tx, signers, { commitment: 'confirmed' })

    return NextResponse.json({ mint: mint.publicKey.toBase58() })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
