"use client";

import type { PlatformConnectionPublic } from "@/types/platform-connection";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface YouTubeStatusResponse {
  success: boolean;
  connected: boolean;
  connection: PlatformConnectionPublic | null;
  error?: string;
}

function YouTubeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 text-red-500"
      aria-hidden
    >
      <path d="M21.8 8.001a2.5 2.5 0 0 0-1.76-1.77C18.36 6 12 6 12 6s-6.36 0-8.04.231A2.5 2.5 0 0 0 2.2 8.001 26.3 26.3 0 0 0 2 12a26.3 26.3 0 0 0 .2 3.999 2.5 2.5 0 0 0 1.76 1.77C5.64 18 12 18 12 18s6.36 0 8.04-.231a2.5 2.5 0 0 0 1.76-1.77A26.3 26.3 0 0 0 22 12a26.3 26.3 0 0 0-.2-3.999Z" />
      <path fill="#fff" d="m10 15 5-3-5-3v6Z" />
    </svg>
  );
}

export default function ConnectedAccountsSettings() {
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<PlatformConnectionPublic | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/platforms/youtube");
      const data = (await response.json()) as YouTubeStatusResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load connected accounts");
      }

      setConnection(data.connection);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load connected accounts",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    const youtubeStatus = searchParams.get("youtube");

    if (youtubeStatus === "connected") {
      setMessage("YouTube channel connected.");
      void loadStatus();
      return;
    }

    if (youtubeStatus === "denied") {
      const reason = searchParams.get("reason");
      setError(
        reason
          ? `YouTube connection was denied: ${reason}`
          : "YouTube connection was cancelled.",
      );
      return;
    }

    if (youtubeStatus === "error") {
      const reason = searchParams.get("reason");
      const reasonMessages: Record<string, string> = {
        state:
          "Connection timed out or was interrupted. Try Connect YouTube again.",
        session_mismatch:
          "Signed in as a different SlidePress account. Sign out and try again.",
        missing_code: "Google did not return an authorization code. Try again.",
        database:
          "Server database is not ready for YouTube connections. Run the platform_connections migration in Supabase.",
        channel:
          "No YouTube channel found on that Google account. Create one at youtube.com first.",
        token:
          "Google token exchange failed. Check YouTube Client ID and secret in Vercel.",
        connect: "Could not start YouTube connection. Check server configuration.",
        unknown: "Could not connect YouTube. Try again.",
      };

      setError(
        reason && reasonMessages[reason]
          ? reasonMessages[reason]
          : reasonMessages.unknown,
      );
    }
  }, [loadStatus, searchParams]);

  function handleConnect() {
    window.location.href = "/api/platforms/youtube/connect";
  }

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/platforms/youtube", {
        method: "DELETE",
      });
      const data = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to disconnect YouTube");
      }

      setConnection(null);
      setMessage("YouTube disconnected.");
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Failed to disconnect YouTube",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border/60 bg-secondary/20">
        <div className="flex items-start gap-4 px-4 py-4">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/70">
            <YouTubeIcon />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">YouTube</h2>
              {loading ? (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  Loading…
                </span>
              ) : connection ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300">
                  Connected
                </span>
              ) : (
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  Not connected
                </span>
              )}
            </div>

            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Connect your YouTube channel to post Shorts from SlidePress.
              Upload permission is requested the first time you publish.
            </p>

            {connection ? (
              <p className="mt-2 text-sm text-foreground">
                Channel:{" "}
                <span className="font-medium">{connection.accountLabel}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border/50 px-4 py-3">
          {connection ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDisconnect()}
              className="text-sm font-medium text-red-400 transition active:opacity-70 disabled:opacity-60"
            >
              {busy ? "Disconnecting…" : "Disconnect YouTube"}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || busy}
              onClick={handleConnect}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              Connect YouTube
            </button>
          )}
        </div>
      </div>

      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
