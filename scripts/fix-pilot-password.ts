import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '../lib/auth'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  const newPass = crypto.randomBytes(48).toString('hex')
  const hash = await hashPassword(newPass)
  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash })
    .eq('username', 'pilot')

  if (error) {
    console.log('error:', error.message)
  } else {
    console.log('pilot password changed to random 96-char hex — login disabled')
  }
}

main()
