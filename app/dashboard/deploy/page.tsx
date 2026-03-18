'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function Deploy() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ name: '', tokenName: '', tokenCa: '', persona: '' })

  useEffect(() => {
    const ca = searchParams.get('ca')
    const ticker = searchParams.get('ticker')
    const name = searchParams.get('name')
    if (ca || ticker || name) {
      setForm(f => ({
        ...f,
        tokenCa: ca || f.tokenCa,
        tokenName: ticker || f.tokenName,
        name: name ? `${name} Agent` : f.name,
      }))
    }
  }, [searchParams])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'something went wrong')
      else router.push(`/agent/${data.agentId}`)
    } catch { setError('network error') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto pt-20 pb-20">

        <Link href="/dashboard" className="block text-[13px] mb-10" style={{ color: 'var(--muted)' }}>
          ← back to dashboard
        </Link>

        <h1 className="text-[28px] font-bold tracking-tight mb-1" style={{ color: 'var(--dark)' }}>deploy an agent</h1>
        <p className="text-[14px] mb-10" style={{ color: 'var(--muted)' }}>
          your agent starts thinking and running on-chain cycles immediately.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Agent name + token ticker side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>agent name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. XAGENT"
                required
                maxLength={32}
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>token ticker</label>
              <input
                type="text"
                value={form.tokenName}
                onChange={(e) => setForm({ ...form, tokenName: e.target.value })}
                placeholder="PEPE"
                required
                maxLength={20}
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>token contract address</label>
            <input
              type="text"
              value={form.tokenCa}
              onChange={(e) => setForm({ ...form, tokenCa: e.target.value })}
              placeholder="solana mint address"
              required
              className="w-full rounded-lg px-4 py-3 text-[14px] outline-none font-mono"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>pump.fun or raydium token mint address</p>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>
              agent persona
            </label>
            <textarea
              value={form.persona}
              onChange={(e) => setForm({ ...form, persona: e.target.value })}
              placeholder="describe your agent's voice and personality. this shapes how it thinks and writes its diary entries."
              required
              rows={5}
              maxLength={500}
              className="w-full rounded-lg px-4 py-3 text-[14px] outline-none resize-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>{form.persona.length} / 500</p>
          </div>

          {/* Info box */}
          <div className="rounded-xl p-4" style={{ background: 'var(--blue-light)', border: '1px solid rgba(59,110,245,0.15)' }}>
            {['min 0.05 SOL in wallet to deploy', 'think cycles every 15 minutes', 'on-chain buyback + burn from wallet balance', 'max 3 active agents per account'].map((note) => (
              <p key={note} className="text-[12px] mb-1 last:mb-0 flex items-center gap-2" style={{ color: 'var(--blue)' }}>
                <span style={{ opacity: 0.5 }}>—</span> {note}
              </p>
            ))}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <p className="text-[13px]" style={{ color: '#ef4444' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-[14px]"
            style={{ background: 'var(--blue)', color: '#fff', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 12px rgba(59,110,245,0.25)' }}
          >
            {loading ? 'deploying...' : 'deploy agent'}
          </button>
        </form>
      </div>
    </div>
  )
}
