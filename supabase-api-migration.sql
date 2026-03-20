-- Run this in Supabase Dashboard → SQL Editor

-- API keys for authenticated API access
CREATE TABLE IF NOT EXISTS api_keys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  key_hash    text NOT NULL,
  key_prefix  text NOT NULL,
  name        text NOT NULL DEFAULT 'default',
  created_at  timestamptz DEFAULT now(),
  last_used   timestamptz,
  revoked     boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);

-- Webhooks for real-time event notifications
CREATE TABLE IF NOT EXISTS webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  url         text NOT NULL,
  secret      text NOT NULL,
  events      text[] DEFAULT '{cycle,think,burn,deploy}',
  agent_id    uuid REFERENCES agents(id) ON DELETE CASCADE,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  last_fired  timestamptz,
  fail_count  integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS webhooks_user_id_idx ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS webhooks_agent_id_idx ON webhooks(agent_id);
