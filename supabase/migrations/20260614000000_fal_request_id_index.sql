-- Index for fal webhook lookups: slides.fal_request_id is queried on
-- every incoming webhook callback. Without this it is a sequential scan.
CREATE INDEX IF NOT EXISTS idx_slides_fal_request_id
  ON public.slides (fal_request_id)
  WHERE fal_request_id IS NOT NULL;
