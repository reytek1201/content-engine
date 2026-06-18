import type { Brand } from "@/types/brand";
import { CreateBrandSchema } from "@/utils/campaign-generation";
import { ensureDefaultBrand, listUserBrands } from "@/utils/brands-server";
import {
  assertBrandLimit,
  isUsageLimitError,
} from "@/utils/usage-limits";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
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

    const brands = await listUserBrands(supabase, user.id);

    return NextResponse.json({ success: true, brands });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

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

    const body = await request.json();
    const parsedInput = CreateBrandSchema.safeParse(body);

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

    await ensureDefaultBrand(supabase, user.id);
    await assertBrandLimit(supabase, user.id);

    const { data: brand, error } = await supabase
      .from("brands")
      .insert({
        user_id: user.id,
        name: parsedInput.data.name,
        is_default: false,
      })
      .select("*")
      .single();

    if (error || !brand) {
      return NextResponse.json(
        { success: false, error: "Failed to create brand" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, brand: brand as Brand },
      { status: 201 },
    );
  } catch (error) {
    if (isUsageLimitError(error)) {
      return NextResponse.json(error.toJSON(), { status: 429 });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
