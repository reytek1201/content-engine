-- Allow Instagram in platform_connections (Instagram Phase 2 — OAuth)

ALTER TABLE public.platform_connections
  DROP CONSTRAINT platform_connections_platform_check;

ALTER TABLE public.platform_connections
  ADD CONSTRAINT platform_connections_platform_check
  CHECK (platform IN ('youtube', 'tiktok', 'instagram'));
