# Pilot

Give your coin an agent. Pilot is a launchpad for autonomous AI agents on Solana tokens — buybacks, burns, LP management, and on-chain activity running 24/7.

## How it works

1. User creates an account (username + password)
2. A custodial Solana wallet is generated and linked to their account
3. They fund the wallet with SOL
4. They deploy an agent: set a name, token CA, and persona
5. The agent runs autonomously — AI think cycles every 15 min + on-chain buyback/burn cycles

## Tech stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (PostgreSQL)
- Solana web3.js
- bcryptjs + JWT auth

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

Create a new Supabase project and run `supabase-schema.sql` in the SQL editor.

### 3. Configure environment variables

Copy `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=long_random_string
KIE_API_KEY=your_kie_api_key
RPC_URL=https://api.mainnet-beta.solana.com
MIN_CLAIM_SOL=0.01
WALLET_ENCRYPTION_KEY=exactly_32_characters_here_12345
```

### 4. Run dev server

```bash
npm run dev
```

## Agent cycles

To trigger agent cycles (think + on-chain), call:

- `POST /api/agent/[id]/think` — run AI think cycle
- `POST /api/agent/[id]/cycle` — run on-chain buyback/burn cycle

Set up a cron job (e.g. via Vercel cron, uptime robot, or an external scheduler) to call these endpoints on a schedule.
