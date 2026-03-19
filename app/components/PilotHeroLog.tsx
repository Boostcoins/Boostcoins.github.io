'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const PILOT_AGENT_ID = '2efa691c-84e8-47f6-8998-9ea199b2fc8a'
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

interface LogEntry {
  body: string
  mood: string
  created_at: string
}

interface Stats {
  total_burned: string | number
}

function timeAgo(date: string) {
  const ms = Date.now() - new Date(date).getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatBurned(n: string | number): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n
  if (isNaN(num) || num === 0) return '0'
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toLocaleString()
}

export default function PilotHeroLog() {
  const [lines, setLines] = useState<{ text: string; accent?: boolean; dim?: boolean }[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/agent/${PILOT_AGENT_ID}`)
        if (!res.ok) return
        const data = await res.json()
        const log: LogEntry | undefined = data.logs?.[0]
        const stats: Stats | undefined = data.stats

        const result: { text: string; accent?: boolean; dim?: boolean }[] = []

        if (stats?.total_burned) {
          result.push({ text: `burned ${formatBurned(stats.total_burned)} tokens total.` })
        }

        if (log) {
          const sentences = log.body.match(/[^.!?]+[.!?]+/g) || [log.body]
          const trimmed = sentences.map(s => s.trim()).filter(s => s.length > 0).slice(0, 3)
          for (const s of trimmed) {
            result.push({ text: s })
          }
          result.push({ text: '' })
          if (log.mood) {
            result.push({ text: `mood: ${log.mood}`, accent: true })
          }
          result.push({ text: `${timeAgo(log.created_at)} · pilot · $PILOT`, dim: true })
        } else {
          result.push({ text: 'the supply is shrinking.' })
          result.push({ text: 'waiting for first thought.' })
          result.push({ text: '' })
          result.push({ text: 'mood: initializing', accent: true })
          result.push({ text: 'just now · pilot · $PILOT', dim: true })
        }

        setLines(result)
        setLoaded(true)
      } catch {
        setLines([
          { text: 'autonomous agent online.' },
          { text: 'executing on-chain strategy.' },
          { text: '' },
          { text: 'mood: focused', accent: true },
          { text: 'pilot · $PILOT', dim: true },
        ])
        setLoaded(true)
      }
    }
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
  }, [])

  if (!loaded) {
    return (
      <div className="space-y-1 py-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[23px] rounded" style={{ background: 'var(--border)', opacity: 0.3, width: `${60 + i * 10}%` }} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1 py-1">
      {lines.map((line, i) => (
        <motion.p
          key={`${i}-${line.text}`}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: i * 0.15, ease: EASE }}
          className="font-mono"
          style={{
            fontSize: '13px',
            lineHeight: '1.8',
            color: line.accent ? 'var(--blue)' : line.dim ? 'var(--muted)' : 'var(--dark)',
            opacity: line.dim ? 0.5 : 1,
            minHeight: line.text === '' ? '12px' : undefined,
          }}
        >
          {line.text}
          {i === lines.length - 1 && (
            <span className="inline-block w-[6px] h-[14px] ml-1 align-middle" style={{ background: 'var(--blue)', animation: 'blink 1s steps(1) infinite' }} />
          )}
        </motion.p>
      ))}
    </div>
  )
}
