import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getWalletBalance } from '@/lib/wallet'

const MIN_SOL_TO_DEPLOY = 0.05

export async function POST(req: NextRequest) {
  const tag = '[DEPLOY]'
  const session = await getSession()
  if (!session) {
    console.log(`${tag} unauthorized request`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { name, tokenName, tokenCa, persona, imageUrl, twitter, telegram, website, agentWalletPublicKey, agentWalletEncryptedPk } = await req.json()

  if (!name || !tokenName || !tokenCa || !persona) {
    return NextResponse.json({ error: 'all fields required' }, { status: 400 })
  }

  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenCa)) {
    return NextResponse.json({ error: 'invalid token contract address' }, { status: 400 })
  }

  console.log(`${tag} user ${session.userId} deploying agent "${name}" for $${tokenName} (${tokenCa})`)

  // Check wallet balance
  const { data: wallet, error: walletErr } = await supabaseAdmin
    .from('wallets')
    .select('public_key')
    .eq('user_id', session.userId)
    .single()

  if (walletErr || !wallet) {
    console.error(`${tag} wallet not found: ${walletErr?.message}`)
    return NextResponse.json({ error: 'wallet not found' }, { status: 404 })
  }

  let balance = 0
  try {
    balance = await getWalletBalance(wallet.public_key)
  } catch (err) {
    console.error(`${tag} failed to fetch wallet balance: ${err instanceof Error ? err.message : err}`)
    return NextResponse.json({ error: 'failed to check wallet balance' }, { status: 500 })
  }

  console.log(`${tag} wallet balance: ${balance} SOL (min: ${MIN_SOL_TO_DEPLOY})`)

  if (balance < MIN_SOL_TO_DEPLOY) {
    return NextResponse.json(
      { error: `insufficient balance. wallet has ${balance.toFixed(4)} SOL — minimum ${MIN_SOL_TO_DEPLOY} SOL needed to run agent cycles` },
      { status: 402 }
    )
  }

  // Check agent limit (max 3 per user)
  const { count, error: countErr } = await supabaseAdmin
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.userId)
    .eq('status', 'active')

  if (countErr) console.error(`${tag} failed to count agents: ${countErr.message}`)

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'maximum 3 active agents per account' }, { status: 403 })
  }

  const { data: agent, error: insertErr } = await supabaseAdmin
    .from('agents')
    .insert({
      user_id: session.userId,
      name: name.trim(),
      token_name: tokenName.trim().toUpperCase(),
      token_ca: tokenCa.trim(),
      persona: persona.trim(),
      status: 'active',
      image_url: imageUrl || null,
      twitter: twitter || null,
      telegram: telegram || null,
      website: website || null,
      wallet_public_key: agentWalletPublicKey || null,
      wallet_encrypted_pk: agentWalletEncryptedPk || null,
    })
    .select('id')
    .single()

  if (insertErr || !agent) {
    console.error(`${tag} failed to insert agent: ${insertErr?.message ?? 'unknown'}`)
    return NextResponse.json({ error: 'failed to deploy agent' }, { status: 500 })
  }

  // Create initial stats row
  const { error: statsErr } = await supabaseAdmin.from('agent_stats').insert({
    agent_id: agent.id,
    total_claimed: 0,
    total_burned: 0,
    total_lp: 0,
  })
  if (statsErr) console.error(`${tag} failed to create stats row: ${statsErr.message}`)

  console.log(`${tag} agent deployed successfully: ${agent.id}`)
  return NextResponse.json({ success: true, agentId: agent.id })
}
