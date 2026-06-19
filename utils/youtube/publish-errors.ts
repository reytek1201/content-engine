export function getYouTubePublishErrorMessage(error: string): string {
  const normalized = error.toLowerCase();

  if (
    normalized.includes("upload permission") ||
    normalized.includes("insufficientpermissions")
  ) {
    return "Upload permission required. Grant access to publish Shorts to YouTube.";
  }

  if (
    normalized.includes("upload limit") ||
    normalized.includes("uploadlimitexceeded")
  ) {
    return "YouTube daily upload limit reached. Try again tomorrow.";
  }

  if (normalized.includes("quota") || normalized.includes("quotaexceeded")) {
    return "YouTube API quota exceeded. Try again later or contact support.";
  }

  if (normalized.includes("timed out waiting for youtube")) {
    return "YouTube is still processing your video. Check YouTube Studio in a few minutes.";
  }

  if (normalized.includes("no completed 9:16 video export")) {
    return "Export a 9:16 Quick Reel video first, then post to YouTube.";
  }

  if (normalized.includes("connect youtube")) {
    return "Connect YouTube in Settings before posting.";
  }

  if (
    normalized.includes("token") &&
    (normalized.includes("expired") || normalized.includes("invalid"))
  ) {
    return "YouTube connection expired. Disconnect and reconnect in Settings.";
  }

  if (normalized.includes("already being published")) {
    return "This export is already being published to YouTube.";
  }

  return error;
}
