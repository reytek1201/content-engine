import { mapElevenLabsError } from "@/utils/tts/map-elevenlabs-error";
import { normalizeVoiceoverScript } from "@/utils/tts/normalize-script";
import {
  alignmentToWordTimings,
  type CharacterAlignment,
} from "@/utils/tts/alignment-to-words";
import {
  ELEVEN_FLASH_MODEL,
  TtsError,
  type SynthesizeInput,
  type SynthesizeResult,
  type TtsModelId,
  type TtsProvider,
} from "@/utils/tts/types";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

interface ElevenLabsTimestampsResponse {
  audio_base64?: string;
  alignment?: CharacterAlignment | null;
  normalized_alignment?: CharacterAlignment | null;
}

export function getElevenLabsApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new TtsError(
      "NOT_CONFIGURED",
      "ELEVENLABS_API_KEY is not configured",
    );
  }
  return apiKey;
}

function resolveModelId(modelId?: TtsModelId): TtsModelId {
  return modelId ?? ELEVEN_FLASH_MODEL;
}

function wordTimingsFromResponse(
  body: ElevenLabsTimestampsResponse,
  normalizedText: string,
) {
  const alignment = body.normalized_alignment ?? body.alignment;
  if (!alignment) {
    return undefined;
  }

  const words = alignmentToWordTimings(alignment, normalizedText);
  return words.length > 0 ? words : undefined;
}

export function createElevenLabsProvider(apiKey = getElevenLabsApiKey()): TtsProvider {
  return {
    async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
      const text = normalizeVoiceoverScript(input.text);
      if (!text) {
        throw new TtsError("INVALID_INPUT", "Text is required for synthesis");
      }

      if (!input.voiceId.trim()) {
        throw new TtsError("INVALID_INPUT", "Voice ID is required for synthesis");
      }

      const modelId = resolveModelId(input.modelId);
      const startedAt = Date.now();
      const endpointSuffix = input.withTimestamps ? "/with-timestamps" : "";
      const endpoint = `${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(input.voiceId)}${endpointSuffix}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: input.withTimestamps ? "application/json" : "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw mapElevenLabsError(response.status, errorBody);
      }

      if (input.withTimestamps) {
        const body = (await response.json()) as ElevenLabsTimestampsResponse;
        if (!body.audio_base64) {
          throw new TtsError(
            "PROVIDER_ERROR",
            "ElevenLabs with-timestamps response did not include audio",
          );
        }

        const wordTimings = wordTimingsFromResponse(body, text);

        return {
          audio: Buffer.from(body.audio_base64, "base64"),
          charCount: text.length,
          modelId,
          latencyMs: Date.now() - startedAt,
          wordTimings,
          timingSource: wordTimings ? "elevenlabs" : undefined,
        };
      }

      const audioBytes = await response.arrayBuffer();

      return {
        audio: Buffer.from(audioBytes),
        charCount: text.length,
        modelId,
        latencyMs: Date.now() - startedAt,
      };
    },
  };
}
