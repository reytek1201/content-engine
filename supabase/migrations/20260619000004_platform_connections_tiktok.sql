-- Allow TikTok in platform_connections (TikTok Phase 0)

ALTER TABLE public.platform_connections
  DROP CONSTRAINT platform_connections_platform_check;

ALTER TABLE public.platform_connections
  ADD CONSTRAINT platform_connections_platform_check
  CHECK (platform IN ('youtube', 'tiktok'));
