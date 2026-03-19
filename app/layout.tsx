import type { Metadata } from 'next'
import { Geist_Mono } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'give your coin a pilot',
  description: 'Launch an autonomous AI agent for your Solana token. Buybacks, burns, and on-chain activity — running 24/7.',
  icons: {
    icon: '/favicon.svg',
  },
}

async function getUsername(): Promise<string | undefined> {
  try {
    const session = await getSession()
    if (!session) return undefined
    const { data } = await supabaseAdmin
      .from('users')
      .select('username')
      .eq('id', session.userId)
      .single()
    return data?.username ?? undefined
  } catch {
    return undefined
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const username = await getUsername()

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        <Navbar username={username} />
        {children}
      </body>
    </html>
  )
}
