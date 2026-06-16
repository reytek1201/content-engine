import type { AspectRatio } from "@/types/campaign";

export const NANO_BANANA_MODEL = "fal-ai/nano-banana-2";
export const NANO_BANANA_EDIT_MODEL = "fal-ai/nano-banana-2/edit";

export function getNanoBananaAspectRatio(aspectRatio: AspectRatio): string {
  return aspectRatio;
}

export function getAppBaseUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // Fallback for local development only. In production NEXT_PUBLIC_APP_URL
  // is required (validated in instrumentation.ts) because x-forwarded-host
  // is attacker-controlled and must not be used to build webhook URLs.
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";

  if (!isLocalAppUrl(baseUrl)) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be set in production. Add it to your Vercel environment variables.",
    );
  }

  return baseUrl;
}

export function isLocalAppUrl(baseUrl: string): boolean {
  return (
    baseUrl.includes("localhost") ||
    baseUrl.includes("127.0.0.1") ||
    baseUrl.startsWith("http://[::1]")
  );
}

export function getFalWebhookSecret(): string {
  const secret = process.env.FAL_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("FAL_WEBHOOK_SECRET is not configured");
  }
  return secret;
}

export function buildFalWebhookUrl(appBaseUrl: string): string {
  const secret = getFalWebhookSecret();
  return `${appBaseUrl}/api/webhooks/fal?secret=${encodeURIComponent(secret)}`;
}

export function verifyFalWebhookSecret(request: Request): boolean {
  const url = new URL(request.url);
  const provided = url.searchParams.get("secret");
  try {
    const expected = getFalWebhookSecret();
    return provided === expected;
  } catch {
    return false;
  }
}

interface FalQueueResponse {
  request_id: string;
}

interface FalImageResponse {
  images?: Array<{ url: string }>;
  image?: { url: string };
}

function extractImageUrl(data: FalImageResponse): string | null {
  return data.images?.[0]?.url ?? data.image?.url ?? null;
}

function getFalKey(): string {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY is not configured");
  }
  return falKey;
}

function resolveModel(imageUrls?: string[]): string {
  return imageUrls && imageUrls.length > 0
    ? NANO_BANANA_EDIT_MODEL
    : NANO_BANANA_MODEL;
}

function buildRequestBody(
  prompt: string,
  aspectRatio: AspectRatio,
  imageUrls?: string[]
) {
  const body: Record<string, unknown> = {
    prompt,
    aspect_ratio: getNanoBananaAspectRatio(aspectRatio),
    output_format: "jpeg",
    resolution: "1K",
    num_images: 1,
  };

  if (imageUrls && imageUrls.length > 0) {
    body.image_urls = imageUrls;
  }

  return body;
}

export async function submitNanoBananaToQueue(
  prompt: string,
  aspectRatio: AspectRatio,
  webhookUrl: string,
  imageUrls?: string[]
): Promise<string> {
  const model = resolveModel(imageUrls);
  const endpoint = `https://queue.fal.run/${model}?fal_webhook=${encodeURIComponent(webhookUrl)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Key ${getFalKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(prompt, aspectRatio, imageUrls)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fal queue submission failed: ${errorBody}`);
  }

  const data = (await response.json()) as FalQueueResponse;
  return data.request_id;
}

export async function runNanoBananaSync(
  prompt: string,
  aspectRatio: AspectRatio,
  imageUrls?: string[]
): Promise<string> {
  const model = resolveModel(imageUrls);
  const response = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${getFalKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(prompt, aspectRatio, imageUrls)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Fal sync generation failed: ${errorBody}`);
  }

  const data = (await response.json()) as FalImageResponse;
  const imageUrl = extractImageUrl(data);

  if (!imageUrl) {
    throw new Error("Fal sync response did not include an image URL");
  }

  return imageUrl;
}

export interface FalWebhookPayload {
  request_id: string;
  status: "OK" | "ERROR";
  error?: string;
  payload?: FalImageResponse;
}

export function extractImageUrlFromWebhook(
  body: FalWebhookPayload
): string | null {
  if (!body.payload) {
    return null;
  }

  return extractImageUrl(body.payload);
}
