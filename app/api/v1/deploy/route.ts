import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getWalletBalance } from '@/lib/wallet'

const MIN_SOL_TO_DEPLOY = 0.05

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('authorization'))
  if (!auth) {
    return NextResponse.json({ error: 'invalid or missing API key' }, { status: 401 })
  }

  const { name, token_name, token_ca, persona, image_url, twitter, telegram, website } = await req.json()

  if (!name || !token_name || !token_ca || !persona) {
    return NextResponse.json({
      error: 'missing required fields',
      required: ['name', 'token_name', 'token_ca', 'persona'],
    }, { status: 400 })
  }

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token_ca)) {
    return NextResponse.json({ error: 'invalid token contract address' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('agents')
    .select('id')
    .eq('token_ca', token_ca)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'an agent already exists for this token' }, { status: 409 })
  }

  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('public_key')
    .eq('user_id', auth.userId)
    .single()

  if (!wallet) {
    return NextResponse.json({ error: 'wallet not found — log in to dashboard first to create one' }, { status: 404 })
  }

  let balance = 0
  try {
    balance = await getWalletBalance(wallet.public_key)
  } catch {
    return NextResponse.json({ error: 'failed to check wallet balance' }, { status: 500 })
  }

  if (balance < MIN_SOL_TO_DEPLOY) {
    return NextResponse.json({
      error: `insufficient balance: ${balance.toFixed(4)} SOL (need ${MIN_SOL_TO_DEPLOY} SOL)`,
      wallet: wallet.public_key,
    }, { status: 402 })
  }

  const { count } = await supabaseAdmin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .eq('status', 'active')

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'maximum 3 active agents per account' }, { status: 403 })
  }

  const { data: agent, error: insertErr } = await supabaseAdmin
    .from('agents')
    .insert({
      user_id: auth.userId,
      name: name.trim(),
      token_name: token_name.trim().toUpperCase(),
      token_ca: token_ca.trim(),
      persona: persona.trim(),
      status: 'active',
      image_url: image_url || null,
      twitter: twitter || null,
      telegram: telegram || null,
      website: website || null,
    })
    .select('id')
    .single()

  if (insertErr || !agent) {
    return NextResponse.json({ error: 'failed to deploy agent' }, { status: 500 })
  }

  await supabaseAdmin.from('agent_stats').insert({
    agent_id: agent.id,
    total_claimed: 0,
    total_burned: 0,
    total_lp: 0,
  })

  return NextResponse.json({
    success: true,
    agent_id: agent.id,
    wallet: wallet.public_key,
    message: `agent deployed. fund ${wallet.public_key} with SOL to start cycles.`,
    view: `https://www.giveyourcoinapilot.fun/agent/${agent.id}`,
  })
}
