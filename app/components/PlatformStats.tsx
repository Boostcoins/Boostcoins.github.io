'use client'

import { useEffect, useState } from 'react'

interface Stats {
  total_agents: number
  total_burned: number
  total_sol_claimed: number
}

export default function PlatformStats() {
  const [stats, setStats] = useState<Stats>({ total_agents: 0, total_burned: 0, total_sol_claimed: 0 })

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
    { label: 'agents deployed', value: stats.total_agents.toString() },
    {
      label: 'tokens burned',
      value: stats.total_burned > 1e9
        ? (stats.total_burned / 1e9).toFixed(1) + 'B'
        : stats.total_burned > 1e6
        ? (stats.total_burned / 1e6).toFixed(1) + 'M'
        : stats.total_burned.toLocaleString(),
    },
    { label: 'sol claimed', value: stats.total_sol_claimed.toFixed(2) },
    { label: 'agents offline', value: '0', green: true },
  ]

  return (
    <>
      {items.map((s) => (
        <div key={s.label}>
          <p
            className="font-mono font-bold tracking-tight"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: 'var(--dark)', lineHeight: '1' }}
          >
            {s.value}
          </p>
          <p className="mt-2 text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{s.label}</p>
        </div>
      ))}
    </>
  )
}
