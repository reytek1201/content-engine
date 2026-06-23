const LAST_CAMPAIGN_ID_KEY = "slidepress-last-campaign-id";

export function getLastCampaignId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(LAST_CAMPAIGN_ID_KEY);
  } catch {
    return null;
  }
}

export function setLastCampaignId(campaignId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(LAST_CAMPAIGN_ID_KEY, campaignId);
  } catch {
    // localStorage unavailable.
  }
}

export function clearLastCampaignId(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(LAST_CAMPAIGN_ID_KEY);
  } catch {
    // localStorage unavailable.
  }
}
