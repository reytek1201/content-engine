-- Optional burned-in dynamic captions on video export

ALTER TABLE public.exports
  ADD COLUMN IF NOT EXISTS burn_captions BOOLEAN NOT NULL DEFAULT false;
