import { config } from 'dotenv'
import { readFileSync } from 'fs'

// Load .env.local
const envContent = readFileSync('.env.local', 'utf8')
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=')
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PILOT_AGENT_ID = '2efa691c-84e8-47f6-8998-9ea199b2fc8a'

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  })
  return res.json()
}

console.log('fetching pilot agent + wallet...')

const [agents, users] = await Promise.all([
  supabase(`agents?id=eq.${PILOT_AGENT_ID}&select=id,name,token_name,token_ca,persona,user_id,mood`),
  supabase(`agents?id=eq.${PILOT_AGENT_ID}&select=user_id`),
])

const agent = agents[0]
console.log(`agent: ${agent.name} ($${agent.token_name}) — ${agent.token_ca}`)

const wallets = await supabase(`wallets?user_id=eq.${agent.user_id}&select=public_key,encrypted_private_key`)
const wallet = wallets[0]
console.log(`wallet: ${wallet.public_key}`)

console.log('\nrunning on-chain cycle...\n')

const { runOnChainCycle } = await import('./lib/solana.ts')

const result = await runOnChainCycle(
  agent.id,
  wallet.encrypted_private_key,
  agent.token_ca,
  agent.mood ?? undefined
)

console.log('\n─── RESULT ───────────────────────────────')
console.log(JSON.stringify(result, null, 2))
