'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LaunchToken() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ name: '', symbol: '', description: '', twitter: '', telegram: '', website: '' })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [initialBuy, setInitialBuy] = useState('0.1')
  const [step, setStep] = useState<'form' | 'launching' | 'done'>('form')
  const [mintAddress, setMintAddress] = useState('')
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')

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
    setStep('launching')

    try {
      setStatusMsg('uploading metadata to ipfs...')
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('symbol', form.symbol)
      fd.append('description', form.description)
      fd.append('twitter', form.twitter)
      fd.append('telegram', form.telegram)
      fd.append('website', form.website)
      fd.append('image', image)
      fd.append('initialBuy', initialBuy)

      setStatusMsg('creating token on pump.fun...')
      const res = await fetch('/api/launch', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'launch failed')
        setStep('form')
        return
      }

      setMintAddress(data.mint)
      setStep('done')
    } catch (err) {
      setError('network error')
      setStep('form')
    }
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen px-6" style={{ background: 'var(--bg)' }}>
        <div className="max-w-xl mx-auto pt-20 pb-20">
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: 'var(--blue-light)' }}>
              <span className="text-[18px]" style={{ color: 'var(--blue)' }}>✓</span>
            </div>
            <h1 className="text-[22px] font-bold mb-2" style={{ color: 'var(--dark)' }}>${form.symbol} is live</h1>
            <p className="text-[13px] mb-6" style={{ color: 'var(--muted)' }}>your token has been created on pump.fun</p>

            <div className="rounded-xl p-4 mb-6 text-left" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>contract address</p>
              <p className="text-[12px] font-mono break-all" style={{ color: 'var(--dark)' }}>{mintAddress}</p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/dashboard/deploy?ca=${mintAddress}&ticker=${form.symbol}&name=${encodeURIComponent(form.name)}`}
                className="w-full py-3 rounded-xl font-semibold text-[14px] text-center"
                style={{ background: 'var(--blue)', color: '#fff', boxShadow: '0 2px 12px rgba(59,110,245,0.25)' }}
              >
                deploy agent for ${form.symbol} →
              </Link>
              <a
                href={`https://pump.fun/coin/${mintAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl text-[14px] text-center"
                style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}
              >
                view on pump.fun
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'launching') {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent mx-auto mb-5 animate-spin" style={{ borderColor: 'var(--blue)', borderTopColor: 'transparent' }} />
          <p className="text-[15px] font-medium mb-2" style={{ color: 'var(--dark)' }}>{statusMsg}</p>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>do not close this page</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen px-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-xl mx-auto pt-20 pb-20">

        <Link href="/dashboard" className="block text-[13px] mb-10" style={{ color: 'var(--muted)' }}>
          ← back to dashboard
        </Link>

        <h1 className="text-[28px] font-bold tracking-tight mb-1" style={{ color: 'var(--dark)' }}>launch a token</h1>
        <p className="text-[14px] mb-10" style={{ color: 'var(--muted)' }}>
          creates your coin on pump.fun. you&apos;ll deploy an agent right after.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Image upload */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>token image</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-xl flex items-center justify-center cursor-pointer overflow-hidden"
              style={{
                width: '120px',
                height: '120px',
                background: imagePreview ? 'transparent' : 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="text-center px-4">
                  <p className="text-[11px]" style={{ color: 'var(--muted)' }}>click to upload</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--muted)', opacity: 0.6 }}>PNG, JPG, GIF</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>

          {/* Name + Symbol */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>token name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Pilot"
                required
                maxLength={32}
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>ticker</label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                placeholder="PILOT"
                required
                maxLength={10}
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none font-mono"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="what is this token about?"
              required
              rows={3}
              maxLength={200}
              className="w-full rounded-lg px-4 py-3 text-[14px] outline-none resize-none"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            />
            <p className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{form.description.length} / 200</p>
          </div>

          {/* Social links */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>links <span style={{ opacity: 0.5 }}>(optional)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { key: 'twitter', placeholder: 'https://x.com/yourtoken' },
                { key: 'telegram', placeholder: 'https://t.me/yourtoken' },
                { key: 'website', placeholder: 'https://yourtoken.xyz' },
              ].map(({ key, placeholder }) => (
                <input
                  key={key}
                  type="text"
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                />
              ))}
            </div>
          </div>

          {/* Initial buy */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>initial buy (SOL)</label>
            <input
              type="number"
              value={initialBuy}
              onChange={(e) => setInitialBuy(e.target.value)}
              min="0"
              step="0.01"
              className="w-full rounded-lg px-4 py-3 text-[14px] outline-none font-mono"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            />
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--muted)' }}>optional — buys tokens immediately after creation</p>
          </div>

          {/* Info */}
          <div className="rounded-xl p-4" style={{ background: 'var(--blue-light)', border: '1px solid rgba(59,110,245,0.15)' }}>
            {[
              'token is created on pump.fun bonding curve',
              'launch costs ~0.02 SOL in fees',
              'you get the CA instantly — deploy agent right after',
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

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-semibold text-[14px]"
            style={{ background: 'var(--blue)', color: '#fff', boxShadow: '0 2px 12px rgba(59,110,245,0.25)', cursor: 'pointer' }}
          >
            launch token
          </button>
        </form>
      </div>
    </div>
  )
}
