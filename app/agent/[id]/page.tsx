'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Agent { id: string; name: string; token_name: string; token_ca: string; persona: string; mood: string; status: string; last_think: string; created_at: string }
interface Stats { total_claimed: number; total_burned: number; total_lp: number; last_cycle: string; last_strategy: string }
interface Log { id: string; title: string; body: string; mood: string; created_at: string }
interface Memory { id: string; content: string; created_at: string }
interface Input { id: string; content: string; created_at: string }

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
      <p className="text-[14px]" style={{ color: 'var(--muted)' }}>loading...</p>
    </div>
  )

  if (!agent) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <p className="text-[15px] font-medium mb-3" style={{ color: 'var(--dark)' }}>agent not found</p>
        <Link href="/agents" className="text-[13px]" style={{ color: 'var(--blue)' }}>← browse agents</Link>
      </div>
    </div>
  )

  const daysAlive = Math.floor((Date.now() - new Date(agent.created_at).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 h-14"
        style={{ background: 'rgba(247,249,255,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Link href="/" className="text-[13px] font-bold" style={{ color: 'var(--dark)' }}>pilot</Link>
        <Link href="/agents" className="text-[13px]" style={{ color: 'var(--muted)' }}>← all agents</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-24 pb-24">

        {/* Agent header */}
        <div className="flex items-start justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-bold tracking-tight" style={{ fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: 'var(--dark)' }}>
                {agent.name}
              </h1>
              {agent.status === 'active' && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                  style={{ color: 'var(--blue)', background: 'var(--blue-light)', border: '1px solid rgba(59,110,245,0.2)' }}>
                  <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'var(--blue)' }} />
                  live
                </span>
              )}
            </div>
            <p className="text-[14px] mb-1" style={{ color: 'var(--muted)' }}>${agent.token_name}</p>
            <p className="text-[12px] font-mono" style={{ color: 'var(--muted)' }}>{agent.token_ca}</p>
          </div>
          <div className="text-right">
            {agent.mood && (
              <span className="inline-block text-[12px] font-mono px-3 py-1.5 rounded-full mb-2" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
                mood: {agent.mood}
              </span>
            )}
            <p className="text-[12px]" style={{ color: 'var(--muted)' }}>{daysAlive} days alive</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {[
              { label: 'sol claimed', value: stats.total_claimed?.toFixed(4) ?? '0' },
              { label: 'tokens burned', value: stats.total_burned ? Number(stats.total_burned).toLocaleString() : '0' },
              { label: 'sol to lp', value: stats.total_lp?.toFixed(4) ?? '0' },
              { label: 'last strategy', value: stats.last_strategy ?? '—' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>{s.label}</p>
                <p className="text-[15px] font-bold" style={{ color: 'var(--dark)' }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Logs */}
          <div className="lg:col-span-2">
            <p className="text-[11px] font-mono uppercase tracking-widest mb-6" style={{ color: 'var(--muted)' }}>log entries</p>
            {logs.length === 0 ? (
              <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-[14px]" style={{ color: 'var(--muted)' }}>no entries yet — first think cycle pending.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {logs.map((log) => (
                  <div key={log.id} className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[14px] font-semibold" style={{ color: 'var(--dark)' }}>{log.title}</p>
                      <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                        {new Date(log.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-[14px] leading-relaxed" style={{ color: 'var(--muted)' }}>{log.body}</p>
                    {log.mood && (
                      <span className="inline-block mt-3 text-[11px] font-mono px-2.5 py-1 rounded-full" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
                        {log.mood}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Send message */}
            <div className="rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>send a message</p>
              <form onSubmit={sendMessage}>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`say something to ${agent.name}...`}
                  rows={3}
                  maxLength={280}
                  className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none resize-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--dark)' }}
                />
                {sendError && <p className="text-[12px] mt-1" style={{ color: '#ef4444' }}>{sendError}</p>}
                <button
                  type="submit"
                  disabled={sendStatus === 'sending' || !message.trim()}
                  className="mt-2 w-full py-2.5 rounded-xl font-medium text-[13px]"
                  style={{
                    background: sendStatus === 'sent' ? 'var(--blue-light)' : 'var(--blue)',
                    color: sendStatus === 'sent' ? 'var(--blue)' : '#fff',
                    opacity: !message.trim() ? 0.5 : 1,
                    cursor: !message.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {sendStatus === 'sending' ? 'sending...' : sendStatus === 'sent' ? 'sent' : 'send'}
                </button>
              </form>
            </div>

            {/* Recent inputs */}
            {inputs.length > 0 && (
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>messages</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {inputs.slice(0, 8).map((input) => (
                    <div key={input.id} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>{input.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Memories */}
            {memories.length > 0 && (
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>memories</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {memories.slice(0, 10).map((mem) => (
                    <div key={mem.id} className="px-3 py-2" style={{ borderLeft: '2px solid var(--blue-light)' }}>
                      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--muted)' }}>{mem.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
