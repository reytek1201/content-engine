-- Platform-specific publish captions

CREATE TYPE platform_type AS ENUM (
  'tiktok',
  'instagram',
  'youtube_shorts'
);

CREATE TABLE public.platform_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  platform platform_type NOT NULL,
  hook TEXT,
  caption TEXT NOT NULL,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_captions_campaign_platform_unique UNIQUE (campaign_id, platform)
);

CREATE INDEX idx_platform_captions_campaign_id ON public.platform_captions(campaign_id);

CREATE TRIGGER platform_captions_set_updated_at
  BEFORE UPDATE ON public.platform_captions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.platform_captions ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_captions_select_own ON public.platform_captions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = platform_captions.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY platform_captions_insert_own ON public.platform_captions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = platform_captions.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY platform_captions_update_own ON public.platform_captions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = platform_captions.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = platform_captions.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY platform_captions_delete_own ON public.platform_captions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns
      WHERE campaigns.id = platform_captions.campaign_id
        AND campaigns.user_id = auth.uid()
    )
  );
