import { TIKTOK_PUBLISH_SCOPE } from "@/utils/tiktok/oauth";
import { YOUTUBE_UPLOAD_SCOPE } from "@/utils/youtube/oauth";

export function parseScopeString(scope: string | null | undefined): string[] {
  if (!scope?.trim()) {
    return [];
  }

  return scope.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);
}

export function mergeScopeStrings(
  ...parts: Array<string | null | undefined>
): string {
  const merged = new Set<string>();

  for (const part of parts) {
    for (const scope of parseScopeString(part)) {
      merged.add(scope);
    }
  }

  return Array.from(merged).join(",");
}

export function hasTikTokPublishScope(scopes: string | null | undefined): boolean {
  return parseScopeString(scopes).includes(TIKTOK_PUBLISH_SCOPE);
}

export function hasYouTubeUploadScope(scopes: string | null | undefined): boolean {
  return parseScopeString(scopes).includes(YOUTUBE_UPLOAD_SCOPE);
}

/** After token refresh, trust the provider response over stored scopes. */
export function resolveScopesAfterRefresh(
  stored: string | null | undefined,
  refreshed: string | null | undefined,
): string | null {
  if (refreshed?.trim()) {
    return refreshed.trim();
  }

  return stored?.trim() || null;
}

export function withoutTikTokPublishScope(
  scopes: string | null | undefined,
): string | null {
  const filtered = parseScopeString(scopes).filter(
    (scope) => scope !== TIKTOK_PUBLISH_SCOPE,
  );

  return filtered.length > 0 ? filtered.join(",") : null;
}

export function withoutYouTubeUploadScope(
  scopes: string | null | undefined,
): string | null {
  const filtered = parseScopeString(scopes).filter(
    (scope) => scope !== YOUTUBE_UPLOAD_SCOPE,
  );

  return filtered.length > 0 ? filtered.join(",") : null;
}
