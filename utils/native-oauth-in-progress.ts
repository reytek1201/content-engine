const NATIVE_OAUTH_IN_PROGRESS_KEY = "slidepress-native-oauth-in-progress";

export function setNativeOAuthInProgress(inProgress: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  if (inProgress) {
    sessionStorage.setItem(NATIVE_OAUTH_IN_PROGRESS_KEY, "1");
    return;
  }

  sessionStorage.removeItem(NATIVE_OAUTH_IN_PROGRESS_KEY);
}

export function isNativeOAuthInProgress(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(NATIVE_OAUTH_IN_PROGRESS_KEY) === "1";
}
