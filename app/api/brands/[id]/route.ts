import type { Brand } from "@/types/brand";
import { BrandPatchSchema } from "@/utils/campaign-generation";
import { ensureDefaultBrand } from "@/utils/brands-server";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function getOwnedBrand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
): Promise<Brand | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Brand | null) ?? null;
}

export async function GET(_request: Request, context: RouteContext) {
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
        { status: 401 },
      );
    }

    const brand = await getOwnedBrand(supabase, user.id, id);

    if (!brand) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, brand });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
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
        { status: 401 },
      );
    }

    const existing = await getOwnedBrand(supabase, user.id, id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsedInput = BrandPatchSchema.safeParse(body);

    if (!parsedInput.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload",
          details: parsedInput.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload: Record<string, string | null> = {};

    if (parsedInput.data.name !== undefined) {
      payload.name = parsedInput.data.name;
    }

    if (parsedInput.data.product !== undefined) {
      payload.product_reference_url = parsedInput.data.product;
    }

    if (parsedInput.data.style !== undefined) {
      payload.style_reference_url = parsedInput.data.style;
    }

    if (parsedInput.data.logo !== undefined) {
      payload.logo_reference_url = parsedInput.data.logo;
    }

    if (parsedInput.data.voice_notes !== undefined) {
      payload.voice_notes = parsedInput.data.voice_notes;
    }

    if (parsedInput.data.preferred_voice_persona !== undefined) {
      payload.preferred_voice_persona = parsedInput.data.preferred_voice_persona;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: true, brand: existing });
    }

    const { data: brand, error } = await supabase
      .from("brands")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !brand) {
      return NextResponse.json(
        { success: false, error: "Failed to update brand" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, brand: brand as Brand });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
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
        { status: 401 },
      );
    }

    const existing = await getOwnedBrand(supabase, user.id, id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 },
      );
    }

    const { count: brandCount, error: brandCountError } = await supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (brandCountError) {
      return NextResponse.json(
        { success: false, error: "Failed to delete brand" },
        { status: 500 },
      );
    }

    const isOnlyBrand = (brandCount ?? 0) === 1;
    const wasDefault = existing.is_default;
    const deleteCampaigns = wasDefault || isOnlyBrand;

    if (wasDefault && !isOnlyBrand) {
      const { data: replacement, error: replacementError } = await supabase
        .from("brands")
        .select("id")
        .eq("user_id", user.id)
        .neq("id", id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (replacementError || !replacement) {
        return NextResponse.json(
          { success: false, error: "Failed to delete brand" },
          { status: 500 },
        );
      }

      const { error: clearDefaultError } = await supabase
        .from("brands")
        .update({ is_default: false })
        .eq("id", id)
        .eq("user_id", user.id);

      if (clearDefaultError) {
        return NextResponse.json(
          { success: false, error: "Failed to delete brand" },
          { status: 500 },
        );
      }

      const { error: promoteError } = await supabase
        .from("brands")
        .update({ is_default: true })
        .eq("id", replacement.id)
        .eq("user_id", user.id);

      if (promoteError) {
        return NextResponse.json(
          { success: false, error: "Failed to delete brand" },
          { status: 500 },
        );
      }
    }

    if (deleteCampaigns) {
      const { error: deleteCampaignsError } = await supabase
        .from("campaigns")
        .delete()
        .eq("brand_id", id)
        .eq("user_id", user.id);

      if (deleteCampaignsError) {
        return NextResponse.json(
          { success: false, error: "Failed to delete brand campaigns" },
          { status: 500 },
        );
      }
    }

    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to delete brand" },
        { status: 500 },
      );
    }

    let replacementBrandId: string | undefined;

    if (isOnlyBrand) {
      const replacementBrand = await ensureDefaultBrand(supabase, user.id);
      replacementBrandId = replacementBrand.id;
    }

    return NextResponse.json({ success: true, replacementBrandId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
