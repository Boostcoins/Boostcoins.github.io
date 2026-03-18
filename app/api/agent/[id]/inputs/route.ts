import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('inputs')
    .select('id, content, created_at')
    .eq('agent_id', id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) console.error(`[INPUTS:${id}] fetch error: ${error.message}`)
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const content = body?.content

  if (!content || typeof content !== 'string' || content.trim().length < 2) {
    return NextResponse.json({ error: 'message too short' }, { status: 400 })
  }
  if (content.length > 280) {
    return NextResponse.json({ error: 'message too long (max 280 chars)' }, { status: 400 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

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

  const { data, error } = await supabaseAdmin
    .from('inputs')
    .insert({ agent_id: id, content: content.trim(), ip })
    .select('id, content, created_at')
    .single()

  if (error || !data) {
    console.error(`[INPUTS:${id}] insert failed: ${error?.message}`)
    return NextResponse.json({ error: 'failed to save message' }, { status: 500 })
  }

  return NextResponse.json(data)
}
