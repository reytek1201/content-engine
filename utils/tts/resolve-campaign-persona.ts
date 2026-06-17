import type { SupabaseClient } from "@supabase/supabase-js";
import type { VoicePersona } from "@/utils/tts/voice-catalog";

export async function resolveCampaignVoicePersona(
  supabase: SupabaseClient,
  campaignBrandId: string | null,
  userId: string,
  override?: VoicePersona,
): Promise<VoicePersona> {
  if (override) {
    return override;
  }

  if (!campaignBrandId) {
    return "warm";
  }

  const { data: brand } = await supabase
    .from("brands")
    .select("preferred_voice_persona")
    .eq("id", campaignBrandId)
    .eq("user_id", userId)
    .maybeSingle();

  const persona = brand?.preferred_voice_persona;
  if (persona === "warm" || persona === "energetic" || persona === "professional") {
    return persona;
  }

  return "warm";
}
