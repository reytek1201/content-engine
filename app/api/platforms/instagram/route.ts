import {
  ensureFreshInstagramAccessToken,
  getInstagramConnectionPublic,
  getInstagramConnectionRow,
  revokeAndDeleteInstagramConnection,
} from "@/utils/instagram/connection-store";
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

    const row = await getInstagramConnectionRow(user.id);

    if (!row) {
      return NextResponse.json({
        success: true,
        connected: false,
        connection: null,
      });
    }

    await ensureFreshInstagramAccessToken(row);
    const connection = await getInstagramConnectionPublic(user.id);

    return NextResponse.json({
      success: true,
      connected: Boolean(connection),
      connection,
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

export async function DELETE() {
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

    await revokeAndDeleteInstagramConnection(user.id);

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
