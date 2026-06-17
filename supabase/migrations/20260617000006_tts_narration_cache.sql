-- Phase 4: persistent TTS narration cache (audio + video export reuse)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-cache',
  'tts-cache',
  false,
  10485760,
  ARRAY['audio/mpeg']
)
ON CONFLICT (id) DO NOTHING;
