-- Phase 1 billing: per-user credit balances + atomic decrement + tier entitlement.
-- Replaces env-var-based BETA_* limits for campaigns, regenerations, video, TTS preview, and audio export.

-- ─── Tier enum ───────────────────────────────────────────────────────────────

CREATE TYPE public.app_tier AS ENUM ('free', 'creator', 'agency');

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE public.usage_balances (
  user_id                         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                            public.app_tier NOT NULL DEFAULT 'free',

  -- Credit counters (never go below 0 — enforced by CHECK + consume_credit)
  campaign_credits_remaining      INTEGER NOT NULL DEFAULT 3  CHECK (campaign_credits_remaining     >= 0),
  regeneration_credits_remaining  INTEGER NOT NULL DEFAULT 10 CHECK (regeneration_credits_remaining >= 0),
  video_credits_remaining         INTEGER NOT NULL DEFAULT 0  CHECK (video_credits_remaining        >= 0),
  tts_preview_credits_remaining   INTEGER NOT NULL DEFAULT 5  CHECK (tts_preview_credits_remaining  >= 0),
  audio_export_credits_remaining  INTEGER NOT NULL DEFAULT 0  CHECK (audio_export_credits_remaining >= 0),

  -- Billing metadata (populated by Stripe / RevenueCat webhooks in Sprint B+)
  stripe_customer_id              TEXT,
  stripe_subscription_id          TEXT,
  revenuecat_app_user_id          TEXT,
  current_period_start            TIMESTAMPTZ,
  current_period_end              TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER usage_balances_set_updated_at
  BEFORE UPDATE ON public.usage_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.usage_balances ENABLE ROW LEVEL SECURITY;

-- Users can read their own row (for Settings → Usage page).
CREATE POLICY usage_balances_select_own ON public.usage_balances
  FOR SELECT USING (auth.uid() = user_id);

-- No client-side INSERT or UPDATE. All writes go through service-role / SQL functions below.

-- ─── consume_credit() ─────────────────────────────────────────────────────────
-- Atomically decrements one credit of the given type.
-- Raises 'credit_exhausted' if the balance is already 0 (handles race conditions).
-- Called via admin RPC after the application-level assert passes.

CREATE OR REPLACE FUNCTION public.consume_credit(
  p_user_id  UUID,
  p_credit   TEXT  -- 'campaign' | 'regeneration' | 'video' | 'tts_preview' | 'audio_export'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usage_balances
  SET
    campaign_credits_remaining     = campaign_credits_remaining     - CASE WHEN p_credit = 'campaign'     THEN 1 ELSE 0 END,
    regeneration_credits_remaining = regeneration_credits_remaining - CASE WHEN p_credit = 'regeneration' THEN 1 ELSE 0 END,
    video_credits_remaining        = video_credits_remaining        - CASE WHEN p_credit = 'video'        THEN 1 ELSE 0 END,
    tts_preview_credits_remaining  = tts_preview_credits_remaining  - CASE WHEN p_credit = 'tts_preview'  THEN 1 ELSE 0 END,
    audio_export_credits_remaining = audio_export_credits_remaining - CASE WHEN p_credit = 'audio_export' THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE
    user_id = p_user_id
    AND (
        (p_credit = 'campaign'     AND campaign_credits_remaining     > 0)
     OR (p_credit = 'regeneration' AND regeneration_credits_remaining > 0)
     OR (p_credit = 'video'        AND video_credits_remaining        > 0)
     OR (p_credit = 'tts_preview'  AND tts_preview_credits_remaining  > 0)
     OR (p_credit = 'audio_export' AND audio_export_credits_remaining > 0)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit_exhausted' USING HINT = p_credit;
  END IF;
END;
$$;

-- ─── apply_tier_entitlement() ─────────────────────────────────────────────────
-- Hard-resets all credit counters to the tier caps.
-- Called by Stripe / RevenueCat webhooks on upgrade, renewal, or cancel.

CREATE OR REPLACE FUNCTION public.apply_tier_entitlement(
  p_user_id    UUID,
  p_tier       TEXT,               -- 'free' | 'creator' | 'agency'
  p_period_end TIMESTAMPTZ DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.usage_balances
  SET
    tier                            = p_tier::public.app_tier,
    campaign_credits_remaining      = CASE p_tier WHEN 'creator' THEN 15 WHEN 'agency' THEN 50  ELSE 3  END,
    regeneration_credits_remaining  = CASE p_tier WHEN 'creator' THEN 30 WHEN 'agency' THEN 100 ELSE 10 END,
    video_credits_remaining         = CASE p_tier WHEN 'creator' THEN 5  WHEN 'agency' THEN 15  ELSE 0  END,
    tts_preview_credits_remaining   = CASE p_tier WHEN 'creator' THEN 30 WHEN 'agency' THEN 60  ELSE 5  END,
    audio_export_credits_remaining  = CASE p_tier WHEN 'creator' THEN 5  WHEN 'agency' THEN 15  ELSE 0  END,
    current_period_start            = CASE WHEN p_tier = 'free' THEN NULL ELSE NOW() END,
    current_period_end              = p_period_end,
    updated_at                      = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING HINT = p_user_id::TEXT;
  END IF;
END;
$$;

-- ─── Signup trigger ───────────────────────────────────────────────────────────
-- Auto-provisions a free-tier row for every new user.

CREATE OR REPLACE FUNCTION public.handle_new_user_usage_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_balances (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_usage_balance
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_usage_balance();

-- ─── Backfill existing users ─────────────────────────────────────────────────
-- Inserts a free-tier row for any existing user without one.
-- Credits start at the free-tier defaults regardless of prior usage (no beta backfill needed).

INSERT INTO public.usage_balances (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
