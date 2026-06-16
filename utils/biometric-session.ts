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

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  storeRefreshToken,
  readRefreshToken,
  clearStoredTokens,
} from "@/utils/secure-token-store";

const BIOMETRIC_ENABLED_KEY = "slidepress-biometric-enabled";

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
 * Returns { session } on success, or { error } if the token is expired /
 * missing (the caller should redirect the user to /login).
 */
export async function restoreSessionFromKeychain(
  supabase: SupabaseClient,
): Promise<{ error: string | null }> {
  // Fast path: if the session is already active (e.g., app killed within the
  // grace period so we never called lockSession), nothing to do.
  const {
    data: { session: existingSession },
  } = await supabase.auth.getSession();

  if (existingSession) {
    return { error: null };
  }

  const storedToken = await readRefreshToken();

  if (!storedToken) {
    return { error: "No stored token — please sign in again." };
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: storedToken,
  });

  if (error || !data.session) {
    // Token expired or revoked — clear the stale Keychain entry.
    await clearStoredTokens();
    return { error: error?.message ?? "Session expired — please sign in again." };
  }

  // Persist the rotated refresh token back to the Keychain.
  await storeRefreshToken(data.session.refresh_token);

  return { error: null };
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
    data: { session: existingSession },
  } = await supabase.auth.getSession();

  if (!existingSession) {
    const storedToken = await readRefreshToken();

    if (storedToken) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: storedToken,
      });

      if (error || !data.session) {
        await clearStoredTokens();
        setBiometricLockEnabled(false);
        return {
          error:
            error?.message ?? "Could not restore session — please sign in again.",
        };
      }
    }
  }

  await clearStoredTokens();
  setBiometricLockEnabled(false);

  return { error: null };
}
