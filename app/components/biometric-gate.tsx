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
import { isBiometricLockEnabled } from "@/utils/biometric-session";
import { App } from "@capacitor/app";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * How long (ms) the app can be in the background before we re-lock it.
 * 30 s feels generous but matches most banking/auth apps.
 */
const BACKGROUND_GRACE_MS = 30_000;

type GateStatus =
  | "checking"   // client not yet determined
  | "idle"       // not native or biometrics disabled — no gate
  | "locked"     // locked, will auto-prompt shortly
  | "prompting"  // biometric dialog is open
  | "error"      // auth failed (non-cancel); show message + retry button
  | "unlocked";  // authenticated; fade overlay out then remove

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
  const [state, setState] = useState<LockState>({
    status: "checking",
    errorMessage: null,
    biometryType: BiometryType.none,
  });

  // Timestamp (Date.now()) when the app was backgrounded. null = in foreground.
  const backgroundedAtRef = useRef<number | null>(null);

  // Whether the overlay should be visually fading out (for exit animation).
  const [fadingOut, setFadingOut] = useState(false);

  const triggerUnlock = useCallback(async (biometryType: BiometryType) => {
    setState((s) => ({ ...s, status: "prompting", errorMessage: null }));

    const label = biometryLabel(biometryType);
    const { success, errorCode } = await authenticate({
      reason: `Unlock SlidePress with ${label}.`,
      cancelTitle: "Use Passcode",
      allowDeviceCredential: true,
    });

    if (success) {
      setState((s) => ({ ...s, status: "unlocked" }));
      setFadingOut(true);

      // Remove overlay from DOM after the CSS transition finishes.
      setTimeout(() => {
        setState((s) => ({ ...s, status: "idle" }));
        setFadingOut(false);
      }, 500);

      return;
    }

    // User cancelled → stay locked but don't show an error message.
    if (
      errorCode === BiometryErrorType.userCancel ||
      errorCode === BiometryErrorType.systemCancel ||
      errorCode === BiometryErrorType.appCancel
    ) {
      setState((s) => ({ ...s, status: "locked", errorMessage: null }));
      return;
    }

    // Real error → show message + retry button.
    setState((s) => ({
      ...s,
      status: "error",
      errorMessage: biometryErrorMessage(errorCode ?? BiometryErrorType.none),
    }));
  }, []);

  // Initialise on mount.
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
      const info = await checkBiometry();

      if (cancelled) return;

      if (!info.isAvailable) {
        // Biometrics enrolled setting is on but hardware unavailable (e.g.
        // enrolled state changed). Fall through without a gate.
        setState((s) => ({ ...s, status: "idle" }));
        return;
      }

      setState((s) => ({
        ...s,
        status: "locked",
        biometryType: info.biometryType,
      }));

      // Slight delay so the lock screen is painted before the OS dialog opens.
      setTimeout(() => {
        if (!cancelled) {
          void triggerUnlock(info.biometryType);
        }
      }, 150);
    }

    void init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // App state change listener: re-lock after backgrounded for > grace period.
  useEffect(() => {
    if (!isBiometricSupported()) return;
    if (!isBiometricLockEnabled()) return;

    const listenerPromise = App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        // App went to background; record the time.
        backgroundedAtRef.current = Date.now();
        return;
      }

      // App came back to foreground.
      const backgroundedAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;

      if (backgroundedAt === null) return;

      const elapsed = Date.now() - backgroundedAt;
      if (elapsed < BACKGROUND_GRACE_MS) return;

      // Grace period expired — re-lock.
      setState((prev) => {
        // Already locked/prompting: don't reset error state unnecessarily.
        if (prev.status === "locked" || prev.status === "prompting") {
          return prev;
        }

        return { ...prev, status: "locked", errorMessage: null };
      });

      // Re-check biometry type in case it changed (edge case).
      checkBiometry()
        .then((info) => {
          if (info.isAvailable) {
            void triggerUnlock(info.biometryType);
          }
        })
        .catch(() => {});
    });

    return () => {
      void listenerPromise.then((l) => l.remove());
    };
  }, [triggerUnlock]);

  const { status, errorMessage, biometryType } = state;

  // Nothing to render when gate is not active.
  if (status === "idle") return null;

  // During 'checking' on web: render nothing (useLayoutEffect sets idle immediately).
  // On native, 'checking' is extremely brief before useLayoutEffect fires.
  const isVisible = status !== "checking" && !fadingOut;

  const label = biometryLabel(biometryType);

  return (
    <div
      aria-label="App locked"
      className={`fixed inset-0 z-100 flex flex-col items-center justify-between bg-[#09090b] px-6 transition-opacity duration-500 ${
        fadingOut || status === "checking" ? "opacity-0" : "opacity-100"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
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
            status === "prompting" ? "animate-pulse" : ""
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
        {isVisible ? `Unlock with ${label} to continue` : ""}
      </p>
    </div>
  );
}
