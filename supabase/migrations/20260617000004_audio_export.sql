-- Phase 3: narration audio export tracking + usage events

ALTER TYPE export_type_enum ADD VALUE IF NOT EXISTS 'audio';

ALTER TABLE public.usage_events
  DROP CONSTRAINT IF EXISTS usage_events_event_type_check;

ALTER TABLE public.usage_events
  ADD CONSTRAINT usage_events_event_type_check
  CHECK (
    event_type IN (
      'slide_regenerated',
      'campaign_created',
      'tts_characters',
      'tts_preview',
      'tts_export'
    )
  );
