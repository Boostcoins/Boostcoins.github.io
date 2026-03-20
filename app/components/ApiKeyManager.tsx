'use client'

import { useEffect, useState } from 'react'

interface ApiKey {
  id: string
  key_prefix: string
  name: string
  created_at: string
  last_used: string | null
  revoked: boolean
}

export default function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKey, setNewKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    fetch('/api/v1/keys').then(r => r.json()).then(d => setKeys(d.keys || []))
  }, [])

  async function createKey() {
    setCreating(true)
    const res = await fetch('/api/v1/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || 'default' }),
    })
    const data = await res.json()
    if (data.key) {
      setNewKey(data.key)
      setName('')
      const updated = await fetch('/api/v1/keys').then(r => r.json())
      setKeys(updated.keys || [])
    }
    setCreating(false)
  }

  async function revokeKey(id: string) {
    await fetch('/api/v1/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setKeys(keys.map(k => k.id === id ? { ...k, revoked: true } : k))
  }

  const activeKeys = keys.filter(k => !k.revoked)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
          api keys
        </p>
        <p className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
          {activeKeys.length} / 5
        </p>
      </div>

      {newKey && (
        <div className="rounded-xl px-4 py-3 mb-4" style={{ background: 'rgba(59,110,245,0.04)', border: '1px solid rgba(59,110,245,0.15)' }}>
          <p className="text-[11px] font-mono font-semibold mb-1" style={{ color: 'var(--blue)' }}>new key created — copy it now</p>
          <p className="text-[10px] font-mono break-all" style={{ color: 'var(--dark)' }}>{newKey}</p>
          <button
            onClick={() => { navigator.clipboard.writeText(newKey); setNewKey(null) }}
            className="mt-2 text-[10px] font-mono px-3 py-1 rounded"
            style={{ background: 'var(--dark)', color: 'var(--bg)' }}
          >
            copy & dismiss
          </button>
        </div>
      )}

      <div className="rounded-xl px-5 py-4 mb-4" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="key name (optional)"
            className="flex-1 text-[11px] font-mono px-3 py-1.5 rounded-lg outline-none"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--dark)' }}
          />
          <button
            onClick={createKey}
            disabled={creating || activeKeys.length >= 5}
            className="text-[10px] font-mono font-semibold px-4 py-1.5 rounded-lg shrink-0"
            style={{ background: 'var(--dark)', color: 'var(--bg)', opacity: creating ? 0.5 : 1 }}
          >
            {creating ? '...' : 'generate'}
          </button>
        </div>

        {activeKeys.length === 0 ? (
          <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>no api keys yet</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between py-1.5">
                <div>
                  <span className="text-[11px] font-mono" style={{ color: 'var(--dark)' }}>{k.key_prefix}...</span>
                  <span className="text-[10px] font-mono ml-2" style={{ color: 'var(--muted)' }}>{k.name}</span>
                </div>
                <button
                  onClick={() => revokeKey(k.id)}
                  className="text-[9px] font-mono px-2 py-0.5 rounded"
                  style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
