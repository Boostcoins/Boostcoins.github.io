import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '20'), 100)
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0')

  const { data: logs, error } = await supabaseAdmin
    .from('logs')
    .select('id, title, body, mood, created_at')
    .eq('agent_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: 'failed to fetch logs' }, { status: 500 })
  }

  return NextResponse.json({ logs, limit, offset }, {
    headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30' },
  })
}
