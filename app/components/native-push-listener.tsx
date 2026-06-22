"use client";

import { createClient } from "@/utils/supabase/client";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import {
  dispatchPushRegistrationFailed,
  dispatchPushRegistrationSuccess,
  getStoredPushDeviceToken,
  isPushNotificationsEnabled,
  PUSH_PREFERENCE_CHANGED_EVENT,
  setPushNotificationsEnabled,
  setStoredPushDeviceToken,
} from "@/utils/push-preferences";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type ActionPerformed,
  type Token,
} from "@capacitor/push-notifications";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const RESUME_SETUP_DELAY_MS = 1_000;
const REGISTRATION_TIMEOUT_MS = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function registerPushToken(token: string): Promise<boolean> {
  const platform = Capacitor.getPlatform();

  if (platform !== "ios" && platform !== "android") {
    return false;
  }

  try {
    const response = await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

async function unregisterPushToken(token: string) {
  await fetch("/api/push/register", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

function getCampaignRouteFromNotification(action: ActionPerformed): string | null {
  const data = action.notification.data;
  const campaignId = data?.campaignId;

  if (typeof campaignId !== "string" || campaignId.length === 0) {
    return null;
  }

  const tab = data?.tab;

  if (tab === "publish") {
    return `/campaign/${campaignId}?tab=publish`;
  }

  return `/campaign/${campaignId}`;
}

export default function NativePushListener() {
  const router = useRouter();
  const registeredToken = useRef<string | null>(null);
  const setupInFlightRef = useRef(false);
  const resumeTimerRef = useRef<number | null>(null);
  const registrationTimeoutRef = useRef<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!isNativeAppRuntime()) {
      return;
    }

    let active = true;
    registeredToken.current = getStoredPushDeviceToken();

    function clearRegistrationTimeout() {
      if (registrationTimeoutRef.current !== null) {
        window.clearTimeout(registrationTimeoutRef.current);
        registrationTimeoutRef.current = null;
      }
    }

    function scheduleRegistrationTimeout() {
      clearRegistrationTimeout();
      registrationTimeoutRef.current = window.setTimeout(() => {
        if (getStoredPushDeviceToken()) {
          return;
        }

        setPushNotificationsEnabled(false);
        dispatchPushRegistrationFailed("registration_timeout");
      }, REGISTRATION_TIMEOUT_MS);
    }

    function clearResumeTimer() {
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = null;
      }
    }

    async function teardownRegistration() {
      const token = registeredToken.current ?? getStoredPushDeviceToken();

      if (token) {
        await unregisterPushToken(token);
      }

      registeredToken.current = null;
      setStoredPushDeviceToken(null);
    }

    async function syncRegisteredToken(token: string): Promise<boolean> {
      registeredToken.current = token;
      setStoredPushDeviceToken(token);
      clearRegistrationTimeout();

      dispatchPushRegistrationSuccess();

      let saved = await registerPushToken(token);

      if (!saved) {
        await sleep(1_000);
        saved = await registerPushToken(token);
      }

      return saved;
    }

    async function setupPushNotifications(options?: { forceRegister?: boolean }) {
      if (!isPushNotificationsEnabled() || setupInFlightRef.current) {
        return;
      }

      setupInFlightRef.current = true;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active || !user) {
          return;
        }

        const existingToken = registeredToken.current ?? getStoredPushDeviceToken();

        const permission = await PushNotifications.checkPermissions();

        if (!active) {
          return;
        }

        const receivePermission =
          permission.receive === "granted"
            ? permission
            : await PushNotifications.requestPermissions();

        if (!active) {
          return;
        }

        if (receivePermission.receive !== "granted") {
          if (!existingToken) {
            setPushNotificationsEnabled(false);
            dispatchPushRegistrationFailed(
              receivePermission.receive === "denied" ? "denied" : "not_granted",
            );
          }

          return;
        }

        if (existingToken && !options?.forceRegister) {
          await syncRegisteredToken(existingToken);
          return;
        }

        if (Capacitor.getPlatform() === "ios") {
          await sleep(300);
        }

        scheduleRegistrationTimeout();
        await PushNotifications.register();
      } finally {
        setupInFlightRef.current = false;
      }
    }

    function scheduleSetupOnResume() {
      clearResumeTimer();
      resumeTimerRef.current = window.setTimeout(() => {
        void setupPushNotifications();
      }, RESUME_SETUP_DELAY_MS);
    }

    function handlePreferenceChanged() {
      if (!isPushNotificationsEnabled()) {
        void teardownRegistration();
        return;
      }

      void setupPushNotifications({ forceRegister: true });
    }

    const registrationListener = PushNotifications.addListener(
      "registration",
      (token: Token) => {
        void syncRegisteredToken(token.value);
      },
    );

    const registrationErrorListener = PushNotifications.addListener(
      "registrationError",
      (registrationError: { error?: string }) => {
        const errorMessage =
          typeof registrationError?.error === "string"
            ? registrationError.error
            : "Unknown registration error";

        console.error("Push registration failed:", errorMessage);
        clearRegistrationTimeout();

        const existingToken =
          registeredToken.current ?? getStoredPushDeviceToken();

        if (existingToken) {
          void syncRegisteredToken(existingToken);
          return;
        }

        setPushNotificationsEnabled(false);
        dispatchPushRegistrationFailed("registration_error", errorMessage);
      },
    );

    const actionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        const route = getCampaignRouteFromNotification(action);

        if (route) {
          router.push(route);
        }
      },
    );

    window.addEventListener(
      PUSH_PREFERENCE_CHANGED_EVENT,
      handlePreferenceChanged,
    );

    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (active && user && isPushNotificationsEnabled()) {
        void setupPushNotifications();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        void teardownRegistration();
        return;
      }

      if (!isPushNotificationsEnabled()) {
        return;
      }

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void setupPushNotifications();
        return;
      }

      if (event === "TOKEN_REFRESHED" && registeredToken.current) {
        void syncRegisteredToken(registeredToken.current);
      }
    });

    let appStateListener: { remove: () => void } | undefined;

    if (Capacitor.isNativePlatform()) {
      void App.addListener("appStateChange", ({ isActive }) => {
        if (isActive && isPushNotificationsEnabled()) {
          scheduleSetupOnResume();
        }
      }).then((listener) => {
        appStateListener = listener;
      });
    }

    return () => {
      active = false;
      clearResumeTimer();
      clearRegistrationTimeout();
      window.removeEventListener(
        PUSH_PREFERENCE_CHANGED_EVENT,
        handlePreferenceChanged,
      );
      void registrationListener.then((listener) => listener.remove());
      void registrationErrorListener.then((listener) => listener.remove());
      void actionListener.then((listener) => listener.remove());
      subscription.unsubscribe();
      appStateListener?.remove();
    };
  }, [router, supabase]);

  return null;
}
