import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { runThinkCycle } from '@/lib/agent'
import { runOnChainCycle } from '@/lib/solana'

// Vercel calls this with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const tag = '[CRON]'
  const auth = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(`${tag} unauthorized cron attempt`)
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  console.log(`${tag} cron triggered at ${new Date().toISOString()}`)

  // Fetch all active agents — each agent carries its own wallet
  const { data: agents, error } = await supabaseAdmin
    .from('agents')
    .select('id, name, token_name, token_ca, persona, user_id, wallet_public_key, wallet_encrypted_pk')
    .eq('status', 'active')

  if (error) {
    console.error(`${tag} failed to fetch agents: ${error.message}`)
    return NextResponse.json({ error: 'failed to fetch agents' }, { status: 500 })
  }

  if (!agents || agents.length === 0) {
    console.log(`${tag} no active agents found`)
    return NextResponse.json({ ok: true, ran: 0, message: 'no active agents' })
  }

  console.log(`${tag} found ${agents.length} active agent(s)`)

  // Fallback: fetch user wallets for agents that don't yet have their own wallet
  const agentsWithoutWallet = agents.filter((a) => !a.wallet_encrypted_pk)
  let userWalletMap: Record<string, string> = {}

  if (agentsWithoutWallet.length > 0) {
    const userIds = [...new Set(agentsWithoutWallet.map((a) => a.user_id))]
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('user_id, encrypted_private_key')
      .in('user_id', userIds)
    userWalletMap = Object.fromEntries((wallets ?? []).map((w) => [w.user_id, w.encrypted_private_key]))
  }

  const results = await Promise.allSettled(
    agents.map(async (agent) => {
      const agentTag = `[CRON:${agent.id}]`

      // Each agent uses its own dedicated wallet — never shared with other agents
      const encryptedKey = agent.wallet_encrypted_pk || userWalletMap[agent.user_id]

      if (!encryptedKey) {
        console.error(`${agentTag} no wallet found for agent ${agent.name}`)
        return { id: agent.id, name: agent.name, think: 'skipped', chain: { success: false, message: 'no wallet' } }
      }

      if (!agent.token_ca || agent.token_ca.trim().length < 32) {
        console.error(`${agentTag} invalid or missing token_ca — skipping "${agent.name}"`)
        return { id: agent.id, name: agent.name, think: 'skipped', chain: { success: false, message: 'invalid token_ca' } }
      }

      const walletLabel = agent.wallet_public_key || '(legacy user wallet)'
      console.log(`${agentTag} running cycle for "${agent.name}" ($${agent.token_name} — ${agent.token_ca}) — wallet: ${walletLabel}`)

      const thinkResult = await runThinkCycle({
        id: agent.id,
        name: agent.name,
        persona: agent.persona,
        tokenName: agent.token_name,
        tokenCa: agent.token_ca,
      }).catch((err) => {
        console.error(`${agentTag} think cycle threw: ${err instanceof Error ? err.message : err}`)
        return null
      })

      const chainResult = await runOnChainCycle(
        agent.id,
        encryptedKey,
        agent.token_ca,
        thinkResult?.mood ?? undefined
      ).catch((err: Error) => {
        console.error(`${agentTag} chain cycle threw: ${err.message}`)
        return { success: false, message: err.message }
      })

      console.log(`${agentTag} done — think: ${thinkResult ? 'ok' : 'failed'} | chain: ${chainResult.success ? 'ok' : `failed (${chainResult.message})`}`)

      return {
        id: agent.id,
        name: agent.name,
        think: thinkResult ? 'ok' : 'failed',
        chain: chainResult,
      }
    })
  )

  const summary = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { error: r.reason?.message ?? 'unknown' }
  )

  const elapsed = Date.now() - started
  console.log(`${tag} cron complete — ${agents.length} agents | ${elapsed}ms`)

  return NextResponse.json({
    ok: true,
    ran: agents.length,
    elapsed: `${elapsed}ms`,
    results: summary,
  })
}
