'use client'

import { useState } from 'react'
import WithdrawModal from './WithdrawModal'

export default function WalletActions({ balance }: { balance: number }) {
  const [showWithdraw, setShowWithdraw] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowWithdraw(true)}
        className="font-mono text-[11px] font-semibold px-4 py-1.5 rounded-lg"
        style={{ background: 'var(--dark)', color: 'var(--bg)', cursor: 'pointer', border: 'none' }}
      >
        withdraw
      </button>
      {showWithdraw && <WithdrawModal balance={balance} onClose={() => setShowWithdraw(false)} />}
    </>
  )
}
