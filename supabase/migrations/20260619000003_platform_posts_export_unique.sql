-- Prevent duplicate YouTube uploads for the same campaign export.
-- Dedupe any rows created before this guard shipped (e.g. repeated test publishes).

DELETE FROM public.platform_posts
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY campaign_id, export_id
        ORDER BY
          (external_id IS NOT NULL) DESC,
          (external_url IS NOT NULL) DESC,
          created_at ASC
      ) AS rn
    FROM public.platform_posts
    WHERE export_id IS NOT NULL
      AND status IN ('pending', 'uploading', 'processing', 'published')
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX platform_posts_campaign_export_active_idx
  ON public.platform_posts (campaign_id, export_id)
  WHERE export_id IS NOT NULL
    AND status IN ('pending', 'uploading', 'processing', 'published');
