-- Beta usage metering (slide regenerations; campaigns counted from campaigns table)

CREATE TABLE public.usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('slide_regenerated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX usage_events_user_type_created_idx
  ON public.usage_events (user_id, event_type, created_at DESC);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_events_select_own ON public.usage_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY usage_events_insert_own ON public.usage_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
