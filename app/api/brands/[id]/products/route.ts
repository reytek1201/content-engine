import type { BrandProduct } from "@/types/brand";
import {
  BrandProductPatchSchema,
  CreateBrandProductSchema,
} from "@/utils/campaign-generation";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function assertBrandOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id: brandId } = await context.params;
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

    const owned = await assertBrandOwnership(supabase, user.id, brandId);

    if (!owned) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("brand_products")
      .select("*")
      .eq("brand_id", brandId)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to load products" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      products: (data ?? []) as BrandProduct[],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: brandId } = await context.params;
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

    const owned = await assertBrandOwnership(supabase, user.id, brandId);

    if (!owned) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsedInput = CreateBrandProductSchema.safeParse(body);

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

    const { data: product, error } = await supabase
      .from("brand_products")
      .insert({
        brand_id: brandId,
        name: parsedInput.data.name,
        product_reference_url: parsedInput.data.product_reference_url ?? null,
        description: parsedInput.data.description ?? null,
      })
      .select("*")
      .single();

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: "Failed to create product" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, product: product as BrandProduct },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
