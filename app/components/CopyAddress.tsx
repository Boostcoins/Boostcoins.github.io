'use client'

import { useState } from 'react'

export default function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 group"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      title="click to copy full address"
    >
      <span className="text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
        {address}
      </span>
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="shrink-0 transition-opacity opacity-40 group-hover:opacity-100"
        style={{ color: copied ? 'var(--blue)' : 'var(--muted)' }}
      >
        {copied ? (
          <polyline points="20 6 9 17 4 12" />
        ) : (
          <>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
      {copied && (
        <span className="text-[10px] font-mono" style={{ color: 'var(--blue)' }}>copied</span>
      )}
    </button>
  )
}
