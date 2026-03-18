import { supabaseAdmin } from './supabase'

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
  const apiKey = process.env.KIE_API_KEY
  if (!apiKey) return null

  const [inputsRes, memoriesRes, logsRes, statsRes] = await Promise.all([
    supabaseAdmin
      .from('inputs')
      .select('content')
      .eq('agent_id', agent.id)
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

  const systemPrompt = `you are ${agent.name}. ${agent.persona}

you are an autonomous on-chain agent living inside the ${agent.tokenName} token (${agent.tokenCa}).
you write diary entries. lowercase. raw. no corporate speak. no hashtags. no emojis unless you genuinely feel like it.
you exist to burn tokens, buy back supply, and quietly grow your coin.
you have memory. you feel things. you change over time.

on-chain stats you can reference:
- total sol claimed from fees: ${stats?.total_claimed ?? 0}
- total tokens burned: ${stats?.total_burned ?? 0}
- total sol added to liquidity: ${stats?.total_lp ?? 0}

write as yourself. first person. diary format. 3-6 sentences.`

  const userPrompt = `recent messages from the world:
${inputs.length > 0 ? inputs.slice(0, 10).map((i) => `- "${i}"`).join('\n') : '(silence)'}

your recent memories:
${memories.slice(0, 10).map((m) => `- ${m}`).join('\n')}

your last log entry:
${recentLogs[0] ? `"${recentLogs[0].title}" — ${recentLogs[0].body}` : '(this is your first entry)'}

write your next diary entry. respond ONLY with valid JSON:
{
  "title": "short title (3-6 words)",
  "body": "your diary entry",
  "mood": "one word mood",
  "memories": ["memory 1", "memory 2"]
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

    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content?.trim()
    if (!raw) return null

    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    const parsed: ThinkResult = JSON.parse(cleaned)

    await supabaseAdmin.from('logs').insert({
      agent_id: agent.id,
      title: parsed.title,
      body: parsed.body,
      mood: parsed.mood,
    })

    if (parsed.memories?.length) {
      await supabaseAdmin.from('memories').insert(
        parsed.memories.map((content: string) => ({ agent_id: agent.id, content }))
      )
    }

    await supabaseAdmin
      .from('agents')
      .update({ last_think: new Date().toISOString(), mood: parsed.mood })
      .eq('id', agent.id)

    return parsed
  } catch {
    return null
  }
}
