"use client";

import type { PlatformConnectionPublic } from "@/types/platform-connection";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

interface PlatformStatusResponse {
  success: boolean;
  connected: boolean;
  connection: PlatformConnectionPublic | null;
  error?: string;
}

type PlatformKey = "youtube" | "tiktok";

const PLATFORM_ERROR_MESSAGES: Record<
  PlatformKey,
  Record<string, string>
> = {
  youtube: {
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
  },
  tiktok: {
    state:
      "Connection timed out or was interrupted. Try Connect TikTok again.",
    session_mismatch:
      "Signed in as a different SlidePress account. Sign out and try again.",
    missing_code: "TikTok did not return an authorization code. Try again.",
    database:
      "Server database is not ready for TikTok connections. Run the platform_connections migration in Supabase.",
    account: "Could not load your TikTok profile. Try connecting again.",
    token:
      "TikTok token exchange failed. Check Client key and secret in Vercel.",
    connect: "Could not start TikTok connection. Check server configuration.",
    unknown: "Could not connect TikTok. Try again.",
  },
};

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

function TikTokIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5 text-foreground"
      aria-hidden
    >
      <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.1 4.1 0 0 1-1-.48z" />
    </svg>
  );
}

function PlatformConnectionCard({
  platform,
  title,
  description,
  accountLabel,
  icon,
  connection,
  loading,
  busy,
  onConnect,
  onDisconnect,
}: {
  platform: PlatformKey;
  title: string;
  description: string;
  accountLabel: string;
  icon: ReactNode;
  connection: PlatformConnectionPublic | null;
  loading: boolean;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const connectLabel = platform === "youtube" ? "Connect YouTube" : "Connect TikTok";
  const disconnectLabel =
    platform === "youtube" ? "Disconnect YouTube" : "Disconnect TikTok";

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-secondary/20">
      <div className="flex items-start gap-4 px-4 py-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/70">
          {icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
            {description}
          </p>

          {connection ? (
            <p className="mt-2 text-sm text-foreground">
              {accountLabel}:{" "}
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
            onClick={onDisconnect}
            className="text-sm font-medium text-red-400 transition active:opacity-70 disabled:opacity-60"
          >
            {busy ? "Disconnecting…" : disconnectLabel}
          </button>
        ) : (
          <button
            type="button"
            disabled={loading || busy}
            onClick={onConnect}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {connectLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConnectedAccountsSettings() {
  const searchParams = useSearchParams();
  const [youtubeConnection, setYoutubeConnection] =
    useState<PlatformConnectionPublic | null>(null);
  const [tiktokConnection, setTiktokConnection] =
    useState<PlatformConnectionPublic | null>(null);
  const [loadingYoutube, setLoadingYoutube] = useState(true);
  const [loadingTiktok, setLoadingTiktok] = useState(true);
  const [busyPlatform, setBusyPlatform] = useState<PlatformKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPlatformStatus = useCallback(
    async (platform: PlatformKey) => {
      const setLoading =
        platform === "youtube" ? setLoadingYoutube : setLoadingTiktok;
      const setConnection =
        platform === "youtube" ? setYoutubeConnection : setTiktokConnection;

      setLoading(true);

      try {
        const response = await fetch(`/api/platforms/${platform}`);
        const data = (await response.json()) as PlatformStatusResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? `Failed to load ${platform} status`);
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
    },
    [],
  );

  const loadStatus = useCallback(async () => {
    setError(null);
    await Promise.all([
      loadPlatformStatus("youtube"),
      loadPlatformStatus("tiktok"),
    ]);
  }, [loadPlatformStatus]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    for (const platform of ["youtube", "tiktok"] as const) {
      const status = searchParams.get(platform);

      if (status === "connected") {
        setMessage(
          platform === "youtube"
            ? "YouTube channel connected."
            : "TikTok account connected.",
        );
        void loadPlatformStatus(platform);
        return;
      }

      if (status === "denied") {
        const reason = searchParams.get("reason");
        setError(
          reason
            ? `${platform === "youtube" ? "YouTube" : "TikTok"} connection was denied: ${reason}`
            : `${platform === "youtube" ? "YouTube" : "TikTok"} connection was cancelled.`,
        );
        return;
      }

      if (status === "error") {
        const reason = searchParams.get("reason");
        const reasonMessages = PLATFORM_ERROR_MESSAGES[platform];

        setError(
          reason && reasonMessages[reason]
            ? reasonMessages[reason]
            : reasonMessages.unknown,
        );
        return;
      }
    }
  }, [loadPlatformStatus, searchParams]);

  async function handleDisconnect(platform: PlatformKey) {
    setBusyPlatform(platform);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/platforms/${platform}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ??
            `Failed to disconnect ${platform === "youtube" ? "YouTube" : "TikTok"}`,
        );
      }

      if (platform === "youtube") {
        setYoutubeConnection(null);
        setMessage("YouTube disconnected.");
      } else {
        setTiktokConnection(null);
        setMessage("TikTok disconnected.");
      }
    } catch (disconnectError) {
      setError(
        disconnectError instanceof Error
          ? disconnectError.message
          : "Failed to disconnect account",
      );
    } finally {
      setBusyPlatform(null);
    }
  }

  return (
    <div className="space-y-4">
      <PlatformConnectionCard
        platform="youtube"
        title="YouTube"
        description="Connect your YouTube channel to post Shorts from SlidePress. Upload permission is requested the first time you publish."
        accountLabel="Channel"
        icon={<YouTubeIcon />}
        connection={youtubeConnection}
        loading={loadingYoutube}
        busy={busyPlatform === "youtube"}
        onConnect={() => {
          window.location.href = "/api/platforms/youtube/connect";
        }}
        onDisconnect={() => void handleDisconnect("youtube")}
      />

      <PlatformConnectionCard
        platform="tiktok"
        title="TikTok"
        description="Connect your TikTok account to post videos from SlidePress. Posting permission will be requested when direct publish ships."
        accountLabel="Account"
        icon={<TikTokIcon />}
        connection={tiktokConnection}
        loading={loadingTiktok}
        busy={busyPlatform === "tiktok"}
        onConnect={() => {
          window.location.href = "/api/platforms/tiktok/connect";
        }}
        onDisconnect={() => void handleDisconnect("tiktok")}
      />

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
