"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { useState } from "react";

export default function PushTestSection() {
  const isNativeApp = useIsNativeApp();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (process.env.NEXT_PUBLIC_ALLOW_PUSH_TEST !== "true") {
    return null;
  }

  if (isNativeApp !== true) {
    return null;
  }

  async function handleSendTestPush() {
    setSending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        sent?: number;
        failed?: number;
        errors?: string[];
        removedStaleTokens?: number;
      };

      if (!response.ok || !data.success) {
        const detail =
          data.errors?.[0] ?? data.error ?? "Failed to send test push";
        throw new Error(detail);
      }

      const staleNote =
        data.removedStaleTokens && data.removedStaleTokens > 0
          ? ` Removed ${data.removedStaleTokens} stale token(s).`
          : "";

      setMessage(
        `Test push sent to ${data.sent ?? 0} device(s). Background the app to see the banner.${staleNote}`,
      );
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to send test push",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-foreground">Push test (dev)</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Send a test notification to this device without generating images.
        Background the app after tapping send.
      </p>

      <button
        type="button"
        disabled={sending}
        onClick={() => void handleSendTestPush()}
        className="mt-6 inline-flex items-center justify-center rounded-xl border border-amber-700/50 bg-amber-950/30 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:border-amber-600/60 hover:bg-amber-950/50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? "Sending…" : "Send test push"}
      </button>

      {message && (
        <p className="mt-4 text-sm text-emerald-200">{message}</p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}
    </section>
  );
}
