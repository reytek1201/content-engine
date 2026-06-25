-- Allow ASS caption tracks and word-timing JSON in tts-cache (not just MP3).

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'audio/mpeg',
  'text/plain',
  'application/json'
]
WHERE id = 'tts-cache';
