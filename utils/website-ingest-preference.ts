const WEBSITE_INGEST_USED_KEY = "slidepress-website-ingest-used";

export function hasUsedWebsiteIngest(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(WEBSITE_INGEST_USED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markWebsiteIngestUsed(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WEBSITE_INGEST_USED_KEY, "1");
  } catch {
    // localStorage unavailable.
  }
}
