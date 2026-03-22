import { createClient } from '@supabase/supabase-js'
import { encryptPrivateKey } from '../lib/wallet'
import { hashPassword } from '../lib/auth'
import crypto from 'crypto'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const PILOT_CA = ''
const PILOT_PUBLIC_KEY = process.env.PILOT_WALLET_PUBLIC_KEY!
const PILOT_PRIVATE_KEY = process.env.PILOT_WALLET_PRIVATE_KEY!

async function main() {
  console.log('seeding pilot agent...')

  // Check if agent with this CA already exists
  const { data: existing } = await supabase
    .from('agents')
    .select('id')
    .eq('token_ca', PILOT_CA)
    .single()

  if (existing) {
    console.log('pilot agent already exists:', existing.id)
    return
  }

  // Check if pilot user exists, create if not
  let userId: string
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', 'pilot')
    .single()

  if (existingUser) {
    userId = existingUser.id
    console.log('using existing pilot user:', userId)
  } else {
    const hash = await hashPassword(crypto.randomBytes(48).toString('hex'))
    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert({ username: 'pilot', password_hash: hash })
      .select('id')
      .single()

    if (userErr || !newUser) {
      console.error('failed to create pilot user:', userErr?.message)
      return
    }
    userId = newUser.id
    console.log('created pilot user:', userId)
  }

  // Check if wallet exists for this user, create if not
  const { data: existingWallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!existingWallet) {
    const encrypted = encryptPrivateKey(PILOT_PRIVATE_KEY)
    const { error: walletErr } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        public_key: PILOT_PUBLIC_KEY,
        encrypted_private_key: encrypted,
      })

    if (walletErr) {
      console.error('failed to create wallet:', walletErr.message)
      return
    }
    console.log('created pilot wallet')
  } else {
    console.log('pilot wallet already exists')
  }

  // Insert the pilot agent
  const { data: agent, error: agentErr } = await supabase
    .from('agents')
    .insert({
      user_id: userId,
      name: 'pilot',
      token_name: 'PILOT',
      token_ca: PILOT_CA,
      persona: 'the pilot platform agent. autonomous operator for $PILOT. runs continuously, executes on-chain strategy, and manages the platform token.',
      status: 'active',
    })
    .select('id')
    .single()

  if (agentErr || !agent) {
    console.error('failed to create agent:', agentErr?.message)
    return
  }

  console.log('created pilot agent:', agent.id)

  // Create stats row
  const { error: statsErr } = await supabase.from('agent_stats').insert({
    agent_id: agent.id,
    total_claimed: 0,
    total_burned: 0,
    total_lp: 0,
  })

  if (statsErr) console.error('failed to create stats:', statsErr.message)
  else console.log('created agent stats')

  console.log('done! pilot agent is live.')
}

main().catch(console.error)
