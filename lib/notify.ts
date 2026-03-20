import { Resend } from 'resend'

const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'scone-melodi.0y@icloud.com'
const NOTIFY_FROM  = process.env.NOTIFY_FROM  || 'pilot <onboarding@resend.dev>'

interface CycleNotifyOptions {
  agentId:    string
  agentName:  string
  tokenName?: string
  tokenCa?:   string
  strategy:   string
  claimedSol: number
  burned:     string
  lpSol:      number
  txs:        string[]
  success:    boolean
  error?:     string
  thinkOk:    boolean
  mood?:      string
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

  // Fetch cumulative stats
  const { supabaseAdmin } = await import('./supabase')
  const { data: cumulative } = await supabaseAdmin
    .from('agent_stats')
    .select('total_claimed, total_burned, total_lp, last_strategy')
    .eq('agent_id', opts.agentId)
    .single()

  const status = opts.success ? '✅ cycle ok' : '❌ cycle failed'
  const subject = `[pilot] ${opts.agentName} — ${status} — ${opts.strategy}${opts.mood ? ` (${opts.mood})` : ''}`

  const now = new Date()
  const timeStr = now.toUTCString()

  const txLabels = ['claim', 'buy', 'burn', 'lp-buy', 'lp-deposit']
  const txRows = opts.txs.length > 0
    ? opts.txs.map((tx, i) => {
        const label = i === 0 ? 'claim' : opts.lpSol > 0 && i >= opts.txs.length - 2 ? (i === opts.txs.length - 1 ? 'lp-deposit' : 'lp-buy') : Number(opts.burned) > 0 && i === opts.txs.length - 1 ? 'burn' : 'buyback'
        return `
        <tr>
          <td style="padding:8px 12px;font-size:11px;color:#888;border-bottom:1px solid #f0f0ee;white-space:nowrap">${label}</td>
          <td style="padding:8px 12px;font-size:11px;border-bottom:1px solid #f0f0ee">
            <a href="https://solscan.io/tx/${tx}" style="color:#3b6ef5;text-decoration:none;font-family:monospace">${tx.slice(0, 24)}...${tx.slice(-8)}</a>
          </td>
          <td style="padding:8px 12px;font-size:11px;border-bottom:1px solid #f0f0ee">
            <a href="https://solscan.io/tx/${tx}" style="color:#3b6ef5;text-decoration:none">↗ solscan</a>
          </td>
        </tr>`
      }).join('')
    : `<tr><td colspan="3" style="padding:12px;font-size:12px;color:#aaa;text-align:center">no transactions this cycle</td></tr>`

  const statusColor = opts.success ? '#16a34a' : '#dc2626'
  const statusBg    = opts.success ? '#f0fdf4' : '#fff5f5'
  const statusBorder = opts.success ? '#bbf7d0' : '#fecaca'

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f5f5f3;font-family:monospace">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;border:1px solid #e5e5e0;overflow:hidden">

  <!-- header -->
  <div style="background:#111;padding:20px 28px;display:flex;align-items:center;justify-content:space-between">
    <span style="color:#fff;font-size:14px;font-weight:700;letter-spacing:-0.02em">pilot_</span>
    <span style="color:#888;font-size:11px">cycle report</span>
  </div>

