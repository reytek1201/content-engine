-- Brand workspaces (Phase 6a): multiple brands per user, campaigns scoped to brand

CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_reference_url TEXT,
  style_reference_url TEXT,
  logo_reference_url TEXT,
  voice_notes TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX brands_one_default_per_user
  ON public.brands (user_id)
  WHERE is_default = true;

CREATE INDEX brands_user_id_idx ON public.brands(user_id);

CREATE TRIGGER brands_set_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.brand_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  product_reference_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX brand_products_brand_id_idx ON public.brand_products(brand_id);

CREATE TRIGGER brand_products_set_updated_at
  BEFORE UPDATE ON public.brand_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.campaigns
  ADD COLUMN brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN brand_product_id UUID REFERENCES public.brand_products(id) ON DELETE SET NULL;

CREATE INDEX campaigns_brand_id_idx ON public.campaigns(brand_id);

-- Migrate existing brand library rows into default brands
INSERT INTO public.brands (
  user_id,
  name,
  product_reference_url,
  style_reference_url,
  logo_reference_url,
  is_default
)
SELECT
  user_id,
  'My brand',
  product_reference_url,
  style_reference_url,
  logo_reference_url,
  true
FROM public.brand_library;

-- Default brand for users without a library row
INSERT INTO public.brands (user_id, name, is_default)
SELECT u.id, 'My brand', true
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.brands b WHERE b.user_id = u.id
);

-- Attach existing campaigns to each user's default brand
UPDATE public.campaigns c
SET brand_id = b.id
FROM public.brands b
WHERE b.user_id = c.user_id
  AND b.is_default = true
  AND c.brand_id IS NULL;

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY brands_select_own ON public.brands
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY brands_insert_own ON public.brands
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY brands_update_own ON public.brands
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY brands_delete_own ON public.brands
  FOR DELETE
  USING (auth.uid() = user_id AND is_default = false);

CREATE POLICY brand_products_select_own ON public.brand_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = brand_products.brand_id
        AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY brand_products_insert_own ON public.brand_products
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = brand_products.brand_id
        AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY brand_products_update_own ON public.brand_products
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = brand_products.brand_id
        AND brands.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = brand_products.brand_id
        AND brands.user_id = auth.uid()
    )
  );

CREATE POLICY brand_products_delete_own ON public.brand_products
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.brands
      WHERE brands.id = brand_products.brand_id
        AND brands.user_id = auth.uid()
    )
  );
