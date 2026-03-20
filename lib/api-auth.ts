import crypto from 'crypto'
import { supabaseAdmin } from './supabase'

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `pk_${crypto.randomBytes(32).toString('hex')}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const prefix = key.slice(0, 10)
  return { key, hash, prefix }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export async function validateApiKey(authHeader: string | null): Promise<{ userId: string } | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const key = authHeader.slice(7)
  if (!key.startsWith('pk_')) return null

  const hash = hashApiKey(key)
  const { data } = await supabaseAdmin
    .from('api_keys')
    .select('id, user_id, revoked')
    .eq('key_hash', hash)
    .single()

  if (!data || data.revoked) return null

  supabaseAdmin
    .from('api_keys')
    .update({ last_used: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return { userId: data.user_id }
}
