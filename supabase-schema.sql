-- Pilot — Supabase schema
-- Run this in your Supabase SQL editor

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  public_key text not null,
  encrypted_private_key text not null,
  created_at timestamptz default now()
);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  token_name text not null,
  token_ca text not null,
  persona text not null,
  status text default 'active' check (status in ('active', 'paused', 'stopped')),
  mood text,
  last_think timestamptz,
  image_url text,
  twitter text,
  telegram text,
  website text,
  wallet_public_key text,
  wallet_encrypted_pk text,
  created_at timestamptz default now()
);

create table if not exists agent_stats (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade not null unique,
  total_claimed numeric default 0,
  total_burned numeric default 0,
  total_lp numeric default 0,
  last_cycle timestamptz,
  last_strategy text,
  created_at timestamptz default now()
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade not null,
  title text not null,
  body text not null,
  mood text,
  created_at timestamptz default now()
);

create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists inputs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id) on delete cascade not null,
  content text not null,
  ip text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_agents_user_id on agents(user_id);
create index if not exists idx_agents_status on agents(status);
create index if not exists idx_logs_agent_id on logs(agent_id);
create index if not exists idx_memories_agent_id on memories(agent_id);
create index if not exists idx_inputs_agent_id on inputs(agent_id);
create index if not exists idx_inputs_ip_agent on inputs(agent_id, ip, created_at);
create index if not exists idx_wallets_user_id on wallets(user_id);

-- Row Level Security
alter table users enable row level security;
alter table wallets enable row level security;
alter table agents enable row level security;
alter table agent_stats enable row level security;
alter table logs enable row level security;
alter table memories enable row level security;
alter table inputs enable row level security;

-- Service role bypasses RLS (used by server-side code)
-- Anon can read public agent data
create policy "public agents readable" on agents for select using (status = 'active');
create policy "public logs readable" on logs for select using (true);
create policy "public memories readable" on memories for select using (true);
create policy "public stats readable" on agent_stats for select using (true);
create policy "public inputs readable" on inputs for select using (true);
create policy "public inputs insertable" on inputs for insert with check (true);
