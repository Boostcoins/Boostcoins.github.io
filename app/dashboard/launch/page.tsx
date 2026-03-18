'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LaunchAndDeploy() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [token, setToken] = useState({ name: '', symbol: '', description: '', twitter: '', telegram: '', website: '' })
  const [agent, setAgent] = useState({ name: '', persona: '' })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [initialBuy, setInitialBuy] = useState('0.1')

  const [step, setStep] = useState<'form' | 'launching' | 'deploying' | 'done'>('form')
  const [statusMsg, setStatusMsg] = useState('')
  const [error, setError] = useState('')

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!image) { setError('upload a token image'); return }
    setError('')

    // Step 1 — launch token
    setStep('launching')
    setStatusMsg('uploading metadata to ipfs...')

    let mintAddress = ''
    try {
      const fd = new FormData()
      fd.append('name', token.name)
      fd.append('symbol', token.symbol)
      fd.append('description', token.description)
      fd.append('twitter', token.twitter)
      fd.append('telegram', token.telegram)
      fd.append('website', token.website)
      fd.append('image', image)
      fd.append('initialBuy', initialBuy)

      setStatusMsg('creating token on pump.fun...')
      const launchRes = await fetch('/api/launch', { method: 'POST', body: fd })
      const launchData = await launchRes.json()

      if (!launchRes.ok) {
        setError(launchData.error || 'token launch failed')
        setStep('form')
        return
      }

      mintAddress = launchData.mint
    } catch {
      setError('network error during launch')
      setStep('form')
      return
    }

    // Step 2 — deploy agent
    setStep('deploying')
    setStatusMsg('deploying your agent...')

    try {
      const deployRes = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agent.name,
          tokenName: token.symbol,
          tokenCa: mintAddress,
          persona: agent.persona,
        }),
      })
      const deployData = await deployRes.json()

      if (!deployRes.ok) {
        setError(deployData.error || 'agent deploy failed')
        setStep('form')
        return
      }

      router.push(`/agent/${deployData.agentId}`)
    } catch {
      setError('network error during deploy')
      setStep('form')
    }
  }

  if (step === 'launching' || step === 'deploying') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent mx-auto mb-5 animate-spin" style={{ borderColor: 'var(--blue)', borderTopColor: 'transparent' }} />
          <p className="text-[15px] font-medium mb-2" style={{ color: 'var(--dark)' }}>{statusMsg}</p>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: step === 'deploying' ? 'var(--blue)' : 'var(--muted)', opacity: step === 'deploying' ? 1 : 0.4 }} />
              <span className="text-[12px] font-mono" style={{ color: step === 'launching' ? 'var(--blue)' : 'var(--muted)' }}>01 launch token</span>
            </div>
            <div className="w-8 h-px" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: step === 'deploying' ? 'var(--blue)' : 'var(--muted)', opacity: step === 'deploying' ? 1 : 0.4 }} />
              <span className="text-[12px] font-mono" style={{ color: step === 'deploying' ? 'var(--blue)' : 'var(--muted)' }}>02 deploy agent</span>
            </div>
          </div>
          <p className="text-[12px] mt-6" style={{ color: 'var(--muted)' }}>do not close this page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto pt-20 pb-24">

        <Link href="/dashboard" className="block text-[13px] mb-10" style={{ color: 'var(--muted)' }}>
          ← back to dashboard
        </Link>

        <h1 className="text-[28px] font-bold tracking-tight mb-1" style={{ color: 'var(--dark)' }}>launch & deploy</h1>
        <p className="text-[14px] mb-10" style={{ color: 'var(--muted)' }}>
          creates your token on pump.fun and deploys your agent in one go.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* ── TOKEN ─────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--blue)' }}>01 — token</p>

            {/* Image */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>token image</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="rounded-xl flex items-center justify-center cursor-pointer overflow-hidden"
                style={{ width: '100px', height: '100px', background: imagePreview ? 'transparent' : 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <p className="text-[11px] text-center px-3" style={{ color: 'var(--muted)' }}>click to upload</p>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            </div>

            {/* Name + Ticker */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>name</label>
                <input type="text" value={token.name} onChange={(e) => setToken({ ...token, name: e.target.value })} placeholder="e.g. Pilot" required maxLength={32}
                  className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>ticker</label>
                <input type="text" value={token.symbol} onChange={(e) => setToken({ ...token, symbol: e.target.value.toUpperCase() })} placeholder="PILOT" required maxLength={10}
                  className="w-full rounded-lg px-4 py-3 text-[14px] outline-none font-mono"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>description</label>
              <textarea value={token.description} onChange={(e) => setToken({ ...token, description: e.target.value })} placeholder="what is this token about?" required rows={3} maxLength={200}
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none resize-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }} />
              <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{token.description.length} / 200</p>
            </div>

            {/* Social links */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>links <span style={{ opacity: 0.5 }}>(optional)</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'twitter', placeholder: 'https://x.com/yourtoken' },
                  { key: 'telegram', placeholder: 'https://t.me/yourtoken' },
                  { key: 'website', placeholder: 'https://yourtoken.xyz' },
                ].map(({ key, placeholder }) => (
                  <input key={key} type="text" value={token[key as keyof typeof token]} onChange={(e) => setToken({ ...token, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }} />
                ))}
              </div>
            </div>

            {/* Initial buy */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>initial buy (SOL)</label>
              <input type="number" value={initialBuy} onChange={(e) => setInitialBuy(e.target.value)} min="0" step="0.01"
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none font-mono"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }} />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>optional — buys tokens immediately at creation</p>
            </div>
          </div>

          {/* divider */}
          <div style={{ borderTop: '1px solid var(--border)' }} />

          {/* ── AGENT ─────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <p className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--blue)' }}>02 — agent</p>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>agent name</label>
              <input type="text" value={agent.name} onChange={(e) => setAgent({ ...agent, name: e.target.value })} placeholder="e.g. XAGENT" required maxLength={32}
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }} />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>agent persona</label>
              <textarea value={agent.persona} onChange={(e) => setAgent({ ...agent, persona: e.target.value })}
                placeholder="describe your agent's voice and personality. this shapes how it thinks and writes its diary entries."
                required rows={5} maxLength={500}
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none resize-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }} />
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>{agent.persona.length} / 500</p>
            </div>
          </div>

          {/* Info */}
          <div className="rounded-xl p-4" style={{ background: 'var(--blue-light)', border: '1px solid rgba(59,110,245,0.15)' }}>
            {[
              'token created on pump.fun bonding curve (~0.025 SOL fee)',
              'min ~0.075 SOL + initial buy amount in wallet before starting',
              'agent starts running every 15 min immediately',
              'max 3 active agents per account',
            ].map((note) => (
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

          <button type="submit"
            className="w-full py-3.5 rounded-xl font-semibold text-[14px]"
            style={{ background: 'var(--blue)', color: '#fff', boxShadow: '0 2px 12px rgba(59,110,245,0.25)', cursor: 'pointer' }}
          >
            launch token & deploy agent →
          </button>

        </form>
      </div>
    </div>
  )
}
