import { TtsError, type TtsErrorCode } from "@/utils/tts/types";

export function mapElevenLabsError(
  status: number,
  body: string,
): TtsError {
  const code = resolveErrorCode(status, body);
  const message = resolveErrorMessage(code, status, body);

  return new TtsError(code, message, status);
}

function resolveErrorCode(status: number, body: string): TtsErrorCode {
  if (status === 401) {
    return "NOT_CONFIGURED";
  }

  if (status === 404) {
    return "INVALID_VOICE";
  }

  if (status === 422) {
    return "INVALID_INPUT";
  }

  if (status === 429) {
    return "RATE_LIMITED";
  }

  if (status === 402 || body.toLowerCase().includes("quota")) {
    return "QUOTA_EXCEEDED";
  }

  return "PROVIDER_ERROR";
}

function resolveErrorMessage(
  code: TtsErrorCode,
  status: number,
  body: string,
): string {
  switch (code) {
    case "NOT_CONFIGURED":
      return "ElevenLabs API key is invalid or missing";
    case "INVALID_VOICE":
      return "Voice ID not found";
    case "INVALID_INPUT":
      return "Invalid text or synthesis parameters";
    case "RATE_LIMITED":
      return "ElevenLabs rate limit exceeded. Try again shortly.";
    case "QUOTA_EXCEEDED":
      return "ElevenLabs quota exceeded";
    case "PROVIDER_ERROR":
      return body.trim()
        ? `ElevenLabs request failed (${status}): ${body.trim()}`
        : `ElevenLabs request failed (${status})`;
  }
}
