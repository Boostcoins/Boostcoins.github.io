import crypto from 'crypto'
import { supabaseAdmin } from './supabase'

interface WebhookPayload {
  event: string
  agent_id: string
  data: Record<string, unknown>
  timestamp: string
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

export async function fireWebhooks(agentId: string, event: string, data: Record<string, unknown>) {
  const { data: hooks } = await supabaseAdmin
    .from('webhooks')
    .select('id, url, secret, events')
    .eq('active', true)
    .or(`agent_id.eq.${agentId},agent_id.is.null`)

  if (!hooks || hooks.length === 0) return

  const payload: WebhookPayload = {
    event,
    agent_id: agentId,
    data,
    timestamp: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)

  for (const hook of hooks) {
    if (!hook.events?.includes(event)) continue

    const signature = signPayload(body, hook.secret)

    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Pilot-Signature': signature,
          'X-Pilot-Event': event,
        },
        body,
        signal: AbortSignal.timeout(10000),
      })

      if (res.ok) {
        await supabaseAdmin
          .from('webhooks')
          .update({ last_fired: new Date().toISOString(), fail_count: 0 })
          .eq('id', hook.id)
      } else {
        await incrementFailCount(hook.id)
      }
    } catch {
      await incrementFailCount(hook.id)
    }
  }
}

async function incrementFailCount(hookId: string) {
  const { data } = await supabaseAdmin
    .from('webhooks')
    .select('fail_count')
    .eq('id', hookId)
    .single()

  const newCount = (data?.fail_count ?? 0) + 1
  await supabaseAdmin
    .from('webhooks')
    .update({
      fail_count: newCount,
      active: newCount < 10,
    })
    .eq('id', hookId)
}
