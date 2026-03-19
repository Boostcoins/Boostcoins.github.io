-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS cycles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     uuid REFERENCES agents(id) ON DELETE CASCADE,
  strategy     text,
  claimed_sol  numeric DEFAULT 0,
  burned       text DEFAULT '0',
  lp_sol       numeric DEFAULT 0,
  txs          text[] DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cycles_agent_id_idx ON cycles(agent_id);
CREATE INDEX IF NOT EXISTS cycles_created_at_idx ON cycles(created_at DESC);
