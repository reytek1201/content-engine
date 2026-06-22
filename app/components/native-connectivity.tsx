"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { fetchWithRetry } from "@/utils/fetch-with-retry";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useCallback, useEffect, useRef, useState } from "react";

const HEALTH_RECHECK_MS = 30_000;
const RESUME_DEBOUNCE_MS = 1_500;
const OFFLINE_FAILURES_BEFORE_SHOW = 2;

async function checkServerReachable(): Promise<boolean> {
  if (typeof window === "undefined") {
    return true;
  }

  if (!navigator.onLine) {
    return false;
  }

  try {
    const response = await fetchWithRetry("/api/health", {
      method: "GET",
      cache: "no-store",
      attempts: 3,
      retryDelayMs: 600,
    });

    return response.ok;
  } catch {
    return false;
  }
}

export default function NativeConnectivity() {
  const isNativeApp = useIsNativeApp();
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const recheckTimerRef = useRef<number | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const resumeTimerRef = useRef<number | null>(null);

  const runCheck = useCallback(async (options?: { resetFailures?: boolean }) => {
    if (options?.resetFailures) {
      consecutiveFailuresRef.current = 0;
    }

    setChecking(true);
    const reachable = await checkServerReachable();

    if (reachable) {
      consecutiveFailuresRef.current = 0;
      setOffline(false);
    } else {
      consecutiveFailuresRef.current += 1;

      if (consecutiveFailuresRef.current >= OFFLINE_FAILURES_BEFORE_SHOW) {
        setOffline(true);
      }
    }

    setChecking(false);
    return reachable;
  }, []);

  useEffect(() => {
    if (isNativeApp !== true) {
      return;
    }

    function clearRecheckTimer() {
      if (recheckTimerRef.current !== null) {
        window.clearInterval(recheckTimerRef.current);
        recheckTimerRef.current = null;
      }
    }

    function clearResumeTimer() {
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    }

    function scheduleRecheck() {
      clearRecheckTimer();
      recheckTimerRef.current = window.setInterval(() => {
        void runCheck();
      }, HEALTH_RECHECK_MS);
    }

    function handleOnline() {
      clearResumeTimer();
      resumeTimerRef.current = window.setTimeout(() => {
        void runCheck({ resetFailures: true }).then((reachable) => {
          if (reachable) {
            scheduleRecheck();
          }
        });
      }, RESUME_DEBOUNCE_MS);
    }

    function handleOffline() {
      consecutiveFailuresRef.current += 1;

      if (consecutiveFailuresRef.current >= OFFLINE_FAILURES_BEFORE_SHOW) {
        setOffline(true);
      }

      clearRecheckTimer();
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }

      handleOnline();
    }

    void runCheck({ resetFailures: true }).then(() => scheduleRecheck());

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    let appStateListener: { remove: () => void } | undefined;

    if (Capacitor.isNativePlatform()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          handleOnline();
        }
      }).then((listener) => {
        appStateListener = listener;
      });
    }

    return () => {
      clearRecheckTimer();
      clearResumeTimer();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      appStateListener?.remove();
    };
  }, [isNativeApp, runCheck]);

  if (isNativeApp !== true || !offline) {
    return null;
  }

  return (
    <div
      role="alertdialog"
      aria-labelledby="native-connectivity-title"
      aria-describedby="native-connectivity-description"
      className="fixed inset-0 z-90 flex items-center justify-center bg-[#09090b] px-6"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="w-full max-w-sm text-center">
        <p
          id="native-connectivity-title"
          className="text-xl font-semibold tracking-tight text-zinc-100"
        >
          Can&apos;t reach SlidePress
        </p>
        <p
          id="native-connectivity-description"
          className="mt-3 text-sm leading-6 text-zinc-400"
        >
          Check your internet connection. SlidePress needs network access to load
          your campaigns and generate slides.
        </p>

        <button
          type="button"
          disabled={checking}
          onClick={() => {
            void runCheck({ resetFailures: true }).then((reachable) => {
              if (reachable) {
                window.location.reload();
              }
            });
          }}
          className="btn-primary mt-8 w-full py-2.5 text-sm disabled:opacity-60"
        >
          {checking ? "Checking…" : "Try again"}
        </button>
      </div>
    </div>
  );
}
