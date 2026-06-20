import {
  deleteUserReferenceStorage,
  deleteUserTtsCacheStorage,
} from "@/utils/delete-user-storage";
import { revokeAndDeleteTikTokConnection } from "@/utils/tiktok/connection-store";
import { revokeAndDeleteYouTubeConnection } from "@/utils/youtube/connection-store";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Require the confirmation word in the request body so this endpoint
    // cannot be triggered by a stolen session or a crafted request alone.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 },
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      (body as Record<string, unknown>).confirm !== "DELETE"
    ) {
      return NextResponse.json(
        { success: false, error: "Confirmation required" },
        { status: 400 },
      );
    }

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

    const admin = createAdminClient();

    try {
      await revokeAndDeleteYouTubeConnection(user.id);
      await revokeAndDeleteTikTokConnection(user.id);
      await deleteUserReferenceStorage(admin, user.id);
      await deleteUserTtsCacheStorage(admin, user.id);
    } catch (storageError) {
      console.error("Failed to delete user storage:", storageError);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to delete account files. Try again or contact support.",
        },
        { status: 500 },
      );
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(
      user.id,
    );

    if (deleteUserError) {
      console.error("Failed to delete auth user:", deleteUserError);
      return NextResponse.json(
        { success: false, error: "Failed to delete account. Try again." },
        { status: 500 },
      );
    }

    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Try again." },
      { status: 500 },
    );
  }
}
