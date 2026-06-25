export const ELEVEN_FLASH_MODEL = "eleven_flash_v2_5" as const;

/** Reserved for Phase 5 studio-quality voice toggle. */
export const ELEVEN_STUDIO_MODEL = "eleven_multilingual_v2" as const;

export type TtsModelId = typeof ELEVEN_FLASH_MODEL | typeof ELEVEN_STUDIO_MODEL;

export type VoiceQuality = "standard" | "studio";

export function resolveTtsModelId(quality: VoiceQuality = "standard"): TtsModelId {
  return quality === "studio" ? ELEVEN_STUDIO_MODEL : ELEVEN_FLASH_MODEL;
}

export type TtsErrorCode =
  | "INVALID_INPUT"
  | "INVALID_VOICE"
  | "RATE_LIMITED"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_ERROR"
  | "NOT_CONFIGURED";

export class TtsError extends Error {
  readonly code: TtsErrorCode;
  readonly statusCode?: number;

  constructor(code: TtsErrorCode, message: string, statusCode?: number) {
    super(message);
    this.name = "TtsError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isTtsError(error: unknown): error is TtsError {
  return error instanceof TtsError;
}

export interface TtsUsageContext {
  userId: string;
  campaignId?: string;
  slideId?: string;
}

export interface TtsUsageMetadata {
  campaignId?: string;
  slideId?: string;
  charCount: number;
  modelId: TtsModelId;
  latencyMs: number;
  success: boolean;
  voiceId?: string;
  errorCode?: TtsErrorCode;
}

export interface WordTiming {
  word: string;
  startSeconds: number;
  endSeconds: number;
}

export type WordTimingSource = "elevenlabs" | "estimated";

export interface CachedWordTimings {
  source: WordTimingSource;
  words: WordTiming[];
}

export interface SynthesizeInput {
  text: string;
  voiceId: string;
  modelId?: TtsModelId;
  /** Request character alignment from ElevenLabs (with-timestamps endpoint). */
  withTimestamps?: boolean;
  /** When set, synthesis is metered to usage_events for this user. */
  usage?: TtsUsageContext;
}

export interface SynthesizeResult {
  audio: Buffer;
  charCount: number;
  modelId: TtsModelId;
  latencyMs: number;
  wordTimings?: WordTiming[];
  timingSource?: WordTimingSource;
}

export interface TtsProvider {
  synthesize(input: SynthesizeInput): Promise<SynthesizeResult>;
}
