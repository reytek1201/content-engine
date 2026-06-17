export {
  ELEVEN_FLASH_MODEL,
  ELEVEN_STUDIO_MODEL,
  TtsError,
  isTtsError,
  type SynthesizeInput,
  type SynthesizeResult,
  type TtsModelId,
  type TtsProvider,
  type TtsUsageContext,
  type TtsUsageMetadata,
} from "@/utils/tts/types";

export { mapElevenLabsError } from "@/utils/tts/map-elevenlabs-error";

export {
  VOICE_PERSONAS,
  getVoiceCatalog,
  getVoiceIdForPersona,
  isVoiceCatalogConfigured,
  resolveVoicePersona,
  resetVoiceCatalogCache,
  type VoiceCatalogEntry,
  type VoicePersona,
} from "@/utils/tts/voice-catalog";

export { resolveCampaignVoicePersona } from "@/utils/tts/resolve-campaign-persona";

export {
  TTS_USAGE_EVENT_TYPE,
  getTtsCharactersUsedThisMonth,
  recordTtsUsage,
} from "@/utils/tts/record-usage";

export {
  ESTIMATED_CHARS_PER_5_SLIDE_CAMPAIGN,
  estimateFiveSlideCampaignTtsCostUsd,
  estimateTtsCostUsd,
  getTtsUsdPerThousandChars,
} from "@/utils/tts/cogs";

export {
  TTS_EXPORT_DISCLOSURE,
  TTS_EXPORT_SUCCESS_DISCLOSURE,
  TTS_PREVIEW_DISCLOSURE,
} from "@/utils/tts/disclosure-copy";

export { normalizeVoiceoverScript } from "@/utils/tts/normalize-script";

export {
  buildNarrationZip,
  getNarrationZipFilename,
  synthesizeCampaignNarration,
  type CampaignNarrationSlide,
} from "@/utils/tts/synthesize-campaign-narration";

export {
  canAuditCampaign,
  getTtsAuditAdminUserIds,
  isTtsAuditRouteEnabled,
} from "@/utils/tts/audit-access";

export { getTtsProvider, resetTtsProviderCache } from "@/utils/tts/provider";
