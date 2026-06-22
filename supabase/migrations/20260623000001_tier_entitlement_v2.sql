-- v2 tier caps: Creator 10/20/10, Agency 30/60/20 (campaigns / regens / videos).
-- Must stay in sync with utils/plan-limits.ts PLAN_LIMITS.

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
    campaign_credits_remaining      = CASE p_tier WHEN 'creator' THEN 10 WHEN 'agency' THEN 30 ELSE 3  END,
    regeneration_credits_remaining  = CASE p_tier WHEN 'creator' THEN 20 WHEN 'agency' THEN 60 ELSE 10 END,
    video_credits_remaining         = CASE p_tier WHEN 'creator' THEN 10 WHEN 'agency' THEN 20 ELSE 0  END,
    tts_preview_credits_remaining   = CASE p_tier WHEN 'creator' THEN 30 WHEN 'agency' THEN 60 ELSE 5  END,
    audio_export_credits_remaining  = CASE p_tier WHEN 'creator' THEN 5  WHEN 'agency' THEN 15 ELSE 0  END,
    current_period_start            = CASE WHEN p_tier = 'free' THEN NULL ELSE NOW() END,
    current_period_end              = p_period_end,
    updated_at                      = NOW()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING HINT = p_user_id::TEXT;
  END IF;
END;
$$;
