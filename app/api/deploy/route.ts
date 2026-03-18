import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getWalletBalance } from '@/lib/wallet'

const MIN_SOL_TO_DEPLOY = 0.05

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { name, tokenName, tokenCa, persona } = await req.json()

  if (!name || !tokenName || !tokenCa || !persona) {
    return NextResponse.json({ error: 'all fields required' }, { status: 400 })
  }

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenCa)) {
    return NextResponse.json({ error: 'invalid token contract address' }, { status: 400 })
  }

  // Check wallet balance
  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('public_key')
    .eq('user_id', session.userId)
    .single()

  if (!wallet) {
    return NextResponse.json({ error: 'wallet not found' }, { status: 404 })
  }

  const balance = await getWalletBalance(wallet.public_key)
  if (balance < MIN_SOL_TO_DEPLOY) {
    return NextResponse.json(
      { error: `insufficient balance. minimum ${MIN_SOL_TO_DEPLOY} SOL required to deploy` },
      { status: 402 }
    )
  }

  // Check agent limit (max 3 per user)
  const { count } = await supabaseAdmin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.userId)
    .eq('status', 'active')

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'maximum 3 active agents per account' }, { status: 403 })
  }

  const { data: agent, error } = await supabaseAdmin
    .from('agents')
    .insert({
      user_id: session.userId,
      name: name.trim(),
      token_name: tokenName.trim().toUpperCase(),
      token_ca: tokenCa.trim(),
      persona: persona.trim(),
      status: 'active',
    })
    .select('id')
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'failed to deploy agent' }, { status: 500 })
  }

  // Create initial stats row
  await supabaseAdmin.from('agent_stats').insert({
    agent_id: agent.id,
    total_claimed: 0,
    total_burned: 0,
    total_lp: 0,
  })

  return NextResponse.json({ success: true, agentId: agent.id })
}
