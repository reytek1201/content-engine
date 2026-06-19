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

const handledAuthCallbacks = new Set<string>();

async function handleNativeAuthUrl(
  url: string,
  navigate: (path: string) => void,
) {
  const callback = parseNativeAuthCallback(url);
  if (!callback) {
    return;
  }

  const callbackKey = getNativeAuthCallbackKey(callback);
  if (handledAuthCallbacks.has(callbackKey)) {
    return;
  }

  handledAuthCallbacks.add(callbackKey);

  try {
    await Browser.close();
  } catch {
    // Browser may already be closed.
  }

  const { error, nextPath } = await completeNativeAuthCallback(callback);

  if (error) {
    handledAuthCallbacks.delete(callbackKey);
    setNativeOAuthInProgress(false);
    navigate("/login?error=auth_callback_error");
    return;
  }

  setNativeOAuthInProgress(false);
  completeNativeOAuthNavigation(nextPath, navigate);
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
