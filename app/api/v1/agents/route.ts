import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data: agents, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, token_name, token_ca, status, mood, created_at, image_url, twitter, website')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: 'failed to fetch agents' }, { status: 500 })
  }

  return NextResponse.json({ agents }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  })
}
