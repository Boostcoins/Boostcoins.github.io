import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, username, created_at')
    .eq('id', session.userId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json(user)
}
