import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runThinkCycle } from '@/lib/agent'
import { runOnChainCycle } from '@/lib/solana'

// Vercel calls this with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const started = Date.now()

  // Fetch all active agents
  const { data: agents, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, token_name, token_ca, persona, user_id')
    .eq('status', 'active')

  if (error || !agents) {
    return NextResponse.json({ error: 'failed to fetch agents' }, { status: 500 })
  }

  if (agents.length === 0) {
    return NextResponse.json({ ok: true, ran: 0, message: 'no active agents' })
  }

  // Fetch wallets for all relevant users in one query
  const userIds = [...new Set(agents.map((a) => a.user_id))]
  const { data: wallets } = await supabaseAdmin
    .from('wallets')
    .select('user_id, encrypted_private_key')
    .in('user_id', userIds)

  const walletMap = Object.fromEntries((wallets ?? []).map((w) => [w.user_id, w.encrypted_private_key]))

  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      const encryptedKey = walletMap[agent.user_id]
      if (!encryptedKey) return { id: agent.id, error: 'no wallet' }

      const thinkResult = await runThinkCycle({
        id: agent.id,
        name: agent.name,
        persona: agent.persona,
        tokenName: agent.token_name,
        tokenCa: agent.token_ca,
      }).catch(() => null)

      // Run on-chain cycle — pass mood from think result so strategy is mood-aware
      const chainResult = await runOnChainCycle(
        agent.id,
        encryptedKey,
        agent.token_ca,
        thinkResult?.mood ?? undefined
      ).catch((e: Error) => ({ success: false, message: e.message }))

      return {
        id: agent.id,
        name: agent.name,
        think: thinkResult ? 'ok' : 'failed',
        chain: chainResult,
      }
    })
  )

  const summary = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { error: r.reason?.message }
  )

  return NextResponse.json({
    ok: true,
    ran: agents.length,
    elapsed: `${Date.now() - started}ms`,
    results: summary,
  })
}
