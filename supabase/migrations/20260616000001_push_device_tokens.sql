-- Push device tokens for native app notifications (Phase 5.6)

CREATE TABLE public.push_device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX push_device_tokens_user_id_idx
  ON public.push_device_tokens(user_id);

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_device_tokens_select_own ON public.push_device_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY push_device_tokens_insert_own ON public.push_device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_device_tokens_update_own ON public.push_device_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_device_tokens_delete_own ON public.push_device_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS images_ready_notified_at timestamptz;
