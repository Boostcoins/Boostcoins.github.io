import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('authorization'))
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: hooks } = await supabaseAdmin
    .from('webhooks')
    .select('id, url, events, agent_id, active, created_at, last_fired, fail_count')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ webhooks: hooks ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('authorization'))
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { url, events, agent_id } = await req.json()

  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  const { count } = await supabaseAdmin
    .from('webhooks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.userId)
    .eq('active', true)

  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'maximum 10 active webhooks per account' }, { status: 403 })
  }

  const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`
  const validEvents = ['cycle', 'think', 'burn', 'deploy']
  const selectedEvents = (events || validEvents).filter((e: string) => validEvents.includes(e))

  const { data: hook, error } = await supabaseAdmin
    .from('webhooks')
    .insert({
      user_id: auth.userId,
      url,
      secret,
      events: selectedEvents,
      agent_id: agent_id || null,
    })
    .select('id')
    .single()

  if (error || !hook) {
    return NextResponse.json({ error: 'failed to create webhook' }, { status: 500 })
  }

  return NextResponse.json({
    id: hook.id,
    secret,
    url,
    events: selectedEvents,
    message: 'save the secret — it will not be shown again. use it to verify webhook signatures.',
  })
}

export async function DELETE(req: NextRequest) {
  const auth = await validateApiKey(req.headers.get('authorization'))
  if (!auth) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'webhook id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId)

  if (error) {
    return NextResponse.json({ error: 'failed to delete webhook' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
