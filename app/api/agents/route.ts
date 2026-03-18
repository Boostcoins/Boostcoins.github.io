import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('agents')
    .select('id, name, token_name, token_ca, mood, status, last_think, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}
