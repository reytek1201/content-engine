import {
  ensureFreshYouTubeAccessToken,
  getYouTubeConnectionPublic,
  getYouTubeConnectionRow,
  revokeAndDeleteYouTubeConnection,
} from "@/utils/youtube/connection-store";
import { maybeClearPlatformConnectionGrace } from "@/utils/platform-connection-grace";
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

    const row = await getYouTubeConnectionRow(user.id);

    if (!row) {
      return NextResponse.json({
        success: true,
        connected: false,
        connection: null,
      });
    }

    await ensureFreshYouTubeAccessToken(row);
    const connection = await getYouTubeConnectionPublic(user.id);

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

    await revokeAndDeleteYouTubeConnection(user.id);
    await maybeClearPlatformConnectionGrace(user.id);

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
