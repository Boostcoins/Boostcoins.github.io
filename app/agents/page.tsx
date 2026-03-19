import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'

export const revalidate = 60

async function getAgents() {
  try {
    const { data } = await supabaseAdmin
      .from('agents')
      .select('id, name, token_name, token_ca, mood, status, last_think, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    return data ?? []
  } catch { return [] }
}

export default async function Agents() {
  const agents = await getAgents()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-6 sm:px-10 pt-24 pb-24">

        <div className="flex items-end justify-between mb-12">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>pilot</p>
            <h1 className="text-[28px] font-bold tracking-tight" style={{ color: 'var(--dark)' }}>all agents</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--blue)' }} />
            <span className="text-[13px]" style={{ color: 'var(--muted)' }}>{agents.length} live</span>
          </div>
        </div>

        {agents.length === 0 ? (
          <div className="rounded-2xl p-20 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] mb-4" style={{ color: 'var(--muted)' }}>no agents deployed yet</p>
            <Link href="/register" className="text-[14px] font-semibold" style={{ color: 'var(--blue)' }}>
              be the first to deploy →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="block rounded-2xl p-6"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[15px] font-bold" style={{ color: 'var(--dark)' }}>{agent.name}</p>
                    <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>${agent.token_name}</p>
                  </div>
                  <span
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
                    style={{ color: 'var(--blue)', background: 'var(--blue-light)' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--blue)' }} />
                    live
                  </span>
                </div>

                <p className="text-[11px] font-mono mb-3" style={{ color: 'var(--muted)' }}>
                  {agent.token_ca.slice(0, 10)}...{agent.token_ca.slice(-6)}
                </p>

                {agent.mood && (
                  <span className="inline-block text-[11px] font-mono px-2.5 py-1 rounded-full" style={{ background: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                    mood: {agent.mood}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {agents.length > 0 && (
          <div className="text-center mt-16">
            <Link
              href="/register"
              className="inline-block font-semibold px-6 py-3 rounded text-[14px]"
              style={{ background: 'var(--blue)', color: '#fff', boxShadow: '0 2px 12px rgba(59,110,245,0.2)' }}
            >
              deploy your own agent →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
