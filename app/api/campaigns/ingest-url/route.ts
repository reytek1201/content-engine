import { ingestWebsiteForCampaign } from "@/utils/ingest-website";
import { uploadIngestedProductImage } from "@/utils/ingest-product-image";
import { PublicUrlFetchError } from "@/utils/fetch-public-url";
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

    const result = await ingestWebsiteForCampaign(parsed.data.url);

    let productImageUrl = result.productImageUrl;

    if (productImageUrl) {
      const uploadedProductImageUrl = await uploadIngestedProductImage(
        supabase,
        user.id,
        productImageUrl,
      );
      productImageUrl = uploadedProductImageUrl;
    }

    return NextResponse.json({
      success: true,
      businessName: result.businessName,
      description: result.description,
      audience: result.audience,
      topics: result.topics,
      productImageUrl,
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

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
