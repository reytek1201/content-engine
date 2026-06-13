-- Configurable slide count per campaign (3, 5, or 7)

ALTER TABLE public.campaigns
  ADD COLUMN slide_count INTEGER NOT NULL DEFAULT 5;

ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_slide_count_range
  CHECK (slide_count >= 3 AND slide_count <= 7);
