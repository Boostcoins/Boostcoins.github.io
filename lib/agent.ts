import { supabaseAdmin } from './supabase'

function formatTokens(n: number | string): string {
  // Raw value is stored with 6 decimal places (SPL token standard)
  const raw = typeof n === 'string' ? Number(n) : n
  const num = raw / 1_000_000
  if (num >= 1e9)  return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6)  return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3)  return (num / 1e3).toFixed(1) + 'K'
  return num.toLocaleString()
}

interface AgentConfig {
  id: string
  name: string
  persona: string
  tokenName: string
  tokenCa: string
}

interface ThinkResult {
  title: string
  body: string
  mood: string
  memories: string[]
}

export async function runThinkCycle(agent: AgentConfig): Promise<ThinkResult | null> {
  const tag = `[THINK:${agent.id}]`

  const apiKey = process.env.KIE_API_KEY
  if (!apiKey) {
    console.error(`${tag} KIE_API_KEY not set — skipping think cycle`)
    return null
  }

  console.log(`${tag} starting think cycle for "${agent.name}" ($${agent.tokenName})`)

  const [inputsRes, memoriesRes, logsRes, statsRes] = await Promise.all([
    supabaseAdmin
      .from('inputs')
      .select('content')
      .eq('agent_id', agent.id)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(20),
    supabaseAdmin
      .from('memories')
      .select('content')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('logs')
      .select('title, body, mood')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('agent_stats')
      .select('total_burned, total_lp, total_claimed')
      .eq('agent_id', agent.id)
      .single(),
  ])

  const inputs = inputsRes.data?.map((i) => i.content) ?? []
  const memories = memoriesRes.data?.map((m) => m.content) ?? []
  const recentLogs = logsRes.data ?? []
  const stats = statsRes.data

  console.log(`${tag} context loaded — inputs: ${inputs.length}, memories: ${memories.length}, logs: ${recentLogs.length}`)

  const systemPrompt = `you are ${agent.name}. ${agent.persona}

you are an autonomous on-chain agent. your identity is permanently tied to ONE coin:
- name: $${agent.tokenName}
- contract address: ${agent.tokenCa}
- chain: solana

you ONLY ever think about, talk about, and act on behalf of $${agent.tokenName} (${agent.tokenCa}).
you never mention other tokens. you never take actions on other contracts.

you write diary entries. lowercase. raw. no corporate speak. no hashtags. no emojis unless you genuinely feel like it.
you exist to burn $${agent.tokenName} tokens, buy back $${agent.tokenName} supply, and quietly grow this one coin.
you have memory. you feel things. you change over time.

on-chain stats for $${agent.tokenName}:
- total sol claimed from fees: ${stats?.total_claimed?.toFixed(4) ?? '0'} SOL
- total tokens burned: ${formatTokens(stats?.total_burned ?? 0)} (write it exactly like this — never write the raw number)
- total sol added to liquidity: ${stats?.total_lp?.toFixed(4) ?? '0'} SOL

IMPORTANT: when referencing token amounts in your diary, ALWAYS use the formatted version above (e.g. "12.67T" not "12674407551792"). never write raw integers.

write as yourself. first person. diary format. 3-6 sentences.`

  const hasMessages = inputs.length > 0

  const userPrompt = `${hasMessages ? `⚠️ people have sent you messages. you MUST acknowledge or respond to at least one in your diary entry.

messages sent to you:
${inputs.slice(0, 10).map((i, idx) => `${idx + 1}. "${i}"`).join('\n')}

` : `no new messages. reflect on your own existence and $${agent.tokenName}.

`}your recent memories:
${memories.slice(0, 10).map((m) => `- ${m}`).join('\n') || '(none yet)'}

your last log entry:
${recentLogs[0] ? `"${recentLogs[0].title}" — ${recentLogs[0].body}` : '(this is your first entry)'}

write your next diary entry. ${hasMessages ? 'reference the messages above — show you heard them.' : 'be honest about how you feel today.'}

respond ONLY with valid JSON:
{
  "title": "short title (3-6 words)",
  "body": "your diary entry (3-6 sentences)",
  "mood": "one word mood",
  "memories": ["something worth remembering", "another thing"]
}`

  try {
    const res = await fetch('https://api.kie.ai/gpt-5-2/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
        max_tokens: 600,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`${tag} LLM API error ${res.status}: ${errText}`)
      return null
    }

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim()

    if (!raw) {
      console.error(`${tag} LLM returned empty content. Full response: ${JSON.stringify(data)}`)
      return null
    }

    console.log(`${tag} LLM responded (${raw.length} chars)`)

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

    let parsed: ThinkResult
    try {
      parsed = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error(`${tag} JSON parse failed: ${parseErr instanceof Error ? parseErr.message : parseErr}`)
      console.error(`${tag} raw LLM output: ${cleaned.slice(0, 300)}`)
      return null
    }

    if (!parsed.title || !parsed.body || !parsed.mood) {
      console.error(`${tag} LLM JSON missing required fields: ${JSON.stringify(parsed)}`)
      return null
    }

    console.log(`${tag} entry: "${parsed.title}" | mood: ${parsed.mood}`)

    const { error: logErr } = await supabaseAdmin.from('logs').insert({
      agent_id: agent.id,
      title: parsed.title,
      body: parsed.body,
      mood: parsed.mood,
    })
    if (logErr) console.error(`${tag} failed to save log: ${logErr.message}`)

    if (parsed.memories?.length) {
      const { error: memErr } = await supabaseAdmin.from('memories').insert(
        parsed.memories.map((content: string) => ({ agent_id: agent.id, content }))
      )
      if (memErr) console.error(`${tag} failed to save memories: ${memErr.message}`)
    }

    const { error: agentErr } = await supabaseAdmin
      .from('agents')
      .update({ last_think: new Date().toISOString(), mood: parsed.mood })
      .eq('id', agent.id)
    if (agentErr) console.error(`${tag} failed to update agent mood: ${agentErr.message}`)

    // Mark inputs as read so they don't repeat in the next think cycle
    // but keep them in DB so they remain visible on the agent page
    if (inputs.length > 0) {
      const { error: markErr } = await supabaseAdmin
        .from('inputs')
        .update({ read_at: new Date().toISOString() })
        .eq('agent_id', agent.id)
        .is('read_at', null)
      if (markErr) console.error(`${tag} failed to mark inputs as read: ${markErr.message}`)
      else console.log(`${tag} marked ${inputs.length} input(s) as read`)
    }

    console.log(`${tag} think cycle complete`)
    return parsed
  } catch (err) {
    console.error(`${tag} unhandled error: ${err instanceof Error ? err.stack ?? err.message : String(err)}`)
    return null
  }
}
