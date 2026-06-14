-- Remove the client-side INSERT policy on usage_events.
-- All inserts now go through the service-role API route (recordSlideRegeneration),
-- which bypasses RLS. Authenticated browser clients can only SELECT their own rows.
DROP POLICY IF EXISTS usage_events_insert_own ON public.usage_events;
