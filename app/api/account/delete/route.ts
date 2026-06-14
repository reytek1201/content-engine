import { deleteUserReferenceStorage } from "@/utils/delete-user-storage";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST() {
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

    const admin = createAdminClient();

    try {
      await deleteUserReferenceStorage(admin, user.id);
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
