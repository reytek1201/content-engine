import { createElevenLabsProvider } from "@/utils/tts/elevenlabs";
import { createMeteredTtsProvider } from "@/utils/tts/metered-provider";
import type { TtsProvider } from "@/utils/tts/types";

let cachedProvider: TtsProvider | null = null;

/**
 * Returns the configured server-side TTS provider with usage metering.
 * API keys are read from environment variables and never exposed to the client.
 */
export function getTtsProvider(): TtsProvider {
  if (!cachedProvider) {
    cachedProvider = createMeteredTtsProvider(createElevenLabsProvider());
  }
  return cachedProvider;
}

/** Clears the cached provider (useful in tests). */
export function resetTtsProviderCache(): void {
  cachedProvider = null;
}
