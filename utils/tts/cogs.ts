import { ELEVEN_FLASH_MODEL, type TtsModelId } from "@/utils/tts/types";

/** Rough average characters across 5 voiceover scripts (beta planning estimate). */
export const ESTIMATED_CHARS_PER_5_SLIDE_CAMPAIGN = 500;

/**
 * ElevenLabs Flash list price is ~$0.10 / 1k characters on Creator.
 * Override via ELEVENLABS_USD_PER_1K_CHARS for internal COGS tracking.
 */
export function getTtsUsdPerThousandChars(modelId: TtsModelId = ELEVEN_FLASH_MODEL): number {
  void modelId;

  const configured = parseFloat(process.env.ELEVENLABS_USD_PER_1K_CHARS ?? "0.10");
  return Number.isFinite(configured) ? configured : 0.1;
}

export function estimateTtsCostUsd(
  charCount: number,
  modelId: TtsModelId = ELEVEN_FLASH_MODEL,
): number {
  const rate = getTtsUsdPerThousandChars(modelId);
  return (charCount / 1000) * rate;
}

export function estimateFiveSlideCampaignTtsCostUsd(): number {
  return estimateTtsCostUsd(ESTIMATED_CHARS_PER_5_SLIDE_CAMPAIGN);
}
