import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(["ios", "android"]),
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

    const { token, platform } = parsed.data;
    const now = new Date().toISOString();

    const { error: upsertError } = await supabase.from("push_device_tokens").upsert(
      {
        user_id: user.id,
        token,
        platform,
        updated_at: now,
      },
      { onConflict: "user_id,token" },
    );

    if (upsertError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save push token",
          details: upsertError.message,
        },
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

export async function DELETE(request: Request) {
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

    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("push_device_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", token);

    if (deleteError) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to remove push token",
          details: deleteError.message,
        },
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
