-- TTS usage metering: per-synthesis events with structured metadata.

ALTER TABLE public.usage_events
  ADD COLUMN IF NOT EXISTS metadata JSONB;

ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (
    event_type IN (
      'slide_regenerated',
      'campaign_created',
      'tts_characters'
    )
  );

CREATE INDEX IF NOT EXISTS usage_events_tts_user_created_idx
  ON public.usage_events (user_id, created_at DESC)
  WHERE event_type = 'tts_characters';
