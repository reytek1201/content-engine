/**
 * Biometric session utilities — Phase 3
 *
 * Phase 1: The biometric-enabled preference is stored in localStorage.
 * Phase 3: The Supabase refresh token is moved into the OS Keychain
 *   (iOS) / Android Keystore so tokens are never left in plaintext
 *   localStorage between cold starts.
 *
 * Session lifecycle with biometric lock enabled:
 *   enable    → tokens saved to Keychain; session stays active until
 *               the next time the app is backgrounded past the grace period.
 *   lock      → latest token saved to Keychain; local Supabase session cleared.
 *   unlock    → refresh token read from Keychain; session restored via
 *               supabase.auth.refreshSession(); new token stored back.
 *   disable   → clear Keychain; restore session only if not already active.
 *   sign-out  → Keychain cleared; supabase.auth.signOut() called by caller.
 */

import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import {
  storeRefreshToken,
  readRefreshToken,
  clearStoredTokens,
} from "@/utils/secure-token-store";

const BIOMETRIC_ENABLED_KEY = "slidepress-biometric-enabled";

const REFRESH_RETRY_DELAYS_MS = [0, 1_000, 3_000];
const MAX_REFRESH_ATTEMPTS = REFRESH_RETRY_DELAYS_MS.length;

export interface RestoreSessionResult {
  error: string | null;
  /** When true the stored refresh token is invalid and the user must sign in again. */
  fatal: boolean;
}

// ---------------------------------------------------------------------------
// Preference helpers (synchronous, localStorage)
// ---------------------------------------------------------------------------

export function isBiometricLockEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
}

export function setBiometricLockEnabled(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  if (enabled) {
    window.localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
  } else {
    window.localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  }
}

/**
 * Clear biometric preference AND the stored Keychain token.
 * Call on sign-out and account deletion.
 */
export async function clearBiometricSession(): Promise<void> {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  }

  await clearStoredTokens();
}

// ---------------------------------------------------------------------------
// Session vault operations (async, Keychain-backed)
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

/** Exported for unit tests. */
export function isFatalRefreshError(error: AuthError | null): boolean {
  if (!error) {
    return false;
  }

  const message = error.message.toLowerCase();
  const status = error.status ?? 0;

  if (
    status === 0 ||
    status === 408 ||
    status === 429 ||
    status >= 500 ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("failed to fetch") ||
    message.includes("load failed")
  ) {
    return false;
  }

  if (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    message.includes("invalid refresh token") ||
    message.includes("refresh token not found") ||
    message.includes("invalid_grant") ||
    message.includes("session not found") ||
    message.includes("already been used") ||
    message.includes("revoked")
  ) {
    return true;
  }

  return false;
}

async function syncKeychainFromActiveSession(
  supabase: SupabaseClient,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.refresh_token) {
    await storeRefreshToken(session.refresh_token);
  }
}

async function refreshSessionFromStoredToken(
  supabase: SupabaseClient,
  storedToken: string,
): Promise<RestoreSessionResult> {
  let lastError: AuthError | null = null;

  for (let attempt = 0; attempt < MAX_REFRESH_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await delay(REFRESH_RETRY_DELAYS_MS[attempt] ?? 3_000);
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: storedToken,
    });

    if (!error && data.session) {
      await storeRefreshToken(data.session.refresh_token);
      return { error: null, fatal: false };
    }

    lastError = error;

    if (error && isFatalRefreshError(error)) {
      await clearStoredTokens();
      return {
        error: error.message,
        fatal: true,
      };
    }
  }

  return {
    error:
      lastError?.message ??
      "Could not reach SlidePress. Check your connection and try again.",
    fatal: false,
  };
}

/**
 * Pause Supabase background token refresh while the app is inactive or locked.
 */
export async function pauseSupabaseAutoRefresh(
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.auth.stopAutoRefresh();
}

/**
 * Resume Supabase background token refresh after a successful unlock.
 */
export async function resumeSupabaseAutoRefresh(
  supabase: SupabaseClient,
): Promise<void> {
  await supabase.auth.startAutoRefresh();
}

/**
 * Called when the user enables biometric lock.
 * Saves the current refresh token to the Keychain. The session cookie/
 * localStorage is left intact until the next background-lock event.
 */
export async function enableBiometricLock(
  supabase: SupabaseClient,
): Promise<{ error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.refresh_token) {
    return { error: "No active session — please sign in again." };
  }

  await storeRefreshToken(session.refresh_token);
  setBiometricLockEnabled(true);

  return { error: null };
}

/**
 * Called when the app goes into the background past the grace period.
 * 1. Snapshots the latest refresh token into the Keychain.
 * 2. Clears the local session so tokens are not readable at rest.
 */
export async function lockSession(
  supabase: SupabaseClient,
): Promise<void> {
  await pauseSupabaseAutoRefresh(supabase);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.refresh_token) {
    await storeRefreshToken(session.refresh_token);
  }

  // signOut({ scope: 'local' }) clears the session from cookies/storage
  // without invalidating the token on the server. The Keychain copy allows
  // restoration after biometric unlock.
  await supabase.auth.signOut({ scope: "local" });
}

/**
 * Called after a successful biometric unlock.
 * Reads the stored refresh token from the Keychain, exchanges it for a
 * fresh session, and persists the new token back to the Keychain.
 *
 * Returns a fatal error when the refresh token is invalid. Transient network
 * failures are retryable and keep the Keychain token intact.
 */
export async function restoreSessionFromKeychain(
  supabase: SupabaseClient,
): Promise<RestoreSessionResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!userError && user) {
    await syncKeychainFromActiveSession(supabase);
    await resumeSupabaseAutoRefresh(supabase);
    return { error: null, fatal: false };
  }

  const storedToken = await readRefreshToken();

  if (!storedToken) {
    return {
      error: "No stored token — please sign in again.",
      fatal: true,
    };
  }

  const result = await refreshSessionFromStoredToken(supabase, storedToken);

  if (!result.error) {
    await resumeSupabaseAutoRefresh(supabase);
  }

  return result;
}

/**
 * Called when the user disables biometric lock from settings.
 * If the session is already active (typical while browsing Settings), only
 * clears the Keychain vault. Otherwise restores from the stored refresh token
 * so the user stays logged in after a prior lock.
 */
export async function disableBiometricLock(
  supabase: SupabaseClient,
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!userError && user) {
    await clearStoredTokens();
    setBiometricLockEnabled(false);
    await resumeSupabaseAutoRefresh(supabase);
    return { error: null };
  }

  const storedToken = await readRefreshToken();

  if (storedToken) {
    const result = await refreshSessionFromStoredToken(supabase, storedToken);

    if (result.error) {
      setBiometricLockEnabled(false);
      return { error: result.error };
    }
  }

  await clearStoredTokens();
  setBiometricLockEnabled(false);
  await resumeSupabaseAutoRefresh(supabase);

  return { error: null };
}
