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
