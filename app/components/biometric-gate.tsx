"use client";

import {
  authenticate,
  checkBiometry,
  biometryLabel,
  biometryErrorMessage,
  isBiometricSupported,
  BiometryType,
  BiometryErrorType,
} from "@/utils/biometric-auth";
import {
  isBiometricLockEnabled,
  lockSession,
  pauseSupabaseAutoRefresh,
  restoreSessionFromKeychain,
  resumeSupabaseAutoRefresh,
} from "@/utils/biometric-session";
import { storeRefreshToken } from "@/utils/secure-token-store";
import { createClient } from "@/utils/supabase/client";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * How long (ms) the app can be in the background before we re-lock it.
 * Short switches (messages, camera) should not force a full unlock cycle.
 */
const BACKGROUND_GRACE_MS = 120_000;

type GateStatus =
  | "checking"    // client not yet determined
  | "idle"        // not native or biometrics disabled — no gate
  | "locked"      // locked, will auto-prompt shortly
  | "prompting"   // biometric dialog is open
  | "restoring"   // biometric passed; restoring Supabase session from Keychain
  | "error"       // unrecoverable error; show message + retry button
  | "unlocked";   // session restored; fade overlay out then unmount

interface LockState {
  status: GateStatus;
  errorMessage: string | null;
  biometryType: BiometryType;
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FaceIdIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7 3H4a1 1 0 00-1 1v3M17 3h3a1 1 0 011 1v3M7 21H4a1 1 0 01-1-1v-3M17 21h3a1 1 0 001-1v-3" />
      <path d="M9 9v.5M15 9v.5M9.5 14.5s.75 1 2.5 1 2.5-1 2.5-1" />
      <line x1="12" y1="9" x2="12" y2="12.5" />
    </svg>
  );
}

function FingerprintIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4M14 13.12c0 2.38 0 6.38-1 8.88M17.29 21.02c.12-.6.43-2.3.5-3.02M3 8.5a9 9 0 0 1 15-2.03" />
      <path d="M6.08 8a9.005 9.005 0 0 0-.27 9.81M8.42 19.19c-.14.48-.52 1.62-.66 2.09M9.58 9.5a6 6 0 0 1 7.93.98" />
      <path d="M11.66 19.07c-.07.16-.73 1.6-.73 1.6" />
    </svg>
  );
}

function BiometryIcon({
  type,
  className,
}: {
  type: BiometryType;
  className?: string;
}) {
  if (type === BiometryType.faceId || type === BiometryType.faceAuthentication) {
    return <FaceIdIcon className={className} />;
  }

  if (
    type === BiometryType.touchId ||
    type === BiometryType.fingerprintAuthentication ||
    type === BiometryType.irisAuthentication
  ) {
    return <FingerprintIcon className={className} />;
  }

  return <LockIcon className={className} />;
}

// ---------------------------------------------------------------------------
// Gate component
// ---------------------------------------------------------------------------

