import { z } from "zod";

interface GeminiErrorPayload {
  code?: number;
  message?: string;
  status?: string;
}

function tryParseGeminiErrorPayload(raw: string): GeminiErrorPayload | null {
  const trimmed = raw.trim();

  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: GeminiErrorPayload;
      code?: number;
      message?: string;
      status?: string;
    };

    if (parsed.error && typeof parsed.error === "object") {
      return parsed.error;
    }

    if (parsed.code || parsed.message || parsed.status) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function looksLikeProviderPayload(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function isUnavailableMessage(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes("high demand") ||
    lower.includes("unavailable") ||
    lower.includes("\"code\":503") ||
    lower.includes("code\":503")
  );
}

export function isRetryableGeminiError(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  const payload = tryParseGeminiErrorPayload(raw);

  if (payload?.code === 503 || payload?.status === "UNAVAILABLE") {
    return true;
  }

  if (payload?.code === 429) {
    return true;
  }

  return isUnavailableMessage(raw);
}

export class GeminiServiceError extends Error {
  readonly retryable: boolean;

  constructor(error: unknown) {
    super(mapGeminiError(error));
    this.name = "GeminiServiceError";
    this.retryable = isRetryableGeminiError(error);
  }
}

export function mapGeminiError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return "AI returned invalid slide data. Try again or use fewer slides.";
  }

  if (!(error instanceof Error)) {
    return "We couldn't generate your campaign scripts. Please try again.";
  }

  const raw = error.message;

  if (raw === "GEMINI_API_KEY is not configured") {
    return "AI generation is temporarily unavailable. Please try again later.";
  }

  if (raw === "Gemini returned an empty response") {
    return "AI returned an empty response. Please try again.";
  }

  if (raw === "No response from AI") {
    return "AI returned an empty response. Please try again.";
  }

  if (raw.startsWith("Failed to fetch reference image:")) {
    return "We couldn't load one of your reference images. Check the image and try again.";
  }

  const payload = tryParseGeminiErrorPayload(raw);

  if (payload?.code === 503 || payload?.status === "UNAVAILABLE") {
    return "Our AI writer is busy right now. Wait a moment and try again.";
  }

  if (payload?.code === 429) {
    return "Too many requests right now. Please try again in a minute.";
  }

  if (payload?.message && !looksLikeProviderPayload(payload.message)) {
    return payload.message;
  }

  if (isUnavailableMessage(raw)) {
    return "Our AI writer is busy right now. Wait a moment and try again.";
  }

  if (looksLikeProviderPayload(raw)) {
    return "We couldn't generate your campaign scripts. Please try again.";
  }

  return raw;
}
