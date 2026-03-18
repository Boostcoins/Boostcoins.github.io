'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('passwords do not match'); return }
    if (form.password.length < 8) { setError('password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'something went wrong')
      else router.push('/dashboard')
    } catch { setError('network error') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Link href="/" className="block text-[13px] font-bold mb-12" style={{ color: 'var(--dark)' }}>← pilot</Link>

        <h1 className="text-[28px] font-bold tracking-tight mb-1" style={{ color: 'var(--dark)' }}>create account</h1>
        <p className="text-[14px] mb-10" style={{ color: 'var(--muted)' }}>you'll get a solana wallet linked to your account.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { label: 'username', key: 'username', type: 'text', placeholder: 'satoshi' },
            { label: 'password', key: 'password', type: 'password', placeholder: 'min 8 characters' },
            { label: 'confirm password', key: 'confirm', type: 'password', placeholder: 'repeat password' },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                required
                autoComplete="off"
                className="w-full rounded-lg px-4 py-3 text-[14px] outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              />
            </div>
          ))}

          {error && <p className="text-[13px]" style={{ color: '#ef4444' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-[14px] mt-2"
            style={{ background: 'var(--blue)', color: '#fff', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 2px 12px rgba(59,110,245,0.25)' }}
          >
            {loading ? 'creating account...' : 'create account'}
          </button>
        </form>

        <p className="text-[13px] text-center mt-8" style={{ color: 'var(--muted)' }}>
          already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>log in</Link>
        </p>
      </div>
    </div>
  )
}
