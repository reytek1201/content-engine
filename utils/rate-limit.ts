export class RateLimitError extends Error {
  readonly code = "RATE_LIMITED" as const;

  constructor(message = "Too many requests. Try again in a minute.") {
    super(message);
    this.name = "RateLimitError";
  }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

const buckets = new Map<string, number[]>();

/**
 * In-memory sliding-window rate limiter. Best-effort on serverless — each
 * instance tracks its own window, which still blocks burst abuse.
 */
export function assertRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): void {
  const now = Date.now();
  const windowStart = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((timestamp) => timestamp > windowStart);

  if (hits.length >= maxRequests) {
    throw new RateLimitError();
  }

  hits.push(now);
  buckets.set(key, hits);
}

export const AI_RATE_LIMIT = {
  maxRequests: 15,
  windowMs: 60_000,
} as const;

export function assertAiRateLimit(userId: string, route: string): void {
  assertRateLimit(`ai:${route}:${userId}`, AI_RATE_LIMIT.maxRequests, AI_RATE_LIMIT.windowMs);
}

export const TTS_PREVIEW_RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60_000,
} as const;

export function assertTtsPreviewRateLimit(userId: string): void {
  assertRateLimit(
    `tts:preview:${userId}`,
    TTS_PREVIEW_RATE_LIMIT.maxRequests,
    TTS_PREVIEW_RATE_LIMIT.windowMs,
  );
}

export const TTS_EXPORT_RATE_LIMIT = {
  maxRequests: 3,
  windowMs: 60_000,
} as const;

export function assertTtsExportRateLimit(userId: string): void {
  assertRateLimit(
    `tts:export:${userId}`,
    TTS_EXPORT_RATE_LIMIT.maxRequests,
    TTS_EXPORT_RATE_LIMIT.windowMs,
  );
}
