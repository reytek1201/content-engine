import { hasUsedWebsiteIngest } from "@/utils/website-ingest-preference";

const AUTO_IMAGES_KEY = "slidepress-auto-generate-images";

export function getAutoGenerateImagesPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(AUTO_IMAGES_KEY);

    if (stored === "0") {
      return false;
    }

    if (stored === "1") {
      return true;
    }

    return hasUsedWebsiteIngest();
  } catch {
    return false;
  }
}

export function setAutoGenerateImagesPreference(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUTO_IMAGES_KEY, enabled ? "1" : "0");
  } catch {
    // localStorage unavailable.
  }
}

export function buildCampaignWorkspaceHref(
  campaignId: string,
  options?: { autoImages?: boolean },
): string {
  if (options?.autoImages) {
    return `/campaign/${campaignId}?auto_images=1`;
  }

  return `/campaign/${campaignId}`;
}
