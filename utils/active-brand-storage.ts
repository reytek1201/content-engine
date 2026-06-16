const ACTIVE_BRAND_STORAGE_KEY = "slidepress-active-brand-id";

export function getStoredActiveBrandId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_BRAND_STORAGE_KEY);
}

export function setStoredActiveBrandId(brandId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ACTIVE_BRAND_STORAGE_KEY, brandId);
}

export function clearStoredActiveBrandId(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_BRAND_STORAGE_KEY);
}
