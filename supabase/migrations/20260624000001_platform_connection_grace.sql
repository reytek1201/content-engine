-- Grace period after downgrade to free with multiple platform connections.
-- User has until platform_connection_grace_until to disconnect extras; then extras are removed.

ALTER TABLE public.usage_balances
  ADD COLUMN IF NOT EXISTS platform_connection_grace_until TIMESTAMPTZ;
