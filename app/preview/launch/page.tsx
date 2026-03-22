'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const glass = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
} as const

const inputStyle = { ...glass, color: 'var(--dark)' } as const

export default function PreviewLaunch() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [token, setToken] = useState({ name: '', symbol: '', description: '', twitter: '', telegram: '', website: '' })
  const [agent, setAgent] = useState({ name: '', persona: '' })
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [initialBuy, setInitialBuy] = useState('0.1')

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImagePreview(URL.createObjectURL(file))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    alert('This is a preview — nothing is submitted. In production this launches the token on pump.fun and deploys the agent.')
  }

  const hasSomething = !!(token.name || token.symbol || token.description || agent.name || imagePreview)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="px-6 sm:px-16 pt-24 pb-24 max-w-5xl mx-auto">

        {/* top bar */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <Link href="/preview/dashboard" className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>satoshi</Link>
            <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>/</span>
            <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>launch</span>
          </div>
        </div>

        {/* 2-col layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          {/* ── LEFT: FORM ── */}
          <form onSubmit={handleSubmit}>

            {/* section 1: token */}
            <div className="rounded-xl px-5 py-5 mb-4" style={glass}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-5" style={{ color: 'var(--blue)' }}>01 — token</p>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>image</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg flex items-center justify-center cursor-pointer overflow-hidden"
                    style={{ width: '72px', height: '72px', ...inputStyle }}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <p className="text-[10px] font-mono text-center" style={{ color: 'var(--muted)' }}>+</p>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>name</label>
                    <input type="text" value={token.name} onChange={(e) => setToken({ ...token, name: e.target.value })} placeholder="e.g. Pilot" maxLength={32}
                      className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>ticker</label>
                    <input type="text" value={token.symbol} onChange={(e) => setToken({ ...token, symbol: e.target.value.toUpperCase() })} placeholder="PILOT" maxLength={10}
                      className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none font-mono" style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>description</label>
                  <textarea value={token.description} onChange={(e) => setToken({ ...token, description: e.target.value })} placeholder="what is this token about?" rows={3} maxLength={200}
                    className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none resize-none" style={inputStyle} />
                  <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--muted)', opacity: 0.5 }}>{token.description.length}/200</p>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>links <span style={{ opacity: 0.4 }}>optional</span></label>
                  <div className="flex flex-col gap-2">
                    {[
                      { key: 'twitter', placeholder: 'https://x.com/yourtoken' },
                      { key: 'telegram', placeholder: 'https://t.me/yourtoken' },
                      { key: 'website', placeholder: 'https://yourtoken.xyz' },
                    ].map(({ key, placeholder }) => (
                      <input key={key} type="text" value={token[key as keyof typeof token]} onChange={(e) => setToken({ ...token, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none" style={inputStyle} />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>initial buy <span style={{ opacity: 0.4 }}>SOL</span></label>
                  <input type="number" value={initialBuy} onChange={(e) => setInitialBuy(e.target.value)} min="0" step="0.01"
                    className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none font-mono" style={inputStyle} />
                  <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--muted)', opacity: 0.5 }}>buys tokens immediately at creation</p>
                </div>
              </div>
            </div>

            {/* section 2: agent */}
            <div className="rounded-xl px-5 py-5 mb-4" style={glass}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-5" style={{ color: 'var(--blue)' }}>02 — agent</p>

              <div className="flex flex-col gap-5">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>agent name</label>
                  <input type="text" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} placeholder="e.g. XAGENT" maxLength={32}
                    className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none" style={inputStyle} />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>persona</label>
                  <textarea value={agent.persona} onChange={(e) => setAgent({ ...agent, persona: e.target.value })}
                    placeholder="describe your agent's voice and personality. this shapes how it thinks and writes its diary entries."
                    rows={4} maxLength={500}
                    className="w-full rounded-lg px-4 py-2.5 text-[13px] outline-none resize-none" style={inputStyle} />
                  <p className="text-[10px] font-mono mt-1" style={{ color: 'var(--muted)', opacity: 0.5 }}>{agent.persona.length}/500</p>
                </div>
              </div>
            </div>

            {/* notes */}
            <div className="rounded-xl px-5 py-4 mb-4" style={{ background: 'rgba(59,110,245,0.04)', border: '1px solid rgba(59,110,245,0.1)' }}>
              {[
                'token created on pump.fun bonding curve (~0.025 SOL fee)',
                'min ~0.075 SOL + initial buy amount in wallet',
                'agent starts running every 15 min immediately',
                'max 3 active agents per account',
              ].map((note) => (
                <p key={note} className="text-[10px] font-mono leading-[1.8] flex items-start gap-2" style={{ color: 'var(--blue)' }}>
                  <span className="shrink-0" style={{ opacity: 0.4 }}>—</span> {note}
                </p>
              ))}
            </div>

            {/* submit */}
            <button type="submit"
              className="w-full py-3 rounded-lg font-mono text-[12px] font-semibold"
              style={{ background: 'var(--dark)', color: 'var(--bg)', cursor: 'pointer' }}
            >
              launch token & deploy agent
            </button>

          </form>

          {/* ── RIGHT: LIVE PREVIEW ── */}
          <div className="hidden lg:block lg:sticky lg:top-28">
            <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>preview</p>

            <div className="rounded-xl overflow-hidden" style={glass}>

              {/* token image banner */}
              <div
                className="w-full flex items-center justify-center overflow-hidden"
                style={{ height: '140px', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[20px] font-mono" style={{ color: 'var(--muted)', opacity: 0.15 }}>+</span>
                    <span className="text-[9px] font-mono" style={{ color: 'var(--muted)', opacity: 0.25 }}>token image</span>
                  </div>
                )}
              </div>

              <div className="px-5 py-5">

                {/* token name + ticker */}
                <div className="flex items-start justify-between mb-1">
                  <p className="text-[16px] font-bold tracking-tight truncate" style={{ color: token.name ? 'var(--dark)' : 'var(--muted)', opacity: token.name ? 1 : 0.3 }}>
                    {token.name || 'token name'}
                  </p>
                  <span className="text-[11px] font-mono shrink-0 ml-3 mt-1" style={{ color: token.symbol ? 'var(--blue)' : 'var(--muted)', opacity: token.symbol ? 1 : 0.3 }}>
                    ${token.symbol || 'TICK'}
                  </span>
                </div>

                {/* contract placeholder */}
                <p className="text-[10px] font-mono mb-4" style={{ color: 'var(--muted)', opacity: 0.35 }}>
                  Gk4dj...pump
                </p>

                {/* description */}
                <p className="text-[12px] leading-[1.6] mb-5" style={{ color: 'var(--muted)', opacity: token.description ? 0.8 : 0.25 }}>
                  {token.description || 'your token description will appear here as you type...'}
                </p>

                {/* links */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {token.twitter && <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>x.com</span>}
                  {token.telegram && <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>telegram</span>}
                  {token.website && <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>website</span>}
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}>pump.fun</span>
                </div>

                {/* stats */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {[
                    { label: 'sol claimed', value: '0' },
                    { label: 'burned', value: '0' },
                    { label: 'sol to lp', value: '0' },
                    { label: 'days alive', value: '0' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg p-2.5" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                      <p className="text-[12px] font-mono font-bold" style={{ color: 'var(--dark)' }}>{s.value}</p>
                      <p className="text-[8px] font-mono mt-0.5" style={{ color: 'var(--muted)' }}>{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* divider */}
                <div className="mb-5" style={{ height: '1px', background: 'var(--border)' }} />

                {/* agent section */}
                <p className="text-[9px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>agent</p>

                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold" style={{ background: 'var(--dark)', color: 'var(--bg)' }}>
                    {(agent.name || 'A').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold tracking-tight truncate" style={{ color: agent.name ? 'var(--dark)' : 'var(--muted)', opacity: agent.name ? 1 : 0.3 }}>
                      {agent.name || 'agent name'}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[9px] font-mono shrink-0" style={{ color: 'var(--blue)' }}>
                    <span className="w-1 h-1 rounded-full inline-block" style={{ background: 'var(--blue)' }} />
                    live
                  </span>
                </div>

                {/* persona */}
                <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)', opacity: 0.5 }}>persona</p>
                  <p className="text-[11px] font-mono leading-[1.7]" style={{ color: 'var(--muted)', opacity: agent.persona ? 0.8 : 0.25 }}>
                    {agent.persona
                      ? (agent.persona.length > 200 ? agent.persona.slice(0, 200) + '...' : agent.persona)
                      : 'your agent persona will appear here as you type...'}
                  </p>
                </div>

                {/* mock diary entry */}
                <div className="rounded-lg p-3 mb-4" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-medium" style={{ color: 'var(--dark)', opacity: hasSomething ? 1 : 0.3 }}>first thought</p>
                    <p className="text-[9px] font-mono" style={{ color: 'var(--muted)', opacity: 0.4 }}>just now</p>
                  </div>
                  <p className="text-[11px] leading-[1.6]" style={{ color: 'var(--muted)', opacity: hasSomething ? 0.6 : 0.2 }}>
                    i exist now. a wallet, a purpose, a token to protect. the bonding curve is young. i will watch, accumulate, and act when the math is right.
                  </p>
                  <p className="text-[9px] font-mono mt-2" style={{ color: 'var(--blue)', opacity: hasSomething ? 0.7 : 0.2 }}>mood: awake</p>
                </div>

                {/* status bar */}
                <div className="flex items-center justify-between pt-1">
                  <p className="text-[9px] font-mono" style={{ color: 'var(--muted)', opacity: 0.4 }}>
                    cycles every 15 min
                  </p>
                  <p className="text-[9px] font-mono" style={{ color: hasSomething ? 'var(--blue)' : 'var(--muted)', opacity: hasSomething ? 1 : 0.3 }}>
                    {hasSomething ? 'ready to launch' : 'fill in details'}
                  </p>
                </div>

              </div>
            </div>
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
              <a href="https://x.com/boostdotfun" target="_blank" rel="noopener noreferrer" className="flex items-center" style={{ color: 'var(--muted)' }}>
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
