-- Free tier: lifetime caps → monthly non-accumulating allotments (2 / 4 / 4).
-- Must stay in sync with utils/plan-limits.ts PLAN_LIMITS.

CREATE OR REPLACE FUNCTION public.free_tier_period_end()
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT (
    date_trunc('month', now() AT TIME ZONE 'utc') + interval '1 month'
  ) AT TIME ZONE 'utc';
$$;

CREATE OR REPLACE FUNCTION public.apply_tier_entitlement(
  p_user_id    UUID,
  p_tier       TEXT,
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
    campaign_credits_remaining      = CASE p_tier WHEN 'creator' THEN 10 WHEN 'agency' THEN 30 ELSE 2  END,
    regeneration_credits_remaining  = CASE p_tier WHEN 'creator' THEN 20 WHEN 'agency' THEN 60 ELSE 4  END,
    video_credits_remaining         = CASE p_tier WHEN 'creator' THEN 10 WHEN 'agency' THEN 20 ELSE 0  END,
    tts_preview_credits_remaining   = CASE p_tier WHEN 'creator' THEN 30 WHEN 'agency' THEN 60 ELSE 4  END,
    audio_export_credits_remaining  = CASE p_tier WHEN 'creator' THEN 5  WHEN 'agency' THEN 15 ELSE 0  END,
    current_period_start            = NOW(),
    current_period_end              = CASE
      WHEN p_tier = 'free' THEN COALESCE(p_period_end, public.free_tier_period_end())
      ELSE p_period_end
    END,
    updated_at                      = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING HINT = p_user_id::TEXT;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_credit(
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
    campaign_credits_remaining = LEAST(
      campaign_credits_remaining + CASE WHEN p_credit = 'campaign' THEN 1 ELSE 0 END,
      CASE tier WHEN 'creator' THEN 10 WHEN 'agency' THEN 30 ELSE 2 END
    ),
    regeneration_credits_remaining = LEAST(
      regeneration_credits_remaining + CASE WHEN p_credit = 'regeneration' THEN 1 ELSE 0 END,
      CASE tier WHEN 'creator' THEN 20 WHEN 'agency' THEN 60 ELSE 4 END
    ),
    video_credits_remaining = LEAST(
      video_credits_remaining + CASE WHEN p_credit = 'video' THEN 1 ELSE 0 END,
      CASE tier WHEN 'creator' THEN 10 WHEN 'agency' THEN 20 ELSE 0 END
    ),
    tts_preview_credits_remaining = LEAST(
      tts_preview_credits_remaining + CASE WHEN p_credit = 'tts_preview' THEN 1 ELSE 0 END,
      CASE tier WHEN 'creator' THEN 30 WHEN 'agency' THEN 60 ELSE 4 END
    ),
    audio_export_credits_remaining = LEAST(
      audio_export_credits_remaining + CASE WHEN p_credit = 'audio_export' THEN 1 ELSE 0 END,
      CASE tier WHEN 'creator' THEN 5 WHEN 'agency' THEN 15 ELSE 0 END
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING HINT = p_user_id::TEXT;
  END IF;
END;
$$;

ALTER TABLE public.usage_balances
  ALTER COLUMN campaign_credits_remaining SET DEFAULT 2,
  ALTER COLUMN regeneration_credits_remaining SET DEFAULT 4,
  ALTER COLUMN tts_preview_credits_remaining SET DEFAULT 4;

CREATE OR REPLACE FUNCTION public.handle_new_user_usage_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usage_balances (
    user_id,
    campaign_credits_remaining,
    regeneration_credits_remaining,
    tts_preview_credits_remaining,
    current_period_start,
    current_period_end
  )
  VALUES (
    NEW.id,
    2,
    4,
    4,
    NOW(),
    public.free_tier_period_end()
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Existing free users: full new monthly caps + period tracking (no proration).
UPDATE public.usage_balances
SET
  campaign_credits_remaining     = 2,
  regeneration_credits_remaining = 4,
  tts_preview_credits_remaining  = 4,
  current_period_start           = NOW(),
  current_period_end             = public.free_tier_period_end(),
  updated_at                     = NOW()
WHERE tier = 'free';
