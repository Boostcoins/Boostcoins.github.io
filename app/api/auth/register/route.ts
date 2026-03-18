import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hashPassword, signToken } from '@/lib/auth'
import { generateWallet } from '@/lib/wallet'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'username and password required' }, { status: 400 })
    }

    const clean = username.toLowerCase().trim()
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      return NextResponse.json(
        { error: 'username must be 3-20 characters, letters/numbers/underscore only' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', clean)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'username already taken' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const { publicKey, encryptedPrivateKey } = generateWallet()

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({ username: clean, password_hash: passwordHash })
      .select('id')
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'failed to create account' }, { status: 500 })
    }

    await supabaseAdmin.from('wallets').insert({
      user_id: user.id,
      public_key: publicKey,
      encrypted_private_key: encryptedPrivateKey,
    })

    const token = signToken(user.id)
    const cookieStore = await cookies()
    cookieStore.set('pilot_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return NextResponse.json({ success: true, userId: user.id })
  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500 })
  }
}
