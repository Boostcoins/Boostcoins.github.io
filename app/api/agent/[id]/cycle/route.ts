import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runOnChainCycle } from '@/lib/solana'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, status, user_id')
    .eq('id', id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 })
  }

  if (agent.status !== 'active') {
    return NextResponse.json({ error: 'agent is not active' }, { status: 400 })
  }

  const { data: agentFull } = await supabaseAdmin
    .from('agents')
    .select('token_ca')
    .eq('id', id)
    .single()

  const { data: wallet } = await supabaseAdmin
    .from('wallets')
    .select('encrypted_private_key')
    .eq('user_id', agent.user_id)
    .single()

  if (!wallet || !agentFull) {
    return NextResponse.json({ error: 'wallet or agent config missing' }, { status: 500 })
  }

  const result = await runOnChainCycle(id, wallet.encrypted_private_key, agentFull.token_ca)

  return NextResponse.json(result)
}
