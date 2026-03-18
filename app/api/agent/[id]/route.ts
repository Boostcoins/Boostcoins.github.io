import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [agentRes, statsRes, logsRes, memoriesRes] = await Promise.all([
    supabaseAdmin
      .from('agents')
      .select('id, name, token_name, token_ca, persona, mood, status, last_think, created_at')
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('agent_stats')
      .select('total_claimed, total_burned, total_lp, last_cycle, last_strategy')
      .eq('agent_id', id)
      .single(),
    supabaseAdmin
      .from('logs')
      .select('id, title, body, mood, created_at')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('memories')
      .select('id, content, created_at')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  if (!agentRes.data) {
    return NextResponse.json({ error: 'agent not found' }, { status: 404 })
  }

  return NextResponse.json({
    agent: agentRes.data,
    stats: statsRes.data,
    logs: logsRes.data ?? [],
    memories: memoriesRes.data ?? [],
  })
}
