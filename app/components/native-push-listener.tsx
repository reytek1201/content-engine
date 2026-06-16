"use client";

import { createClient } from "@/utils/supabase/client";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type Token,
} from "@capacitor/push-notifications";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

async function registerPushToken(token: string) {
  const platform = Capacitor.getPlatform();

  if (platform !== "ios" && platform !== "android") {
    return;
  }

  await fetch("/api/push/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, platform }),
  });
}

async function unregisterPushToken(token: string) {
  await fetch("/api/push/register", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

function getCampaignIdFromNotification(
  action: ActionPerformed,
): string | null {
  const data = action.notification.data;
  const campaignId = data?.campaignId;

  return typeof campaignId === "string" && campaignId.length > 0
    ? campaignId
    : null;
}

export default function NativePushListener() {
  const router = useRouter();
  const registeredToken = useRef<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isNativeAppRuntime()) {
      return;
    }

    let active = true;

    async function setupPushNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user) {
        return;
      }

      const permission = await PushNotifications.requestPermissions();

      if (!active || permission.receive !== "granted") {
        return;
      }

      await PushNotifications.register();
    }

    const registrationListener = PushNotifications.addListener(
      "registration",
      (token: Token) => {
        registeredToken.current = token.value;
        void registerPushToken(token.value);
      },
    );

    const registrationErrorListener = PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error("Push registration failed:", error);
      },
    );

    const actionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        const campaignId = getCampaignIdFromNotification(action);

        if (campaignId) {
          router.push(`/campaign/${campaignId}`);
        }
      },
    );

    void setupPushNotifications();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user && registeredToken.current) {
        void unregisterPushToken(registeredToken.current);
        registeredToken.current = null;
        return;
      }

      if (session?.user) {
        void setupPushNotifications();
      }
    });

    return () => {
      active = false;
      void registrationListener.then((listener) => listener.remove());
      void registrationErrorListener.then((listener) => listener.remove());
      void actionListener.then((listener) => listener.remove());
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  return null;
}
