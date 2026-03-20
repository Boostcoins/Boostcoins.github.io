import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateApiKey } from '@/lib/api-auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: keys } = await supabaseAdmin
    .from('api_keys')
    .select('id, key_prefix, name, created_at, last_used, revoked')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ keys: keys ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { name } = await req.json().catch(() => ({ name: 'default' }))

  const { count } = await supabaseAdmin
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.userId)
    .eq('revoked', false)

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: 'maximum 5 active API keys per account' }, { status: 403 })
  }

  const { key, hash, prefix } = generateApiKey()

  const { error } = await supabaseAdmin.from('api_keys').insert({
    user_id: session.userId,
    key_hash: hash,
    key_prefix: prefix,
    name: name || 'default',
  })

  if (error) {
    return NextResponse.json({ error: 'failed to create API key' }, { status: 500 })
  }

  return NextResponse.json({
    key,
    prefix,
    name,
    message: 'save this key — it will not be shown again.',
  })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'key id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('api_keys')
    .update({ revoked: true })
    .eq('id', id)
    .eq('user_id', session.userId)

  if (error) {
    return NextResponse.json({ error: 'failed to revoke key' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
