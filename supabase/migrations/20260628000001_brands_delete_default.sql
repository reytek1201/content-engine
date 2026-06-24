-- Allow users to delete any owned brand, including the default workspace.

DROP POLICY IF EXISTS brands_delete_own ON public.brands;

CREATE POLICY brands_delete_own ON public.brands
  FOR DELETE
  USING (auth.uid() = user_id);
