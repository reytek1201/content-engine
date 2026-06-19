"use client";

import type { PlatformConnectionPublic } from "@/types/platform-connection";
import type { PlatformPostPublic } from "@/types/platform-post";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface PublishReadinessResponse {
  success: boolean;
  connected: boolean;
  connection: PlatformConnectionPublic | null;
  hasYoutubeCaption: boolean;
  hasVideoExport: boolean;
  canPublish: boolean;
  latestPost: PlatformPostPublic | null;
  error?: string;
}

interface PublishResponse {
  success: boolean;
  error?: string;
  code?: string;
  authorizeUrl?: string;
  post?: PlatformPostPublic;
  video?: {
    shortsUrl: string;
    watchUrl: string;
  };
}

interface CampaignYouTubePublishPanelProps {
  campaignId: string;
  disabled?: boolean;
  refreshKey?: number;
}

function YouTubeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-red-500"
      aria-hidden
    >
      <path d="M21.8 8.001a2.5 2.5 0 0 0-1.76-1.77C18.36 6 12 6 12 6s-6.36 0-8.04.231A2.5 2.5 0 0 0 2.2 8.001 26.3 26.3 0 0 0 2 12a26.3 26.3 0 0 0 .2 3.999 2.5 2.5 0 0 0 1.76 1.77C5.64 18 12 18 12 18s6.36 0 8.04-.231a2.5 2.5 0 0 0 1.76-1.77A26.3 26.3 0 0 0 22 12a26.3 26.3 0 0 0-.2-3.999Z" />
      <path fill="#fff" d="m10 15 5-3-5-3v6Z" />
    </svg>
  );
}

export default function CampaignYouTubePublishPanel({
  campaignId,
  disabled = false,
  refreshKey = 0,
}: CampaignYouTubePublishPanelProps) {
  const [readiness, setReadiness] = useState<PublishReadinessResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  const loadReadiness = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/platforms/youtube/publish-readiness?campaignId=${encodeURIComponent(campaignId)}`,
      );
      const data = (await response.json()) as PublishReadinessResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load YouTube publish status");
      }

      setReadiness(data);

      if (data.latestPost?.status === "published" && data.latestPost.externalUrl) {
        setPublishedUrl(data.latestPost.externalUrl);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load YouTube publish status",
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness, refreshKey]);

  async function handlePublish() {
    setIsPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/platforms/youtube/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId }),
      });

      const data = (await response.json()) as PublishResponse;

      if (response.status === 403 && data.code === "UPLOAD_SCOPE_REQUIRED") {
        setError(
          "Upload permission required. Grant access to publish Shorts to YouTube.",
        );
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to publish to YouTube");
      }

      const shortsUrl =
        data.video?.shortsUrl ?? data.post?.externalUrl ?? null;

      setPublishedUrl(shortsUrl);
      setMessage("Published to YouTube Shorts.");
      await loadReadiness();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish to YouTube",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  function handleGrantUploadPermission() {
    window.location.href = "/api/platforms/youtube/upload-authorize";
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-background/40 p-4 sm:rounded-xl sm:p-5">
        <p className="text-sm text-muted-foreground">Checking YouTube…</p>
      </div>
    );
  }

  if (!readiness?.hasYoutubeCaption) {
    return null;
  }

  const needsUploadScope =
    error?.includes("Upload permission required") ?? false;

  let helperText = "Post your 9:16 Quick Reel with YouTube Shorts caption.";

  if (!readiness.connected) {
    helperText = "Connect YouTube in Settings before posting.";
  } else if (!readiness.hasVideoExport) {
    helperText =
      "Export a 9:16 video above first, then post directly to YouTube.";
  } else if (publishedUrl) {
    helperText = "Your latest Short is on YouTube. Post again after a new export.";
  }

  const canClickPublish =
    readiness.canPublish && !disabled && !isPublishing && !needsUploadScope;

  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 sm:rounded-xl sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70">
          <YouTubeIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            YouTube Shorts
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {helperText}
          </p>
          {readiness.connection ? (
            <p className="mt-2 text-xs text-foreground">
              Channel:{" "}
              <span className="font-medium">
                {readiness.connection.accountLabel}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!readiness.connected ? (
          <Link
            href="/settings/connected-accounts"
            className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Connect YouTube
          </Link>
        ) : needsUploadScope ? (
          <button
            type="button"
            onClick={handleGrantUploadPermission}
            className="btn-primary w-full py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Grant upload permission
          </button>
        ) : (
          <button
            type="button"
            disabled={!canClickPublish}
            onClick={() => void handlePublish()}
            className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {isPublishing ? "Publishing to YouTube…" : "Post to YouTube Shorts"}
          </button>
        )}

        {publishedUrl ? (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto"
          >
            View on YouTube
          </a>
        ) : null}
      </div>

      {isPublishing ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Uploading and processing on YouTube. This can take a few minutes —
          keep this page open.
        </p>
      ) : null}

      {message ? (
        <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-200">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2.5 text-xs text-red-300">
          {error}
        </div>
      ) : null}
    </div>
  );
}
