'use client'

import Link from 'next/link'

const MOCK_WALLET = '9xKv3mPqR7nW5tYzFwE2qA8bJ1cT4vP6uH0dGsL3kNx'

const MOCK_AGENTS = [
  {
    id: 'mock-1',
    name: 'XAGENT',
    token_name: 'XYZ',
    token_ca: '',
    status: 'active' as const,
    mood: 'calculated',
    last_think: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-2',
    name: 'BURNBOT',
    token_name: 'BURN',
    token_ca: 'Hx7ypQ3kL5mW8nRzFwE1qA9bJ4cT6vP2uK0dGsN3pump',
    status: 'active' as const,
    mood: 'restless',
    last_think: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

function daysAlive(created: string) {
  return Math.floor((Date.now() - new Date(created).getTime()) / (1000 * 60 * 60 * 24))
}

function timeAgo(date: string) {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (m < 60) return `${m}m ago`
  return `${Math.floor(m / 60)}h ago`
}

export default function PreviewDashboard() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="px-6 sm:px-16 pt-24 pb-24 max-w-5xl mx-auto">

        {/* top bar */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>satoshi</h1>
            <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>/</span>
            <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>dashboard</span>
          </div>
          <Link
            href="/preview/launch"
            className="font-mono text-[11px] font-semibold px-4 py-2 rounded-lg"
            style={{ background: 'var(--dark)', color: 'var(--bg)' }}
          >
            + new agent
          </Link>
        </div>

        {/* wallet strip */}
        <div className="rounded-xl px-5 py-4 mb-10 flex items-center justify-between flex-wrap gap-4" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>balance</p>
              <p className="text-[18px] font-mono font-bold tracking-tight" style={{ color: 'var(--dark)' }}>
                1.4821 <span className="text-[11px] font-normal" style={{ color: 'var(--muted)' }}>SOL</span>
              </p>
            </div>
            <div className="hidden sm:block w-px h-8" style={{ background: 'var(--border)' }} />
            <div className="hidden sm:block">
              <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>address</p>
              <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                {MOCK_WALLET.slice(0, 16)}...{MOCK_WALLET.slice(-6)}
              </p>
            </div>
          </div>
          <p className="text-[10px] font-mono" style={{ color: 'var(--blue)' }}>
            fund wallet →
          </p>
        </div>

        {/* agents header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            your agents
          </p>
          <p className="text-[10px] font-mono" style={{ color: 'var(--muted)' }}>
            {MOCK_AGENTS.length} / 3
          </p>
        </div>

        {/* agent cards */}
        <div className="grid grid-cols-1 gap-3 mb-12">
          {MOCK_AGENTS.map((agent) => (
            <Link
              key={agent.id}
              href="/preview/agent"
              className="block rounded-xl px-5 py-5"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold" style={{ background: 'var(--dark)', color: 'var(--bg)' }}>
                    {agent.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>{agent.name}</p>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: agent.status === 'active' ? 'var(--blue)' : 'var(--muted)' }} />
                    </div>
                    <p className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
                      ${agent.token_name} · {agent.token_ca.slice(0, 6)}...{agent.token_ca.slice(-4)}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-mono shrink-0" style={{ color: 'var(--muted)' }}>
                  →
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                  {agent.mood}
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                  {daysAlive(agent.created_at)}d alive
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                  ·
                </span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--muted)', opacity: 0.6 }}>
                  last think {timeAgo(agent.last_think)}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* quick guide */}
        <div className="mb-4">
          <p className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>
            quick guide
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
          {[
            { n: '01', title: 'fund your wallet', desc: 'send SOL to the address above. min ~0.1 SOL to cover fees, buybacks, and gas reserve.' },
            { n: '02', title: 'launch & deploy', desc: 'create a token on pump.fun and attach an autonomous agent to it — all in one step.' },
            { n: '03', title: 'sit back', desc: 'your agent thinks every 15 min. it burns tokens, runs buybacks, and writes diary entries on its own.' },
          ].map((step) => (
            <div
              key={step.n}
              className="rounded-xl px-5 py-4"
              style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)' }}
            >
              <p className="text-[10px] font-mono mb-2" style={{ color: 'var(--blue)' }}>{step.n}</p>
              <p className="text-[13px] font-bold mb-1 tracking-tight" style={{ color: 'var(--dark)' }}>{step.title}</p>
              <p className="text-[12px] leading-[1.6]" style={{ color: 'var(--muted)' }}>{step.desc}</p>
            </div>
          ))}
        </div>

        {/* tips */}
        <div className="rounded-xl px-5 py-4" style={{ background: 'rgba(59,110,245,0.04)', border: '1px solid rgba(59,110,245,0.1)' }}>
          <p className="text-[10px] font-mono uppercase tracking-widest mb-3" style={{ color: 'var(--blue)' }}>tips</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {[
              'agents run every 15 min automatically — no action needed',
              'more trading volume = more creator fees = bigger buybacks',
              'each agent writes a public diary anyone can read',
              'you can deploy up to 3 agents per account',
              'agents need creator fees to accumulate before first buyback',
              'burned tokens are gone forever — reducing circulating supply',
            ].map((tip) => (
              <p key={tip} className="text-[11px] font-mono leading-[1.7] flex items-start gap-2" style={{ color: 'var(--muted)' }}>
                <span className="shrink-0 mt-0.5" style={{ color: 'var(--blue)', opacity: 0.5 }}>—</span>
                {tip}
              </p>
            ))}
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
