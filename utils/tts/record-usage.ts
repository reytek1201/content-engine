import type { TtsUsageMetadata } from "@/utils/tts/types";
import { getStartOfMonth } from "@/utils/usage-limits";
import { createAdminClient } from "@/utils/supabase/admin";

export const TTS_USAGE_EVENT_TYPE = "tts_characters" as const;

export interface RecordTtsUsageInput extends TtsUsageMetadata {
  userId: string;
}

export async function recordTtsUsage(input: RecordTtsUsageInput): Promise<void> {
  const supabase = createAdminClient();
  const metadata: TtsUsageMetadata = {
    campaignId: input.campaignId,
    slideId: input.slideId,
    charCount: input.charCount,
    modelId: input.modelId,
    latencyMs: input.latencyMs,
    success: input.success,
    voiceId: input.voiceId,
    errorCode: input.errorCode,
  };

  const { error } = await supabase.from("usage_events").insert({
    user_id: input.userId,
    event_type: TTS_USAGE_EVENT_TYPE,
    metadata,
  });

  if (error) {
    throw new Error("Failed to record TTS usage");
  }
}

export async function getTtsCharactersUsedThisMonth(userId: string): Promise<number> {
  const supabase = createAdminClient();
  const startOfMonth = getStartOfMonth();

  const { data, error } = await supabase
    .from("usage_events")
    .select("metadata")
    .eq("user_id", userId)
    .eq("event_type", TTS_USAGE_EVENT_TYPE)
    .gte("created_at", startOfMonth.toISOString());

  if (error) {
    throw new Error("Failed to load TTS usage");
  }

  return (data ?? []).reduce((total, row) => {
    const metadata = row.metadata as TtsUsageMetadata | null;
    if (!metadata || metadata.success === false) {
      return total;
    }
    return total + (metadata.charCount ?? 0);
  }, 0);
}
