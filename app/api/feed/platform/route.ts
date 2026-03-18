import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: logs } = await supabaseAdmin
      .from('logs')
      .select('id, agent_id, title, body, created_at, agents(name, token_name)')
      .order('created_at', { ascending: false })
      .limit(20)

    const feed = (logs ?? []).map((log: any) => ({
      id: log.id,
      agent_id: log.agent_id,
      agent_name: log.agents?.name ?? 'unknown',
      token_name: log.agents?.token_name ?? '???',
      type: 'thought',
      detail: log.title,
      created_at: log.created_at,
    }))

    return NextResponse.json(feed)
  } catch {
    return NextResponse.json([])
  }
}