  <!-- status bar -->
  <div style="background:${statusBg};border-bottom:1px solid ${statusBorder};padding:14px 28px;display:flex;align-items:center;gap:10px">
    <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};display:inline-block"></span>
    <span style="color:${statusColor};font-size:12px;font-weight:700">${opts.success ? 'cycle completed successfully' : 'cycle failed'}</span>
    <span style="color:#aaa;font-size:11px;margin-left:auto">${timeStr}</span>
  </div>

  <div style="padding:24px 28px">

    <!-- agent info -->
    <div style="margin-bottom:20px">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin:0 0 6px">agent</p>
      <p style="font-size:18px;font-weight:700;color:#111;margin:0 0 4px;letter-spacing:-0.02em">${opts.agentName}</p>
      ${opts.tokenName ? `<p style="font-size:12px;color:#888;margin:0 0 4px;font-family:monospace">$${opts.tokenName}</p>` : ''}
      ${opts.tokenCa ? `<p style="font-size:10px;color:#bbb;margin:0 0 6px;font-family:monospace">${opts.tokenCa}</p>` : ''}
      <a href="https://www.giveyourcoinapilot.fun/agent/${opts.agentId}" style="font-size:11px;color:#3b6ef5;text-decoration:none">view on pilot →</a>
    </div>

    <div style="height:1px;background:#f0f0ee;margin-bottom:20px"></div>

    <!-- this cycle -->
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin:0 0 12px">this cycle</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#fafaf8">
        <td style="padding:10px 12px;font-size:11px;color:#888;width:160px;border-bottom:1px solid #f0f0ee">strategy</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:700;color:#3b6ef5;border-bottom:1px solid #f0f0ee">${opts.strategy}</td>
      </tr>
      ${opts.mood ? `<tr>
        <td style="padding:10px 12px;font-size:11px;color:#888;border-bottom:1px solid #f0f0ee">mood</td>
        <td style="padding:10px 12px;font-size:12px;color:#111;border-bottom:1px solid #f0f0ee">${opts.mood}</td>
      </tr>` : ''}
      <tr style="background:#fafaf8">
        <td style="padding:10px 12px;font-size:11px;color:#888;border-bottom:1px solid #f0f0ee">sol claimed from vault</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111;border-bottom:1px solid #f0f0ee">${opts.claimedSol > 0 ? opts.claimedSol.toFixed(6) + ' SOL' : '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:11px;color:#888;border-bottom:1px solid #f0f0ee">tokens burned</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111;border-bottom:1px solid #f0f0ee">${Number(opts.burned) > 0 ? formatBurned(opts.burned) + ' tokens' : '—'}</td>
      </tr>
      <tr style="background:#fafaf8">
        <td style="padding:10px 12px;font-size:11px;color:#888;border-bottom:1px solid #f0f0ee">sol added to LP</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111;border-bottom:1px solid #f0f0ee">${opts.lpSol > 0 ? opts.lpSol.toFixed(6) + ' SOL' : '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:11px;color:#888;border-bottom:1px solid #f0f0ee">transactions</td>
        <td style="padding:10px 12px;font-size:12px;color:#111;border-bottom:1px solid #f0f0ee">${opts.txs.length} tx${opts.txs.length !== 1 ? 's' : ''}</td>
      </tr>
      <tr style="background:#fafaf8">
        <td style="padding:10px 12px;font-size:11px;color:#888">think cycle</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:${opts.thinkOk ? '#16a34a' : '#dc2626'}">${opts.thinkOk ? '✓ ok' : '✗ failed'}</td>
      </tr>
    </table>

    <!-- cumulative totals -->
    ${cumulative ? `
    <div style="height:1px;background:#f0f0ee;margin-bottom:20px"></div>
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin:0 0 12px">cumulative totals</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr style="background:#fafaf8">
        <td style="padding:10px 12px;font-size:11px;color:#888;width:160px;border-bottom:1px solid #f0f0ee">total sol claimed</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111;border-bottom:1px solid #f0f0ee">${Number(cumulative.total_claimed).toFixed(4)} SOL</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:11px;color:#888;border-bottom:1px solid #f0f0ee">total tokens burned</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111;border-bottom:1px solid #f0f0ee">${formatBurned(cumulative.total_burned)} tokens</td>
      </tr>
      <tr style="background:#fafaf8">
        <td style="padding:10px 12px;font-size:11px;color:#888">total sol to LP</td>
        <td style="padding:10px 12px;font-size:12px;font-weight:600;color:#111">${Number(cumulative.total_lp).toFixed(4)} SOL</td>
      </tr>
    </table>` : ''}

    ${opts.error ? `
    <!-- error -->
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:24px">
      <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#dc2626;margin:0 0 6px">error</p>
      <p style="font-size:12px;color:#b91c1c;margin:0;line-height:1.6">${opts.error}</p>
    </div>` : ''}

    <!-- transactions -->
    ${opts.txs.length > 0 ? `
    <div style="height:1px;background:#f0f0ee;margin-bottom:24px"></div>
    <p style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:#aaa;margin:0 0 12px">on-chain transactions</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #f0f0ee;border-radius:8px;overflow:hidden;margin-bottom:24px">
      ${txRows}
    </table>` : ''}

    <!-- links -->
    <div style="height:1px;background:#f0f0ee;margin-bottom:20px"></div>
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <a href="https://www.giveyourcoinapilot.fun/agent/${opts.agentId}" style="display:inline-block;background:#111;color:#fff;padding:9px 18px;border-radius:6px;font-size:11px;text-decoration:none;font-weight:700">agent page →</a>
      <a href="https://solscan.io/token/6AdmZxzpX6gG1bmKkVnP7g59nfK71GK1LeihzczRpump" style="display:inline-block;background:#fff;color:#111;padding:9px 18px;border-radius:6px;font-size:11px;text-decoration:none;font-weight:600;border:1px solid #e5e5e0">$pilot on solscan →</a>
    </div>

  </div>

  <!-- footer -->
  <div style="background:#fafaf8;border-top:1px solid #f0f0ee;padding:14px 28px;display:flex;justify-content:space-between;align-items:center">
    <span style="font-size:10px;color:#bbb">pilot_ autonomous agent system</span>
    <span style="font-size:10px;color:#bbb">cycle runs every 15 min</span>
  </div>

</div>
</body>
</html>`

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
