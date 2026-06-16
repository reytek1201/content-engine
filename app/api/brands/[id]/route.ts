import type { Brand } from "@/types/brand";
import { BrandPatchSchema } from "@/utils/campaign-generation";
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

    if (existing.is_default) {
      return NextResponse.json(
        { success: false, error: "Cannot delete your default brand" },
        { status: 400 },
      );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
