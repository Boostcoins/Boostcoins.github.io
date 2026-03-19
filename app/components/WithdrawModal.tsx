'use client'

import { useState } from 'react'

const glass = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(24px)',
  border: '1px solid var(--border)',
} as const

const MIN_RESERVE = 0.01

export default function WithdrawModal({ balance, onClose }: { balance: number; onClose: () => void }) {
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const maxWithdrawable = Math.max(0, balance - MIN_RESERVE)
  const tooLow = maxWithdrawable <= 0

  function setMax() {
    setAmount(maxWithdrawable.toFixed(4))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amt = parseFloat(amount)
    if (!destination.trim()) { setError('enter a wallet address'); return }
    if (isNaN(amt) || amt <= 0) { setError('enter a valid amount'); return }
    if (amt > maxWithdrawable) { setError(`max ${maxWithdrawable.toFixed(4)} SOL (${MIN_RESERVE} SOL reserved)`); return }

    setLoading(true)
    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: destination.trim(), amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'withdraw failed'); return }
      setSuccess(data.signature)
    } catch {
      setError('network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-[420px] rounded-2xl p-6" style={glass}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[16px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>withdraw SOL</h2>
          <button
            onClick={onClose}
            className="text-[18px] leading-none"
            style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {success ? (
          <div>
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(59,110,245,0.06)', border: '1px solid rgba(59,110,245,0.15)' }}>
              <p className="text-[13px] font-mono font-semibold mb-1" style={{ color: 'var(--blue)' }}>
                withdraw successful
              </p>
              <p className="text-[11px] font-mono break-all" style={{ color: 'var(--muted)' }}>
                tx: {success}
              </p>
            </div>
            <button
              onClick={() => { onClose(); window.location.reload() }}
              className="w-full py-2.5 rounded-lg font-mono text-[12px] font-semibold"
              style={{ background: 'var(--dark)', color: 'var(--bg)', cursor: 'pointer', border: 'none' }}
            >
              done
            </button>
          </div>
        ) : tooLow ? (
          <div>
            <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-[13px] font-mono" style={{ color: '#ef4444' }}>
                balance too low to withdraw
              </p>
              <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--muted)' }}>
                you need more than {MIN_RESERVE} SOL. current balance: {balance.toFixed(4)} SOL.
                at least {MIN_RESERVE} SOL must stay in the wallet for agent transaction fees.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg font-mono text-[12px]"
              style={{ background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer', border: '1px solid var(--border)' }}
            >
              close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-[10px] font-mono uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted)' }}>
                destination wallet
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="solana address"
                className="w-full rounded-lg px-4 py-2.5 text-[13px] font-mono outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }}
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  amount (SOL)
                </label>
                <button
                  type="button"
                  onClick={setMax}
                  className="text-[10px] font-mono font-semibold"
                  style={{ color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  max: {maxWithdrawable.toFixed(4)}
                </button>
              </div>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg px-4 py-2.5 text-[13px] font-mono outline-none"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--dark)' }}
              />
              <p className="text-[10px] font-mono mt-1.5" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                {MIN_RESERVE} SOL reserved for agent fees
              </p>
            </div>

            {error && <p className="text-[12px] font-mono mb-3" style={{ color: '#ef4444' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-mono text-[12px] font-semibold"
              style={{
                background: 'var(--dark)',
                color: 'var(--bg)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                border: 'none',
              }}
            >
              {loading ? 'sending...' : 'withdraw'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
