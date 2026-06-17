/**
 * Access control for the internal campaign narration audit route (Phase 1).
 */

export function isTtsAuditRouteEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.ENABLE_TTS_AUDIT === "true"
  );
}

export function getTtsAuditAdminUserIds(): Set<string> {
  const raw = process.env.TTS_AUDIT_USER_IDS?.trim();
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function canAuditCampaign(userId: string, campaignOwnerId: string): boolean {
  if (userId === campaignOwnerId) {
    return true;
  }

  return getTtsAuditAdminUserIds().has(userId);
}
