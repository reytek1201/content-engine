-- Scheduled publishing: add 'scheduled' to platform_post_status enum.
-- Must be in its own migration — PostgreSQL requires the new enum value to be
-- committed before it can be referenced in indexes or constraints.

ALTER TYPE platform_post_status ADD VALUE IF NOT EXISTS 'scheduled';
