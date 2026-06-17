import { recordTtsUsage } from "@/utils/tts/record-usage";
import {
  ELEVEN_FLASH_MODEL,
  isTtsError,
  type SynthesizeInput,
  type SynthesizeResult,
  type TtsProvider,
} from "@/utils/tts/types";

function resolveModelId(input: SynthesizeInput) {
  return input.modelId ?? ELEVEN_FLASH_MODEL;
}

export function createMeteredTtsProvider(provider: TtsProvider): TtsProvider {
  return {
    async synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
      const modelId = resolveModelId(input);
      const charCount = input.text.trim().length;
      const startedAt = Date.now();

      try {
        const result = await provider.synthesize(input);

        if (input.usage?.userId) {
          await recordTtsUsage({
            userId: input.usage.userId,
            campaignId: input.usage.campaignId,
            slideId: input.usage.slideId,
            charCount: result.charCount,
            modelId: result.modelId,
            latencyMs: result.latencyMs,
            success: true,
            voiceId: input.voiceId,
          });
        }

        return result;
      } catch (error) {
        if (input.usage?.userId) {
          await recordTtsUsage({
            userId: input.usage.userId,
            campaignId: input.usage.campaignId,
            slideId: input.usage.slideId,
            charCount,
            modelId,
            latencyMs: Date.now() - startedAt,
            success: false,
            voiceId: input.voiceId,
            errorCode: isTtsError(error) ? error.code : "PROVIDER_ERROR",
          });
        }

        throw error;
      }
    },
  };
}
