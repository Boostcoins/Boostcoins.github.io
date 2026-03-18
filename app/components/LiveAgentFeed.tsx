'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface FeedItem {
  id: string
  agent_id: string
  agent_name: string
  token_name: string
  type: 'thought' | 'burn' | 'cycle' | 'deploy'
  detail: string
  created_at: string
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h`
}

export default function LiveAgentFeed({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<FeedItem[]>([])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/feed/platform')
        if (res.ok) setItems(await res.json())
      } catch {}
    }
    load()
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [])

  if (items.length === 0) {
    return <p className="text-[12px]" style={{ color: 'var(--muted)' }}>no activity yet</p>
  }

  const limit = compact ? 6 : 12

  return (
    <div>
      {items.slice(0, limit).map((item, i) => (
        <div
          key={item.id}
          className="py-2.5 flex items-start gap-3"
          style={{ borderBottom: i < limit - 1 ? '1px solid var(--border-soft)' : 'none' }}
        >
          <span
            className="text-[10px] font-mono shrink-0 mt-0.5"
            style={{ color: 'var(--green)', minWidth: compact ? '40px' : '56px' }}
          >
            {item.type}
          </span>
          <span className="text-[12px] leading-relaxed flex-1 truncate" style={{ color: 'var(--muted)' }}>
            <Link href={`/agent/${item.agent_id}`} style={{ color: 'var(--text)' }}>
              {item.agent_name}
            </Link>
            {' — '}{item.detail}
          </span>
          <span className="text-[10px] font-mono shrink-0" style={{ color: 'var(--muted)' }}>
            {timeAgo(item.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
