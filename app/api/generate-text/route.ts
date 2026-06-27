import { createClient } from "@/utils/supabase/server";
import {
  assertSlideCountAllowed,
  normalizeReferencesInput,
  RequestSchema,
} from "@/utils/campaign-generation";
import { ensureDefaultBrand } from "@/utils/brands-server";
import {
  assertCampaignLimit,
  isUsageLimitError,
  recordCampaignCreation,
} from "@/utils/usage-limits";
import { assertAiRateLimit, isRateLimitError } from "@/utils/rate-limit";
import { NextResponse } from "next/server";

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
        { status: 401 }
      );
    }

    assertAiRateLimit(user.id, "generate-text");

    const body = await request.json();
    const parsedInput = RequestSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsedInput.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      topic,
      aspect_ratio,
      slide_count,
      references: referencesInput,
      brand_id: brandIdInput,
      brand_product_id: brandProductIdInput,
      source_url: sourceUrlInput,
    } = parsedInput.data;
    const references = normalizeReferencesInput(referencesInput);

    assertSlideCountAllowed(slide_count, user.id);
    await assertCampaignLimit(supabase, user.id);

    let brandId = brandIdInput;

    if (brandId) {
      const { data: ownedBrand, error: brandError } = await supabase
        .from("brands")
        .select("id")
        .eq("id", brandId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (brandError || !ownedBrand) {
        return NextResponse.json(
          { success: false, error: "Brand not found" },
          { status: 404 },
        );
      }
    } else {
      const defaultBrand = await ensureDefaultBrand(supabase, user.id);
      brandId = defaultBrand.id;
    }

    if (brandProductIdInput) {
      const { data: ownedProduct, error: productError } = await supabase
        .from("brand_products")
        .select("id, brand_id")
        .eq("id", brandProductIdInput)
        .maybeSingle();

      if (
        productError ||
        !ownedProduct ||
        ownedProduct.brand_id !== brandId
      ) {
        return NextResponse.json(
          { success: false, error: "Product not found" },
          { status: 404 },
        );
      }
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        brand_id: brandId,
        brand_product_id: brandProductIdInput ?? null,
        topic,
        title: null,
        target_audience: null,
        aspect_ratio,
        slide_count,
        status: "generating_text",
        error_message: null,
        product_reference_url: references.product ?? null,
        style_reference_url: references.style ?? null,
        logo_reference_url: references.logo ?? null,
        source_url: sourceUrlInput ?? null,
      })
      .select("id")
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create campaign",
          details: campaignError?.message,
        },
        { status: 500 }
      );
    }

    await recordCampaignCreation(user.id);

    return NextResponse.json(
      { success: true, campaignId: campaign.id },
      { status: 201 }
    );
  } catch (error) {
    if (isRateLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 }
      );
    }

    if (isUsageLimitError(error)) {
      return NextResponse.json(error.toJSON(), { status: 429 });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
