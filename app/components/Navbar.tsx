'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar({ username }: { username?: string }) {
  const path = usePathname()

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 sm:px-10 h-14"
      style={{ background: 'rgba(247,249,255,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center gap-8">
        <Link href="/" className="text-[13px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>
          pilot
        </Link>
        <Link href="/agents" className="text-[13px]" style={{ color: path === '/agents' ? 'var(--dark)' : 'var(--muted)' }}>
          agents
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <a href="https://x.com/pilotdotfun" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter" style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 300 300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M178.57 127.15L290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.1h26.46l102.4-116.59 81.8 116.59H300L178.57 127.15zm-36.26 41.27-11.87-16.61L36.16 19.5h40.67l76.2 106.69 11.87 16.61 99.04 138.6h-40.67l-80.96-113.38z"/>
          </svg>
        </a>
        {username ? (
          <>
            <Link href="/dashboard" className="text-[13px] px-3 py-1.5 rounded" style={{ color: 'var(--dark)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              dashboard
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-[13px]" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>log out</button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login" className="text-[13px]" style={{ color: 'var(--muted)' }}>log in</Link>
            <Link href="/register" className="text-[13px] font-semibold px-4 py-1.5 rounded" style={{ background: 'var(--blue)', color: '#fff' }}>
              get started
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
