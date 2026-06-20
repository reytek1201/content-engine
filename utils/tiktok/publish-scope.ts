import type { PlatformConnectionRow } from "@/types/platform-connection";
import {
  ensureFreshTikTokAccessToken,
  getTikTokConnectionRow,
} from "@/utils/tiktok/connection-store";
import {
  TikTokPublishScopeError,
  queryTikTokCreatorInfo,
} from "@/utils/tiktok/publish-video";

export async function verifyTikTokPublishScopeLive(
  row: PlatformConnectionRow,
): Promise<boolean> {
  try {
    const fresh = await ensureFreshTikTokAccessToken(row);
    await queryTikTokCreatorInfo(fresh.access_token);
    return true;
  } catch (error) {
    if (error instanceof TikTokPublishScopeError) {
      return false;
    }

    throw error;
  }
}

export async function verifyTikTokPublishScopeForUser(
  userId: string,
): Promise<boolean> {
  const row = await getTikTokConnectionRow(userId);

  if (!row) {
    return false;
  }

  return verifyTikTokPublishScopeLive(row);
}
