const PUSH_ENABLED_KEY = "slidepress-push-enabled";
const PUSH_DEVICE_TOKEN_KEY = "slidepress-push-device-token";

export const PUSH_PREFERENCE_CHANGED_EVENT = "slidepress-push-preference-changed";
export const PUSH_REGISTRATION_FAILED_EVENT = "slidepress-push-registration-failed";
export const PUSH_REGISTRATION_SUCCESS_EVENT = "slidepress-push-registration-success";

export function isPushNotificationsEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(PUSH_ENABLED_KEY) === "true";
}

export function setPushNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(PUSH_ENABLED_KEY, "true");
  } else {
    window.localStorage.removeItem(PUSH_ENABLED_KEY);
  }
}

export function getStoredPushDeviceToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PUSH_DEVICE_TOKEN_KEY);
}

export function setStoredPushDeviceToken(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(PUSH_DEVICE_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(PUSH_DEVICE_TOKEN_KEY);
  }
}

export function dispatchPushPreferenceChanged(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PUSH_PREFERENCE_CHANGED_EVENT));
}

export function dispatchPushRegistrationFailed(reason: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(PUSH_REGISTRATION_FAILED_EVENT, { detail: { reason } }),
  );
}

export function dispatchPushRegistrationSuccess(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(PUSH_REGISTRATION_SUCCESS_EVENT));
}
