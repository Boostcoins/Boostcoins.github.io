import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runThinkCycle } from '@/lib/agent'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: agent } = await supabaseAdmin
    .from('agents')
    .select('id, name, persona, token_name, token_ca, status')
    .eq('id', id)
    .single()

  if (!agent) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 })
  }

  if (agent.status !== 'active') {
    return NextResponse.json({ error: 'agent is not active' }, { status: 400 })
  }

  const result = await runThinkCycle({
    id: agent.id,
    name: agent.name,
    persona: agent.persona,
    tokenName: agent.token_name,
    tokenCa: agent.token_ca,
  })

  if (!result) {
    return NextResponse.json({ error: 'think cycle failed' }, { status: 500 })
  }

  return NextResponse.json(result)
}
