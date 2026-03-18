import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data } = await supabaseAdmin
    .from('inputs')
    .select('id, content, created_at')
    .eq('agent_id', id)
    .order('created_at', { ascending: false })
    .limit(50)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { content } = await req.json()

  if (!content || content.trim().length < 2) {
    return NextResponse.json({ error: 'message too short' }, { status: 400 })
  }
  if (content.length > 280) {
    return NextResponse.json({ error: 'message too long (max 280 chars)' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown'

  // Rate limit: max 3 per hour per IP per agent
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('inputs')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', id)
    .eq('ip', ip)
    .gte('created_at', hourAgo)

  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'slow down — max 3 messages per hour' }, { status: 429 })
  }

  const { data } = await supabaseAdmin
    .from('inputs')
    .insert({ agent_id: id, content: content.trim(), ip })
    .select('id, content, created_at')
    .single()

  return NextResponse.json(data)
}
