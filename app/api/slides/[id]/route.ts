import { TextOverlayInputSchema } from "@/utils/campaign-generation";
import { createClient } from "@/utils/supabase/server";
import type { Slide } from "@/types/campaign";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  text_overlay: TextOverlayInputSchema,
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
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

    const { data: slide, error: slideError } = await supabase
      .from("slides")
      .select("*")
      .eq("id", id)
      .single();

    if (slideError || !slide) {
      return NextResponse.json(
        { success: false, error: "Slide not found" },
        { status: 404 }
      );
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("user_id")
      .eq("id", slide.campaign_id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { data: updatedSlide, error: updateError } = await supabase
      .from("slides")
      .update({ text_overlay: parsedInput.data.text_overlay.trim() })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updatedSlide) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to update slide",
          details: updateError?.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, slide: updatedSlide as Slide },
      { status: 200 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
