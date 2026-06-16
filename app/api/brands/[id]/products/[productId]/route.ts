import type { BrandProduct } from "@/types/brand";
import { BrandProductPatchSchema } from "@/utils/campaign-generation";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ id: string; productId: string }>;
}

async function getOwnedProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
  productId: string,
): Promise<BrandProduct | null> {
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  if (brandError) {
    throw new Error(brandError.message);
  }

  if (!brand) {
    return null;
  }

  const { data, error } = await supabase
    .from("brand_products")
    .select("*")
    .eq("id", productId)
    .eq("brand_id", brandId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as BrandProduct | null) ?? null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id: brandId, productId } = await context.params;
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

    const existing = await getOwnedProduct(
      supabase,
      user.id,
      brandId,
      productId,
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const parsedInput = BrandProductPatchSchema.safeParse(body);

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

    if (parsedInput.data.product_reference_url !== undefined) {
      payload.product_reference_url = parsedInput.data.product_reference_url;
    }

    if (parsedInput.data.description !== undefined) {
      payload.description = parsedInput.data.description;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: true, product: existing });
    }

    const { data: product, error } = await supabase
      .from("brand_products")
      .update(payload)
      .eq("id", productId)
      .eq("brand_id", brandId)
      .select("*")
      .single();

    if (error || !product) {
      return NextResponse.json(
        { success: false, error: "Failed to update product" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      product: product as BrandProduct,
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

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id: brandId, productId } = await context.params;
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

    const existing = await getOwnedProduct(
      supabase,
      user.id,
      brandId,
      productId,
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 },
      );
    }

    const { error } = await supabase
      .from("brand_products")
      .delete()
      .eq("id", productId)
      .eq("brand_id", brandId);

    if (error) {
      return NextResponse.json(
        { success: false, error: "Failed to delete product" },
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
