-- Phase 2: brand voice persona + TTS preview usage events

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS preferred_voice_persona TEXT
  CHECK (
    preferred_voice_persona IS NULL
    OR preferred_voice_persona IN ('warm', 'energetic', 'professional')
  );

ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (
    event_type IN (
      'slide_regenerated',
      'campaign_created',
      'tts_characters',
      'tts_preview'
    )
  );