export default function BiometricGate() {
  const router = useRouter();
  const supabase = createClient();

  const [state, setState] = useState<LockState>({
    status: "checking",
    errorMessage: null,
    biometryType: BiometryType.none,
  });

  // Timestamp (Date.now()) when the app was backgrounded. null = in foreground.
  const backgroundedAtRef = useRef<number | null>(null);

  // Prevents overlapping resume-lock / unlock sequences.
  const resumeHandlingRef = useRef(false);
  const unlockInProgressRef = useRef(false);

  // Whether the overlay should be visually fading out (for exit animation).
  const [fadingOut, setFadingOut] = useState(false);

  /** Keep the Keychain vault aligned with the live Supabase refresh token. */
  const syncKeychainFromSession = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.refresh_token) {
      await storeRefreshToken(session.refresh_token);
    }
  }, [supabase]);

  /**
   * Dismiss the overlay with a fade and refresh the page so server components
   * pick up the restored session cookies.
   */
  const dismissAndRefresh = useCallback(() => {
    setState((s) => ({ ...s, status: "unlocked" }));
    setFadingOut(true);

    setTimeout(() => {
      setState((s) => ({ ...s, status: "idle" }));
      setFadingOut(false);
      // Trigger a server re-render so protected pages see the restored session.
      router.refresh();
    }, 500);
  }, [router]);

  const triggerUnlock = useCallback(
    async (biometryType: BiometryType) => {
      if (unlockInProgressRef.current) {
        return;
      }

      unlockInProgressRef.current = true;

      try {
        setState((s) => ({ ...s, status: "prompting", errorMessage: null }));

        const label = biometryLabel(biometryType);
        const { success, errorCode } = await authenticate({
          reason: `Unlock SlidePress with ${label}.`,
          cancelTitle: "Use Passcode",
          allowDeviceCredential: true,
        });

        if (!success) {
          // User cancelled → stay locked but don't show an error message.
          if (
            errorCode === BiometryErrorType.userCancel ||
            errorCode === BiometryErrorType.systemCancel ||
            errorCode === BiometryErrorType.appCancel
          ) {
            setState((s) => ({ ...s, status: "locked", errorMessage: null }));
            return;
          }

          // Real biometric error → show message + retry button.
          setState((s) => ({
            ...s,
            status: "error",
            errorMessage: biometryErrorMessage(
              errorCode ?? BiometryErrorType.none,
            ),
          }));
          return;
        }

        // Biometric passed — restore the Supabase session from Keychain.
        setState((s) => ({ ...s, status: "restoring" }));

        const restoreResult = await restoreSessionFromKeychain(supabase);

        if (restoreResult.error) {
          if (restoreResult.fatal) {
            setState((s) => ({ ...s, status: "idle" }));
            setFadingOut(false);
            router.replace("/login?reason=session_expired");
            return;
          }

          setState((s) => ({
            ...s,
            status: "error",
            errorMessage: restoreResult.error,
          }));
          return;
        }

        dismissAndRefresh();
      } finally {
        unlockInProgressRef.current = false;
      }
    },
    // supabase client is stable (singleton); router is stable in Next.js 13+.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dismissAndRefresh],
  );

  // Initialise on mount — decide whether to show the gate.
  useLayoutEffect(() => {
    if (!isBiometricSupported()) {
      setState((s) => ({ ...s, status: "idle" }));
      return;
    }

    if (!isBiometricLockEnabled()) {
      setState((s) => ({ ...s, status: "idle" }));
      return;
    }

    let cancelled = false;

    async function init() {
      await pauseSupabaseAutoRefresh(supabase);

      const info = await checkBiometry();

      if (cancelled) return;

      if (!info.isAvailable) {
        // Enrolled setting is on but hardware unavailable — fall through.
        await resumeSupabaseAutoRefresh(supabase);
        setState((s) => ({ ...s, status: "idle" }));
        return;
      }

      setState((s) => ({
        ...s,
        status: "locked",
        biometryType: info.biometryType,
      }));

      // Sync Keychain with any live session before unlock (covers cold start
      // when the app was killed without a resume lock cycle).
      await syncKeychainFromSession();

      // Small delay so the overlay is painted before the OS dialog opens.
      setTimeout(() => {
        if (!cancelled) {
          void triggerUnlock(info.biometryType);
        }
      }, 150);
    }

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // App state change listener: lock session + re-show gate after grace period.
  useEffect(() => {
    if (!isBiometricSupported()) return;
    if (!isBiometricLockEnabled()) return;

    const listenerPromise = App.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (!isActive) {
          backgroundedAtRef.current = Date.now();
          void pauseSupabaseAutoRefresh(supabase);
          return;
        }

        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;

        if (backgroundedAt === null) return;

        const elapsed = Date.now() - backgroundedAt;

        if (elapsed < BACKGROUND_GRACE_MS) {
          void syncKeychainFromSession();
          void resumeSupabaseAutoRefresh(supabase);
          return;
        }

        if (resumeHandlingRef.current) return;

        resumeHandlingRef.current = true;

        void (async () => {
          try {
            // Re-lock the gate before clearing the session.
            setState((prev) => ({
              ...prev,
              status: "locked",
              errorMessage: null,
            }));

            // Must finish before biometric unlock so restore never races
            // ahead of signOut or reads a stale Keychain entry.
            await lockSession(supabase);

            const info = await checkBiometry();
            if (info.isAvailable) {
              setState((prev) => ({
                ...prev,
                biometryType: info.biometryType,
              }));
              await triggerUnlock(info.biometryType);
            }
          } finally {
            resumeHandlingRef.current = false;
          }
        })();
      },
    );

    return () => {
      void listenerPromise.then((l) => l.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerUnlock]);

  // Keep the Keychain vault current whenever Supabase rotates the refresh token
  // or the user signs in again (covers foreground use before background-lock).
  useEffect(() => {
    if (!isBiometricSupported()) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isBiometricLockEnabled()) return;
      if (!session?.refresh_token) return;

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void storeRefreshToken(session.refresh_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { status, errorMessage, biometryType } = state;

  if (status === "idle") return null;

  const isProcessing = status === "prompting" || status === "restoring";
  const label = biometryLabel(biometryType);

  return (
    <div
      aria-label="App locked"
      className={`fixed inset-0 z-100 flex flex-col items-center justify-between bg-[#09090b] px-6 transition-opacity duration-500 ${
        fadingOut || status === "checking" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* App name */}
      <div className="mt-16 flex flex-col items-center gap-3">
        <p className="text-xl font-semibold tracking-tight text-zinc-100">
          SlidePress
        </p>
        <p className="text-sm text-zinc-500">Your campaigns are locked.</p>
      </div>

      {/* Center biometry icon */}
      <div className="flex flex-col items-center gap-6">
        <div
          className={`flex h-24 w-24 items-center justify-center rounded-full border border-zinc-700/60 bg-zinc-800/60 ${
            isProcessing ? "animate-pulse" : ""
          }`}
        >
          <BiometryIcon
            type={biometryType}
            className="h-12 w-12 text-zinc-300"
          />
        </div>

        {status === "prompting" && (
          <p className="text-sm text-zinc-400">Waiting for {label}…</p>
        )}

        {status === "restoring" && (
          <p className="text-sm text-zinc-400">Restoring session…</p>
        )}

        {(status === "locked" || status === "error") && (
          <div className="flex flex-col items-center gap-3">
            {errorMessage && (
              <p className="max-w-xs text-center text-sm leading-5 text-red-400">
                {errorMessage}
              </p>
            )}

            <button
              type="button"
              onClick={() => void triggerUnlock(biometryType)}
              className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 px-6 py-3 text-sm font-semibold text-zinc-100 transition active:scale-95 active:bg-zinc-700"
            >
              <BiometryIcon type={biometryType} className="h-4 w-4" />
              Unlock with {label}
            </button>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <p className="mb-6 text-xs text-zinc-600">
        {status === "locked" || status === "error"
          ? `Unlock with ${label} to continue`
          : ""}
      </p>
    </div>
  );
}
