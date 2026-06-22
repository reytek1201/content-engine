"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import type { PushNotificationPreferences } from "@/types/push-notification-preferences";
import { DEFAULT_PUSH_NOTIFICATION_PREFERENCES } from "@/types/push-notification-preferences";
import {
  dispatchPushPreferenceChanged,
  getStoredPushDeviceToken,
  isPushNotificationsEnabled,
  PUSH_REGISTRATION_FAILED_EVENT,
  PUSH_REGISTRATION_SUCCESS_EVENT,
  setPushNotificationsEnabled,
  setStoredPushDeviceToken,
} from "@/utils/push-preferences";
import { useCallback, useEffect, useState } from "react";

async function unregisterPushToken(token: string) {
  await fetch("/api/push/register", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

async function fetchPushPreferences(): Promise<PushNotificationPreferences> {
  const response = await fetch("/api/push/preferences");
  const data = (await response.json()) as {
    success?: boolean;
    preferences?: PushNotificationPreferences;
  };

  if (response.ok && data.success && data.preferences) {
    return data.preferences;
  }

  return { ...DEFAULT_PUSH_NOTIFICATION_PREFERENCES };
}

async function savePushPreferences(
  patch: Partial<PushNotificationPreferences>,
): Promise<PushNotificationPreferences> {
  const response = await fetch("/api/push/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  const data = (await response.json()) as {
    success?: boolean;
    preferences?: PushNotificationPreferences;
    error?: string;
  };

  if (!response.ok || !data.success || !data.preferences) {
    throw new Error(data.error ?? "Failed to save notification preferences");
  }

  return data.preferences;
}

async function resetPushPreferences(): Promise<PushNotificationPreferences> {
  const response = await fetch("/api/push/preferences", { method: "PUT" });
  const data = (await response.json()) as {
    success?: boolean;
    preferences?: PushNotificationPreferences;
    error?: string;
  };

  if (!response.ok || !data.success || !data.preferences) {
    throw new Error(data.error ?? "Failed to initialize notification preferences");
  }

  return data.preferences;
}

function PreferenceToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${checked ? "Disable" : "Enable"} ${label}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function PushSettings() {
  const isNativeApp = useIsNativeApp();
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState<PushNotificationPreferences>(
    DEFAULT_PUSH_NOTIFICATION_PREFERENCES,
  );
  const [busy, setBusy] = useState(false);
  const [activating, setActivating] = useState(false);
  const [preferenceBusyKey, setPreferenceBusyKey] = useState<
    keyof PushNotificationPreferences | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    try {
      const next = await fetchPushPreferences();
      setPreferences(next);
    } catch {
      setPreferences({ ...DEFAULT_PUSH_NOTIFICATION_PREFERENCES });
    }
  }, []);

  useEffect(() => {
    if (isNativeApp !== true) {
      return;
    }

    const storedToken = getStoredPushDeviceToken();
    const pushEnabled = isPushNotificationsEnabled();

    setEnabled(pushEnabled);

    if (pushEnabled && storedToken) {
      setError(null);
      setActivating(false);
      void loadPreferences();
      return;
    }

    if (pushEnabled && !storedToken) {
      setActivating(true);
      setBusy(true);
      setError(null);
      dispatchPushPreferenceChanged();
      void loadPreferences();
      return;
    }
  }, [isNativeApp, loadPreferences]);

  useEffect(() => {
    if (isNativeApp !== true) {
      return;
    }

    function handleRegistrationSuccess() {
      setBusy(false);
      setActivating(false);
      setEnabled(true);
      setError(null);
      setSuccessMessage("Push notifications are enabled on this device.");
      void loadPreferences();
    }

    function handleRegistrationFailed(event: Event) {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;

      if (getStoredPushDeviceToken()) {
        setBusy(false);
        setActivating(false);
        setEnabled(true);
        setError(null);
        setSuccessMessage("Push notifications are enabled on this device.");
        return;
      }

      setBusy(false);
      setActivating(false);
      setEnabled(false);
      setSuccessMessage(null);
      setPushNotificationsEnabled(false);

      if (detail?.reason === "denied") {
        setError(
          "Notification permission was denied. Enable notifications for SlidePress in system settings to try again.",
        );
        return;
      }

      if (detail?.reason === "registration_error") {
        setError(
          "Could not register for push notifications. Try turning notifications off and on again, or allow notifications for SlidePress in system settings.",
        );
        return;
      }

      if (detail?.reason === "registration_timeout") {
        setError(
          "Push registration timed out. Check notification permissions for SlidePress in system settings, then try again.",
        );
        return;
      }

      if (detail?.reason === "not_granted") {
        setError(
          "Notification permission is required. Turn push notifications on again and tap Allow when prompted.",
        );
        return;
      }

      setError("Could not register for push notifications. Try again later.");
    }

    window.addEventListener(
      PUSH_REGISTRATION_SUCCESS_EVENT,
      handleRegistrationSuccess,
    );
    window.addEventListener(
      PUSH_REGISTRATION_FAILED_EVENT,
      handleRegistrationFailed,
    );

    return () => {
      window.removeEventListener(
        PUSH_REGISTRATION_SUCCESS_EVENT,
        handleRegistrationSuccess,
      );
      window.removeEventListener(
        PUSH_REGISTRATION_FAILED_EVENT,
        handleRegistrationFailed,
      );
    };
  }, [isNativeApp, loadPreferences]);

  if (isNativeApp !== true) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        Push notifications are only available in the SlidePress mobile app.
      </p>
    );
  }

  async function handleMasterToggle() {
    if (busy || activating) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setBusy(true);

    if (enabled) {
      const token = getStoredPushDeviceToken();

      if (token) {
        await unregisterPushToken(token);
      }

      setStoredPushDeviceToken(null);
      setPushNotificationsEnabled(false);
      setEnabled(false);
      setActivating(false);
      dispatchPushPreferenceChanged();
      setSuccessMessage("Push notifications turned off.");
      setBusy(false);
      return;
    }

    try {
      const nextPreferences = await resetPushPreferences();
      setPreferences(nextPreferences);
    } catch (loadError) {
      setBusy(false);
      setActivating(false);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not save notification preferences.",
      );
      return;
    }

    setActivating(true);
    setPushNotificationsEnabled(true);
    dispatchPushPreferenceChanged();
    setSuccessMessage(
      "Requesting permission… If prompted, allow notifications to finish setup.",
    );
    // Stay busy until NativePushListener dispatches success or failure.
  }

  const masterToggleOn = enabled || activating;

  async function handlePreferenceChange(
    key: keyof PushNotificationPreferences,
    value: boolean,
  ) {
    if (!enabled || preferenceBusyKey) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setPreferenceBusyKey(key);

    const previous = preferences;

    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    try {
      const next = await savePushPreferences({ [key]: value });
      setPreferences(next);
    } catch (saveError) {
      setPreferences(previous);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update notification preference.",
      );
    } finally {
      setPreferenceBusyKey(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Push notifications
          </p>
          <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
            {masterToggleOn
              ? activating
                ? "Waiting for permission and device registration…"
                : "Choose which campaign events send alerts to this device."
              : "Turn on to get alerts when long-running campaign work finishes."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={masterToggleOn}
          aria-label={`${masterToggleOn ? "Disable" : "Enable"} push notifications`}
          disabled={busy || activating}
          onClick={() => void handleMasterToggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            masterToggleOn ? "bg-primary" : "bg-border"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition duration-200 ${
              masterToggleOn ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {enabled && !activating ? (
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-background/30 px-4">
          <PreferenceToggle
            label="Images ready"
            description="All slide images finished generating."
            checked={preferences.notifyImagesReady}
            disabled={preferenceBusyKey !== null}
            onChange={(value) =>
              void handlePreferenceChange("notifyImagesReady", value)
            }
          />
          <PreferenceToggle
            label="Video export ready"
            description="A Reel-ready MP4 finished rendering."
            checked={preferences.notifyVideoExportReady}
            disabled={preferenceBusyKey !== null}
            onChange={(value) =>
              void handlePreferenceChange("notifyVideoExportReady", value)
            }
          />
          <PreferenceToggle
            label="Platform publish"
            description="YouTube Shorts or TikTok publish succeeded or failed."
            checked={preferences.notifyPlatformPublish}
            disabled={preferenceBusyKey !== null}
            onChange={(value) =>
              void handlePreferenceChange("notifyPlatformPublish", value)
            }
          />
        </div>
      ) : null}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {successMessage && !error && (
        <p className="mt-3 text-sm text-emerald-400">{successMessage}</p>
      )}
    </div>
  );
}
