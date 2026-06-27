-- Persist website ingest source URL on campaign creation

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS source_url TEXT;
