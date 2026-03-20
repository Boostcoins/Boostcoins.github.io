import { Resend } from 'resend'

const NOTIFY_EMAIL   = process.env.NOTIFY_EMAIL   // who receives the email
const NOTIFY_FROM    = process.env.NOTIFY_FROM || 'pilot <onboarding@resend.dev>'
const PILOT_AGENT_ID = process.env.NEXT_PUBLIC_PILOT_CA ? undefined : undefined // just used for link

interface CycleNotifyOptions {
  agentId:   string
  agentName: string
  strategy:  string
  claimedSol: number
  burned:    string
  lpSol:     number
  txs:       string[]
  success:   boolean
  error?:    string
  thinkOk:   boolean
}

function formatBurned(n: string | number): string {
  const raw = typeof n === 'string' ? Number(n) : n
  if (!raw || isNaN(raw)) return '0'
  const num = raw / 1_000_000
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return num.toLocaleString()
}

export async function sendCycleNotification(opts: CycleNotifyOptions) {
  if (!process.env.RESEND_API_KEY || !NOTIFY_EMAIL) return
  const resend = new Resend(process.env.RESEND_API_KEY)

  const status = opts.success ? '✅ cycle ok' : '❌ cycle failed'
  const subject = `[pilot] ${opts.agentName} — ${status}`

  const txLines = opts.txs.length > 0
    ? opts.txs.map((tx, i) => `<li><a href="https://solscan.io/tx/${tx}" style="color:#3b6ef5;font-family:monospace;font-size:12px">${i === 0 ? 'claim' : i === opts.txs.length - 1 && Number(opts.burned) > 0 ? 'burn' : 'buy'}: ${tx.slice(0, 20)}...${tx.slice(-8)}</a></li>`).join('')
    : '<li style="color:#888">no transactions</li>'

  const html = `
<div style="font-family:monospace;max-width:560px;margin:0 auto;background:#f9f9f7;padding:32px;border-radius:12px;border:1px solid #e5e5e0">
  <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin:0 0 16px">pilot_ cycle report</p>

  <h2 style="font-size:18px;font-weight:700;color:#111;margin:0 0 4px;letter-spacing:-0.02em">${opts.agentName}</h2>
  <p style="font-size:12px;color:#888;margin:0 0 24px">${new Date().toISOString()}</p>

  <div style="background:#fff;border:1px solid #e5e5e0;border-radius:8px;padding:16px;margin-bottom:16px">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <tr><td style="color:#888;padding:4px 0">status</td><td style="color:${opts.success ? '#16a34a' : '#dc2626'};font-weight:600">${opts.success ? 'success' : 'failed'}</td></tr>
      <tr><td style="color:#888;padding:4px 0">strategy</td><td style="color:#111">${opts.strategy}</td></tr>
      <tr><td style="color:#888;padding:4px 0">sol claimed</td><td style="color:#111">${opts.claimedSol.toFixed(4)} SOL</td></tr>
      <tr><td style="color:#888;padding:4px 0">tokens burned</td><td style="color:#111">${formatBurned(opts.burned)}</td></tr>
      <tr><td style="color:#888;padding:4px 0">sol to LP</td><td style="color:#111">${opts.lpSol > 0 ? opts.lpSol.toFixed(4) + ' SOL' : '—'}</td></tr>
      <tr><td style="color:#888;padding:4px 0">think cycle</td><td style="color:${opts.thinkOk ? '#16a34a' : '#dc2626'}">${opts.thinkOk ? 'ok' : 'failed'}</td></tr>
    </table>
  </div>

  ${opts.error ? `<div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:12px;margin-bottom:16px"><p style="color:#dc2626;font-size:12px;margin:0"><strong>error:</strong> ${opts.error}</p></div>` : ''}

  <div style="margin-bottom:16px">
    <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#888;margin:0 0 8px">transactions</p>
    <ul style="margin:0;padding:0 0 0 16px;line-height:2">${txLines}</ul>
  </div>

  <a href="https://www.giveyourcoinapilot.fun/agent/${opts.agentId}" style="display:inline-block;background:#111;color:#fff;padding:8px 16px;border-radius:6px;font-size:11px;text-decoration:none;font-weight:600">view agent →</a>
</div>
`

  try {
    await resend.emails.send({
      from:    NOTIFY_FROM,
      to:      NOTIFY_EMAIL,
      subject,
      html,
    })
  } catch (err) {
    console.error('[NOTIFY] failed to send email:', err instanceof Error ? err.message : err)
  }
}
