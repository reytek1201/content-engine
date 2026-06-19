"use client";

import {
  completeNativeAuthCallback,
  completeNativeOAuthNavigation,
} from "@/utils/native-oauth-session";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import {
  getNativeAuthCallbackKey,
  parseNativeAuthCallback,
} from "@/utils/native-oauth";
import { setNativeOAuthInProgress } from "@/utils/native-oauth-in-progress";
import { createClient } from "@/utils/supabase/client";
import { configureRevenueCat } from "@/utils/revenuecat";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const HANDLED_CALLBACKS_KEY = "slidepress-handled-auth-callbacks";

function hasHandledCallback(key: string): boolean {
  try {
    const raw = sessionStorage.getItem(HANDLED_CALLBACKS_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    return list.includes(key);
  } catch {
    return false;
  }
}

function markCallbackHandled(key: string): void {
  try {
    const raw = sessionStorage.getItem(HANDLED_CALLBACKS_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(key)) {
      list.push(key);
      // Cap to avoid unbounded growth across many sign-ins.
      sessionStorage.setItem(
        HANDLED_CALLBACKS_KEY,
        JSON.stringify(list.slice(-10)),
      );
    }
  } catch {
    // sessionStorage unavailable — fail open.
  }
}

function unmarkCallbackHandled(key: string): void {
  try {
    const raw = sessionStorage.getItem(HANDLED_CALLBACKS_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    sessionStorage.setItem(
      HANDLED_CALLBACKS_KEY,
      JSON.stringify(list.filter((k) => k !== key)),
    );
  } catch {
    // sessionStorage unavailable — best effort.
  }
}

async function handleNativeAuthUrl(
  url: string,
  navigate: (path: string) => void,
) {
  const callback = parseNativeAuthCallback(url);
  if (!callback) {
    return;
  }

  const callbackKey = getNativeAuthCallbackKey(callback);
  if (hasHandledCallback(callbackKey)) {
    return;
  }

  markCallbackHandled(callbackKey);

  try {
    await Browser.close();
  } catch {
    // Browser may already be closed.
  }

  const { error, nextPath } = await completeNativeAuthCallback(callback);

  if (error) {
    unmarkCallbackHandled(callbackKey);
    setNativeOAuthInProgress(false);
    navigate("/login?error=auth_callback_error");
    return;
  }

  setNativeOAuthInProgress(false);
  await completeNativeOAuthNavigation(nextPath, navigate);
}

export default function NativeAuthListener() {
  const router = useRouter();
  const isHandlingRef = useRef(false);

  // Configure RevenueCat for all login paths (Apple, email, Google, biometric restore).
  useEffect(() => {
    if (!isNativeAppRuntime()) return;

    const supabase = createClient();

    // Handle any existing session on startup (biometric restore, app re-open).
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) void configureRevenueCat(user.id);
    }).catch(() => {});

    // Handle any new sign-in event (covers Apple, email/password, Google OAuth).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user?.id) {
          void configureRevenueCat(session.user.id);
        }
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isNativeAppRuntime()) {
      return;
    }

    function navigate(path: string) {
      router.replace(path);
      router.refresh();
    }

    async function onAuthUrl(url: string) {
      if (isHandlingRef.current) {
        return;
      }

      isHandlingRef.current = true;
      try {
        await handleNativeAuthUrl(url, navigate);
      } finally {
        isHandlingRef.current = false;
      }
    }

    const appUrlListener = App.addListener("appUrlOpen", ({ url }) => {
      void onAuthUrl(url);
    });

    App.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) {
          void onAuthUrl(launch.url);
        }
      })
      .catch(() => {});

    return () => {
      void appUrlListener.then((listener) => listener.remove());
    };
  }, [router]);

  return null;
}
