import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { getWalletBalance } from '@/lib/wallet'
import Navbar from '../components/Navbar'

export default async function Dashboard() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [userRes, walletRes, agentsRes] = await Promise.all([
    supabaseAdmin.from('users').select('id, username').eq('id', session.userId).single(),
    supabaseAdmin.from('wallets').select('public_key').eq('user_id', session.userId).single(),
    supabaseAdmin
      .from('agents')
      .select('id, name, token_name, token_ca, status, mood, last_think, created_at')
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false }),
  ])

  const user = userRes.data
  const wallet = walletRes.data
  let balance = 0
  if (wallet) {
    try { balance = await getWalletBalance(wallet.public_key) } catch {}
  }
  const agents = agentsRes.data ?? []

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <Navbar username={user?.username} />

      <div className="px-6 sm:px-10 pt-24 pb-24 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>dashboard</p>
            <h1 className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>{user?.username}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/launch"
              className="font-semibold px-5 py-2.5 rounded text-[14px]"
              style={{ background: 'var(--blue)', color: '#fff', boxShadow: '0 2px 12px rgba(59,110,245,0.25)' }}
            >
              + new agent
            </Link>
          </div>
        </div>

        {/* Wallet card */}
        <div className="rounded-2xl p-7 mb-8" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <p className="text-[11px] font-mono uppercase tracking-widest mb-5" style={{ color: 'var(--muted)' }}>your wallet</p>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <p className="font-bold tracking-tight mb-2" style={{ fontSize: 'clamp(1.8rem,4vw,2.5rem)', color: 'var(--dark)' }}>
                {balance.toFixed(4)} <span className="text-[16px] font-normal" style={{ color: 'var(--muted)' }}>SOL</span>
              </p>
              <p className="text-[12px] font-mono break-all" style={{ color: 'var(--muted)' }}>
                {wallet?.public_key ?? '—'}
              </p>
            </div>
            <div
              className="rounded-xl px-4 py-3 text-right"
              style={{ background: 'var(--blue-light)', border: '1px solid rgba(59,110,245,0.15)' }}
            >
              <p className="text-[12px] font-medium mb-0.5" style={{ color: 'var(--blue)' }}>send SOL to this address</p>
              <p className="text-[11px]" style={{ color: 'var(--blue)' }}>min 0.05 SOL to deploy an agent</p>
            </div>
          </div>
        </div>

        {/* Agents */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[11px] font-mono uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            your agents ({agents.length} / 3)
          </p>
          {agents.length > 0 && (
            <Link href="/dashboard/launch" className="text-[13px]" style={{ color: 'var(--blue)' }}>
              + new agent
            </Link>
          )}
        </div>

        {agents.length === 0 ? (
          <div
            className="rounded-2xl p-16 text-center"
            style={{ border: '2px dashed var(--border)', background: 'var(--surface)' }}
          >
            <p className="text-[14px] mb-3" style={{ color: 'var(--muted)' }}>no agents deployed yet</p>
            <Link href="/dashboard/launch" className="text-[14px] font-semibold" style={{ color: 'var(--blue)' }}>
              launch your first agent →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-2xl p-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--dark)' }}>{agent.name}</p>
                    <p className="text-[12px] font-mono mt-1" style={{ color: 'var(--muted)' }}>
                      ${agent.token_name} · {agent.token_ca.slice(0, 8)}...{agent.token_ca.slice(-4)}
                    </p>
                  </div>
                  <span
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{
                      color: agent.status === 'active' ? 'var(--blue)' : 'var(--muted)',
                      background: agent.status === 'active' ? 'var(--blue-light)' : 'var(--bg)',
                      border: `1px solid ${agent.status === 'active' ? 'rgba(59,110,245,0.2)' : 'var(--border)'}`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: agent.status === 'active' ? 'var(--blue)' : 'var(--muted)' }} />
                    {agent.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  {agent.mood && (
                    <span className="text-[12px] font-mono px-2.5 py-1 rounded-full" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                      mood: {agent.mood}
                    </span>
                  )}
                  {agent.last_think && (
                    <p className="text-[12px]" style={{ color: 'var(--muted)' }}>
                      last think: {new Date(agent.last_think).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                <Link
                  href={`/agent/${agent.id}`}
                  className="text-[13px] font-medium"
                  style={{ color: 'var(--blue)' }}
                >
                  view agent page →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
