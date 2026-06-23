"use client";

import { parseNativeAppDeepLink } from "@/utils/native-app-deep-link";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import {
  fetchAndSyncWidgetSnapshot,
  writeWidgetSnapshot,
} from "@/utils/native-widget-plugin";
import { buildSignedOutWidgetSnapshot } from "@/utils/widget-snapshot";
import { createClient } from "@/utils/supabase/client";
import { App } from "@capacitor/app";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const RESUME_SYNC_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function NativeWidgetSync() {
  const router = useRouter();
  const isHandlingDeepLinkRef = useRef(false);

  useEffect(() => {
    if (!isNativeAppRuntime()) {
      return;
    }

    const supabase = createClient();

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        void fetchAndSyncWidgetSnapshot();
      } else {
        void writeWidgetSnapshot(buildSignedOutWidgetSnapshot());
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        void writeWidgetSnapshot(buildSignedOutWidgetSnapshot());
        return;
      }

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void fetchAndSyncWidgetSnapshot();
      }
    });

    const resumeListener = App.addListener("resume", () => {
      void sleep(RESUME_SYNC_DELAY_MS).then(() => fetchAndSyncWidgetSnapshot());
    });

    async function onAppUrl(url: string) {
      const path = parseNativeAppDeepLink(url);

      if (!path || isHandlingDeepLinkRef.current) {
        return;
      }

      isHandlingDeepLinkRef.current = true;

      try {
        router.replace(path);
        router.refresh();
      } finally {
        isHandlingDeepLinkRef.current = false;
      }
    }

    const appUrlListener = App.addListener("appUrlOpen", ({ url }) => {
      void onAppUrl(url);
    });

    App.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) {
          void onAppUrl(launch.url);
        }
      })
      .catch(() => {});

    return () => {
      subscription.unsubscribe();
      void resumeListener.then((listener) => listener.remove());
      void appUrlListener.then((listener) => listener.remove());
    };
  }, [router]);

  return null;
}
