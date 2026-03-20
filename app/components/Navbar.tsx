'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar({ username }: { username?: string }) {
  const path = usePathname()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 sm:px-16 pt-6">
      <div
        className="max-w-6xl mx-auto flex items-center justify-between px-5 py-3 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)' }}
      >
        {/* left: logo + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-[12px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>
            pilot<span style={{ color: 'var(--blue)' }}>_</span>
          </Link>
          <span className="hidden sm:block w-px h-3.5" style={{ background: 'var(--border)' }} />
          <div className="hidden sm:flex items-center gap-5">
            <Link href="/agents" className="font-mono text-[11px]" style={{ color: path === '/agents' ? 'var(--dark)' : 'var(--muted)' }}>
              agents
            </Link>
            <Link href="/docs" className="font-mono text-[11px]" style={{ color: path === '/docs' ? 'var(--dark)' : 'var(--muted)' }}>
              docs
            </Link>
            <Link href="/roadmap" className="font-mono text-[11px]" style={{ color: path === '/roadmap' ? 'var(--dark)' : 'var(--muted)' }}>
              roadmap
            </Link>
            <Link href="/developers" className="font-mono text-[11px]" style={{ color: path === '/developers' ? 'var(--dark)' : 'var(--muted)' }}>
              developers
            </Link>
            {username && (
              <Link href="/dashboard" className="font-mono text-[11px]" style={{ color: path?.startsWith('/dashboard') ? 'var(--dark)' : 'var(--muted)' }}>
                dashboard
              </Link>
            )}
          </div>
        </div>

        {/* right: actions */}
        <div className="flex items-center gap-4">
          <a
            href="https://x.com/pilotdotfun"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X / Twitter"
            className="flex items-center"
            style={{ color: 'var(--muted)' }}
          >
            <svg width="13" height="13" viewBox="0 0 300 300" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M178.57 127.15L290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.1h26.46l102.4-116.59 81.8 116.59H300L178.57 127.15zm-36.26 41.27-11.87-16.61L36.16 19.5h40.67l76.2 106.69 11.87 16.61 99.04 138.6h-40.67l-80.96-113.38z"/>
            </svg>
          </a>
          {username ? (
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="font-mono text-[11px]" style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                log out
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>
                log in
              </Link>
              <Link
                href="/register"
                className="font-mono text-[11px] font-semibold px-4 py-1.5 rounded-lg"
                style={{ background: 'var(--dark)', color: 'var(--bg)' }}
              >
                get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
