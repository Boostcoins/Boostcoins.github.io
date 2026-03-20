import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { keypairFromEncrypted } from '@/lib/wallet'
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js'

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com'
const MIN_RESERVE_SOL = 0.01

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const BLOCKED_USER_IDS = new Set([
      '13a84099-3840-41b8-af41-7ccab34ae232', // pilot platform account
    ])
    if (BLOCKED_USER_IDS.has(session.userId)) {
      return NextResponse.json({ error: 'withdrawals disabled for this account' }, { status: 403 })
    }

    const { destination, amount } = await req.json()

    if (!destination || !amount) {
      return NextResponse.json({ error: 'destination and amount required' }, { status: 400 })
    }

    let destPubkey: PublicKey
    try {
      destPubkey = new PublicKey(destination)
    } catch {
      return NextResponse.json({ error: 'invalid wallet address' }, { status: 400 })
    }

    const amountSol = parseFloat(amount)
    if (isNaN(amountSol) || amountSol <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
    }

    const { data: wallet } = await supabaseAdmin
      .from('wallets')
      .select('public_key, encrypted_private_key')
      .eq('user_id', session.userId)
      .single()

    if (!wallet) {
      return NextResponse.json({ error: 'wallet not found' }, { status: 404 })
    }

    const connection = new Connection(RPC_URL, 'confirmed')
    const keypair = keypairFromEncrypted(wallet.encrypted_private_key)
    const balanceLamports = await connection.getBalance(keypair.publicKey)
    const balanceSol = balanceLamports / LAMPORTS_PER_SOL

    const maxWithdrawable = balanceSol - MIN_RESERVE_SOL
    if (maxWithdrawable <= 0) {
      return NextResponse.json({
        error: `balance too low to withdraw — need at least ${MIN_RESERVE_SOL} SOL reserved for agent fees`,
      }, { status: 400 })
    }

    if (amountSol > maxWithdrawable) {
      return NextResponse.json({
        error: `max withdrawable is ${maxWithdrawable.toFixed(4)} SOL (${MIN_RESERVE_SOL} SOL reserved for fees)`,
      }, { status: 400 })
    }

    const lamportsToSend = Math.floor(amountSol * LAMPORTS_PER_SOL)

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: destPubkey,
        lamports: lamportsToSend,
      })
    )

    const signature = await sendAndConfirmTransaction(connection, tx, [keypair], {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })

    return NextResponse.json({ success: true, signature, amount: amountSol })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'server error'
    console.error('[WITHDRAW]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
