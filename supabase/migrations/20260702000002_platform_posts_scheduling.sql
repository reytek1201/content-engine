-- Scheduled publishing: columns and indexes (run after enum migration commits).

CREATE TYPE platform_post_schedule_status AS ENUM ('pending', 'posted', 'failed');

ALTER TABLE public.platform_posts
  ADD COLUMN scheduled_for timestamptz,
  ADD COLUMN schedule_status platform_post_schedule_status,
  ADD COLUMN failure_reason text,
  ADD COLUMN publish_settings jsonb;

-- Extend active-row uniqueness to include 'scheduled' so you can't
-- schedule AND post-now the same export simultaneously.
DROP INDEX IF EXISTS platform_posts_campaign_export_platform_active_idx;
CREATE UNIQUE INDEX platform_posts_campaign_export_platform_active_idx
  ON public.platform_posts (campaign_id, export_id, platform)
  WHERE export_id IS NOT NULL
    AND status IN ('scheduled', 'pending', 'uploading', 'processing', 'published');

DROP INDEX IF EXISTS platform_posts_campaign_carousel_active_idx;
CREATE UNIQUE INDEX platform_posts_campaign_carousel_active_idx
  ON public.platform_posts (campaign_id, platform)
  WHERE export_id IS NULL
    AND platform = 'instagram'
    AND status IN ('scheduled', 'pending', 'uploading', 'processing', 'published');

-- Efficient cron query index
CREATE INDEX platform_posts_due_schedule_idx
  ON public.platform_posts (scheduled_for)
  WHERE schedule_status = 'pending' AND status = 'scheduled';
