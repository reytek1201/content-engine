import { cancelScheduledPlatformPost, getPlatformPostForUser } from "@/utils/platform-post-store";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: postId } = await context.params;

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

    // Verify the post exists and belongs to the user
    const post = await getPlatformPostForUser(postId, user.id);

    if (!post) {
      return NextResponse.json(
        { success: false, error: "Scheduled post not found" },
        { status: 404 },
      );
    }

    if (post.status !== "scheduled" || post.scheduleStatus !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: "This post is no longer in a pending scheduled state and cannot be cancelled.",
        },
        { status: 409 },
      );
    }

    await cancelScheduledPlatformPost(postId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
