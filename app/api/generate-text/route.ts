import { createClient } from "@/utils/supabase/server";
import {
  assertSlideCountAllowed,
  normalizeReferencesInput,
  RequestSchema,
} from "@/utils/campaign-generation";
import {
  assertCampaignLimit,
  isUsageLimitError,
} from "@/utils/usage-limits";
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

    const { topic, aspect_ratio, slide_count, references: referencesInput } =
      parsedInput.data;
    const references = normalizeReferencesInput(referencesInput);

    assertSlideCountAllowed(slide_count, user.id);
    await assertCampaignLimit(supabase, user.id);

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
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

    return NextResponse.json(
      { success: true, campaignId: campaign.id },
      { status: 201 }
    );
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code },
        { status: 429 }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
