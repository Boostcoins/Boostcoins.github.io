-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add per-agent wallet columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS wallet_public_key text;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS wallet_encrypted_pk text;

-- 2. Migrate existing agents: copy wallet from user's wallet to their agents
UPDATE agents a
SET
  wallet_public_key   = w.public_key,
  wallet_encrypted_pk = w.encrypted_private_key
FROM wallets w
WHERE w.user_id = a.user_id;
