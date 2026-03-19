'use client'

import { useEffect, useState } from 'react'

interface Stats {
  total_agents: number
  total_burned: number
  total_sol_claimed: number
  total_lp: number
  total_think_cycles: number
}

function formatBurned(n: number) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T'
  if (n >= 1e9)  return (n / 1e9).toFixed(1) + 'B'
  if (n >= 1e6)  return (n / 1e6).toFixed(1) + 'M'
  return n.toLocaleString()
}

export default function PlatformStats() {
  const [stats, setStats] = useState<Stats>({
    total_agents: 0,
    total_burned: 0,
    total_sol_claimed: 0,
    total_lp: 0,
    total_think_cycles: 0,
  })

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/stats/platform')
        if (res.ok) setStats(await res.json())
      } catch {}
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  const items = [
    { label: 'agents live',    value: stats.total_agents.toString() },
    { label: 'tokens burned',  value: formatBurned(stats.total_burned) },
    { label: 'sol claimed',    value: stats.total_sol_claimed.toFixed(3) },
    { label: 'sol to lp',      value: stats.total_lp.toFixed(3) },
    { label: 'think cycles',   value: stats.total_think_cycles.toLocaleString() },
    { label: 'uptime',         value: '100%' },
  ]

  return (
    <>
      {items.map((s) => (
        <div key={s.label}>
          <p
            className="font-mono font-bold tracking-tight"
            style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', color: 'var(--dark)', lineHeight: '1' }}
          >
            {s.value}
          </p>
          <p className="mt-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{s.label}</p>
        </div>
      ))}
    </>
  )
}
