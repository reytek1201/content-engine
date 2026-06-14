"use client";

import { createClient } from "@/utils/supabase/client";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import { parseNativeOAuthCallback } from "@/utils/native-oauth";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const handledOAuthCodes = new Set<string>();

async function handleNativeAuthUrl(
  url: string,
  navigate: (path: string) => void,
) {
  const callback = parseNativeOAuthCallback(url);
  if (!callback) {
    return;
  }

  if (handledOAuthCodes.has(callback.code)) {
    return;
  }

  handledOAuthCodes.add(callback.code);

  try {
    await Browser.close();
  } catch {
    // Browser may already be closed.
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(callback.code);

  if (error) {
    handledOAuthCodes.delete(callback.code);
    navigate("/login?error=auth_callback_error");
    return;
  }

  await supabase.auth.getSession();
  navigate(callback.next);
}

export default function NativeAuthListener() {
  const router = useRouter();
  const isHandlingRef = useRef(false);

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
