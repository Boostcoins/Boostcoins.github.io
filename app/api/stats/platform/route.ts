import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const [agentsRes, statsRes, logsRes] = await Promise.all([
      supabaseAdmin.from('agents').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabaseAdmin.from('agent_stats').select('total_burned, total_claimed, total_lp'),
      supabaseAdmin.from('logs').select('id', { count: 'exact', head: true }),
    ])

    const total_agents = agentsRes.count ?? 0
    const stats = statsRes.data ?? []
    const total_burned = stats.reduce((s, r) => s + Number(r.total_burned || 0), 0)
    const total_sol_claimed = stats.reduce((s, r) => s + (r.total_claimed || 0), 0)
    const total_lp = stats.reduce((s, r) => s + (r.total_lp || 0), 0)
    const total_think_cycles = logsRes.count ?? 0

    return NextResponse.json({ total_agents, total_burned, total_sol_claimed, total_lp, total_think_cycles })
  } catch {
    return NextResponse.json({ total_agents: 0, total_burned: 0, total_sol_claimed: 0, total_lp: 0, total_think_cycles: 0 })
  }
}
