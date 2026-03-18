import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getWalletBalance } from '@/lib/wallet'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const [userRes, walletRes, agentsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, username').eq('id', session.userId).single(),
    supabaseAdmin.from('wallets').select('public_key').eq('user_id', session.userId).single(),
    supabaseAdmin
      .from('agents')
      .select('id, name, token_name, token_ca, status, mood, last_think, created_at')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false }),
  ])

  const wallet = walletRes.data
  let balance = 0
  if (wallet) {
    try {
      balance = await getWalletBalance(wallet.public_key)
    } catch {
      balance = 0
    }
  }

  return NextResponse.json({
    user: userRes.data,
    wallet: wallet ? { publicKey: wallet.public_key, balance } : null,
    agents: agentsRes.data ?? [],
  })
}
