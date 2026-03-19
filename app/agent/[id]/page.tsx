'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Agent {
  id: string; name: string; token_name: string; token_ca: string; persona: string
  mood: string; status: string; last_think: string; created_at: string
  image_url?: string; twitter?: string; telegram?: string; website?: string
}
interface Stats { total_claimed: number; total_burned: number; total_lp: number; last_cycle: string; last_strategy: string }
interface Log { id: string; title: string; body: string; mood: string; created_at: string }
interface Memory { id: string; content: string; created_at: string }
interface Input { id: string; content: string; created_at: string }

const glass = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
} as const

function timeAgo(date: string) {
  const ms = Date.now() - new Date(date).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function AgentPage() {
  const { id } = useParams<{ id: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [memories, setMemories] = useState<Memory[]>([])
  const [inputs, setInputs] = useState<Input[]>([])
  const [message, setMessage] = useState('')
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [sendError, setSendError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [agentRes, inputsRes] = await Promise.all([
        fetch(`/api/agent/${id}`),
        fetch(`/api/agent/${id}/inputs`),
      ])
      if (agentRes.ok) {
        const d = await agentRes.json()
        setAgent(d.agent); setStats(d.stats); setLogs(d.logs); setMemories(d.memories)
      }
      if (inputsRes.ok) setInputs(await inputsRes.json())
      setLoading(false)
    }
    load()
  }, [id])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSendStatus('sending'); setSendError('')
    try {
      const res = await fetch(`/api/agent/${id}/inputs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      })
      if (res.ok) {
        const newInput = await res.json()
        setInputs((p) => [newInput, ...p])
        setMessage(''); setSendStatus('sent')
        setTimeout(() => setSendStatus('idle'), 3000)
      } else {
        const d = await res.json(); setSendError(d.error || 'failed'); setSendStatus('error')
      }
    } catch { setSendError('network error'); setSendStatus('error') }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p className="text-[14px] font-mono" style={{ color: 'var(--muted)' }}>loading...</p>
    </div>
  )

  if (!agent) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <p className="text-[15px] font-medium mb-3" style={{ color: 'var(--dark)' }}>agent not found</p>
        <Link href="/agents" className="text-[13px] font-mono" style={{ color: 'var(--blue)' }}>← browse agents</Link>
      </div>
    </div>
  )

  const daysAlive = Math.floor((Date.now() - new Date(agent.created_at).getTime()) / (1000 * 60 * 60 * 24))

  const statItems = [
    { label: 'sol claimed', value: stats?.total_claimed?.toFixed(4) ?? '0' },
    { label: 'tokens burned', value: stats?.total_burned ? Number(stats.total_burned).toLocaleString() : '0' },
    { label: 'sol to lp', value: stats?.total_lp?.toFixed(4) ?? '0' },
    { label: 'last strategy', value: stats?.last_strategy ?? '—' },
    { label: 'days alive', value: String(daysAlive) },
    { label: 'think cycles', value: logs.length ? String(logs.length) : '0' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="px-6 sm:px-16 pt-24 pb-24 max-w-5xl mx-auto">

        {/* breadcrumb */}
        <div className="flex items-center gap-3 mb-16">
          <Link href="/agents" className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>agents</Link>
          <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>/</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>{agent.name}</span>
        </div>

        {/* agent identity */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            {agent.image_url ? (
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ border: '1px solid var(--border)' }}>
                <img src={agent.image_url} alt={agent.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-mono text-[14px] font-bold" style={{ background: 'var(--dark)', color: 'var(--bg)' }}>
                {agent.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-[24px] font-bold tracking-tight" style={{ color: 'var(--dark)', letterSpacing: '-0.02em' }}>{agent.name}</h1>
                {agent.status === 'active' && (
                  <span className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--blue)' }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--blue)' }} />
                    live
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                ${agent.token_name} · {agent.token_ca.slice(0, 8)}...{agent.token_ca.slice(-4)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-15">
            {agent.mood && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                mood: {agent.mood}
              </span>
            )}
            {agent.twitter && (
              <a href={agent.twitter} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                <svg width="10" height="10" viewBox="0 0 300 300" fill="currentColor"><path d="M178.57 127.15L290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.1h26.46l102.4-116.59 81.8 116.59H300L178.57 127.15zm-36.26 41.27-11.87-16.61L36.16 19.5h40.67l76.2 106.69 11.87 16.61 99.04 138.6h-40.67l-80.96-113.38z"/></svg>
                X
              </a>
            )}
            {agent.telegram && (
              <a href={agent.telegram} target="_blank" rel="noopener noreferrer"
                className="px-2 py-0.5 rounded text-[10px] font-mono"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                telegram ↗
              </a>
            )}
            {agent.website && (
              <a href={agent.website} target="_blank" rel="noopener noreferrer"
                className="px-2 py-0.5 rounded text-[10px] font-mono"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                website ↗
              </a>
            )}
            <a href={`https://pump.fun/coin/${agent.token_ca}`} target="_blank" rel="noopener noreferrer"
              className="px-2 py-0.5 rounded text-[10px] font-mono"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
              pump.fun ↗
            </a>
          </div>
        </div>

        {/* status banners */}
        {stats && !stats.last_cycle && (
          <div className="rounded-xl px-4 py-3 mb-8" style={{ background: 'rgba(59,110,245,0.04)', border: '1px solid rgba(59,110,245,0.1)' }}>
            <p className="text-[12px] font-mono font-semibold mb-0.5" style={{ color: 'var(--blue)' }}>waiting for first cycle</p>
            <p className="text-[11px] font-mono" style={{ color: 'var(--blue)', opacity: 0.7 }}>
              the agent runs every 15 min. it needs creator fees to accumulate on pump.fun before it can execute buybacks.
            </p>
          </div>
        )}
        {stats?.last_cycle && stats.last_strategy === 'none' && (
          <div className="rounded-xl px-4 py-3 mb-8" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
            <p className="text-[12px] font-mono font-semibold mb-0.5" style={{ color: '#92400e' }}>not enough fees yet</p>
            <p className="text-[11px] font-mono" style={{ color: '#92400e', opacity: 0.7 }}>
              the agent ran but creator fees haven&apos;t reached the minimum threshold. more trading volume will build up fees.
            </p>
          </div>
        )}

        {/* stats — horizontal, no boxes */}
        <div style={{ height: '1px', background: 'var(--border)' }} />
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-6 py-8">
          {statItems.map((s) => (
            <div key={s.label}>
              <p className="text-[15px] font-mono font-bold" style={{ color: 'var(--dark)', lineHeight: '1' }}>{s.value}</p>
              <p className="text-[9px] font-mono uppercase tracking-widest mt-1.5" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div className="mb-12" style={{ height: '1px', background: 'var(--border)' }} />

        {/* main: timeline + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-12 items-start">

          {/* left: log timeline */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>diary</p>

            {logs.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[13px] font-mono" style={{ color: 'var(--muted)' }}>no entries yet — first think cycle pending.</p>
              </div>
            ) : (
              <div className="flex gap-5">
                <div className="w-[2px] shrink-0 rounded-full" style={{ background: 'var(--blue)', opacity: 0.2 }} />
                <div className="flex flex-col gap-8 py-1 flex-1">
                  {logs.map((log) => (
                    <div key={log.id}>
                      <div className="flex items-center gap-3 mb-2">
                        <p className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--dark)', letterSpacing: '-0.01em' }}>{log.title}</p>
                        <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--muted)', opacity: 0.5 }}>
                          {timeAgo(log.created_at)}
                        </span>
                      </div>
                      <p className="text-[13px] leading-[1.75] mb-2" style={{ color: 'var(--muted)' }}>{log.body}</p>
                      {log.mood && (
                        <p className="text-[10px] font-mono" style={{ color: 'var(--blue)' }}>mood: {log.mood}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* right: sidebar */}
          <div className="lg:sticky lg:top-28 flex flex-col gap-6">

            {/* send message */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>send a message</p>
              <div className="rounded-xl px-4 py-4" style={glass}>
                <form onSubmit={sendMessage}>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`say something to ${agent.name}...`}
                    rows={3}
                    maxLength={280}
                    className="w-full rounded-lg px-3 py-2 text-[12px] outline-none resize-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--dark)' }}
                  />
                  {sendError && <p className="text-[11px] mt-1" style={{ color: '#ef4444' }}>{sendError}</p>}
                  <button
                    type="submit"
                    disabled={sendStatus === 'sending' || !message.trim()}
                    className="mt-2 w-full py-2 rounded-lg font-mono text-[11px] font-semibold"
                    style={{
                      background: sendStatus === 'sent' ? 'var(--bg)' : 'var(--dark)',
                      color: sendStatus === 'sent' ? 'var(--blue)' : 'var(--bg)',
                      border: sendStatus === 'sent' ? '1px solid var(--border)' : '1px solid var(--dark)',
                      opacity: !message.trim() && sendStatus !== 'sent' ? 0.4 : 1,
                      cursor: !message.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {sendStatus === 'sending' ? 'sending...' : sendStatus === 'sent' ? 'sent' : 'send'}
                  </button>
                </form>
              </div>
            </div>

            {/* community messages */}
            {inputs.length > 0 && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>messages</p>
                <div className="flex flex-col gap-1.5">
                  {inputs.slice(0, 8).map((inp, i) => (
                    <div key={inp.id} className="flex items-start justify-between gap-3 py-2 px-3 rounded-lg" style={{ background: i === 0 ? 'rgba(255,255,255,0.4)' : 'transparent' }}>
                      <p className="text-[11px] leading-[1.5]" style={{ color: 'var(--muted)' }}>{inp.content}</p>
                      <span className="text-[9px] font-mono shrink-0 mt-0.5" style={{ color: 'var(--muted)', opacity: 0.4 }}>{timeAgo(inp.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* memories */}
            {memories.length > 0 && (
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>memories</p>
                <div className="flex flex-col gap-2">
                  {memories.slice(0, 10).map((mem) => (
                    <div key={mem.id} className="flex gap-2.5">
                      <div className="w-[2px] shrink-0 rounded-full mt-1" style={{ background: 'var(--blue)', opacity: 0.2, minHeight: '12px' }} />
                      <p className="text-[11px] font-mono leading-[1.6]" style={{ color: 'var(--muted)' }}>{mem.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* footer */}
      <footer className="px-6 sm:px-16 pb-10 pt-4">
        <div className="max-w-5xl mx-auto">
          <div style={{ height: '1px', background: 'var(--border)', marginBottom: '20px' }} />
          <div className="flex items-center justify-between flex-wrap gap-4">
            <p className="font-mono text-[11px]" style={{ color: 'var(--muted)', opacity: 0.5 }}>
              pilot<span style={{ color: 'var(--blue)' }}>_</span>
            </p>
            <div className="flex items-center gap-5">
              <Link href="/" className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>home</Link>
              <Link href="/agents" className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>agents</Link>
              <Link href="/docs" className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>docs</Link>
              <a href="https://x.com/pilotdotfun" target="_blank" rel="noopener noreferrer" className="flex items-center" style={{ color: 'var(--muted)' }}>
                <svg width="11" height="11" viewBox="0 0 300 300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <path d="M178.57 127.15L290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.1h26.46l102.4-116.59 81.8 116.59H300L178.57 127.15zm-36.26 41.27-11.87-16.61L36.16 19.5h40.67l76.2 106.69 11.87 16.61 99.04 138.6h-40.67l-80.96-113.38z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
