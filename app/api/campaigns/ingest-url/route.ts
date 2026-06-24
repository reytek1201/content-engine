import { ingestWebsiteForCampaign } from "@/utils/ingest-website";
import {
  uploadIngestedLogoImage,
  uploadIngestedProductImage,
} from "@/utils/ingest-product-image";
import { PublicUrlFetchError } from "@/utils/fetch-public-url";
import { GeminiServiceError, mapGeminiError } from "@/utils/map-gemini-error";
import { isRateLimitError, assertRateLimit } from "@/utils/rate-limit";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const INGEST_URL_RATE_LIMIT = {
  maxRequests: 5,
  windowMs: 60_000,
} as const;

const RequestSchema = z.object({
  url: z.string().min(3).max(2048),
  regenerate: z.boolean().optional(),
  excludeTopics: z.array(z.string().min(1).max(140)).max(10).optional(),
  skipReferenceUpload: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    assertRateLimit(
      `ingest-url:${user.id}`,
      INGEST_URL_RATE_LIMIT.maxRequests,
      INGEST_URL_RATE_LIMIT.windowMs,
    );

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const result = await ingestWebsiteForCampaign(parsed.data.url, {
      excludeTopics: parsed.data.regenerate
        ? parsed.data.excludeTopics
        : undefined,
    });

    let productImageUrl = result.productImageUrl;
    let logoImageUrl = result.logoImageUrl;

    if (!parsed.data.skipReferenceUpload) {
      if (productImageUrl) {
        productImageUrl = await uploadIngestedProductImage(
          supabase,
          user.id,
          productImageUrl,
        );
      }

      if (logoImageUrl) {
        logoImageUrl = await uploadIngestedLogoImage(
          supabase,
          user.id,
          logoImageUrl,
        );
      }
    }

    return NextResponse.json({
      success: true,
      businessName: result.businessName,
      description: result.description,
      audience: result.audience,
      topics: result.topics,
      productImageUrl,
      logoImageUrl,
      sourceUrl: result.sourceUrl,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 },
      );
    }

    if (error instanceof PublicUrlFetchError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 },
      );
    }

    if (error instanceof GeminiServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          ...(error.retryable ? { code: "ai_busy" as const } : {}),
        },
        { status: error.retryable ? 503 : 500 },
      );
    }

    const message = mapGeminiError(error);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
