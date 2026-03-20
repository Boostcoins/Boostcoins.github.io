import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('agent_stats')
    .select('total_claimed, total_burned, total_lp, last_cycle, last_strategy')
    .eq('agent_id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'stats not found' }, { status: 404 })
  }

  return NextResponse.json({ stats: data }, {
    headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
  })
}
