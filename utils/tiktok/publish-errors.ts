export function getTikTokPublishErrorMessage(error: string): string {
  const normalized = error.toLowerCase();

  if (
    normalized.includes("posting permission") ||
    normalized.includes("scope_not_authorized")
  ) {
    return "Posting permission required. Grant access to publish to TikTok.";
  }

  if (normalized.includes("url domain") || normalized.includes("url_ownership")) {
    return "TikTok rejected the video upload. Try again — SlidePress now uploads the file directly.";
  }

  if (normalized.includes("daily post limit")) {
    return "TikTok daily post limit reached. Try again tomorrow.";
  }

  if (normalized.includes("timed out waiting for tiktok")) {
    return "TikTok is still processing your video. Check your profile in a few minutes.";
  }

  if (normalized.includes("no completed 9:16 video export")) {
    return "Export a 9:16 Quick Reel video first, then post to TikTok.";
  }

  if (normalized.includes("connect tiktok")) {
    return "Connect TikTok in Settings before posting.";
  }

  if (
    normalized.includes("token") &&
    (normalized.includes("expired") || normalized.includes("invalid"))
  ) {
    return "TikTok connection expired. Disconnect and reconnect in Settings.";
  }

  if (normalized.includes("already being published")) {
    return "This export is already being published to TikTok.";
  }

  if (normalized.includes("failed to download campaign video")) {
    return "Could not download your video export for TikTok upload. Try exporting the video again.";
  }

  if (normalized.includes("video upload failed")) {
    return "TikTok rejected the video upload. Try again in a few minutes.";
  }

  if (normalized.includes("video_pull_failed")) {
    return "TikTok could not download your video export. Confirm the export URL is public and verified in TikTok Developer Portal.";
  }

  return error;
}
