"use client";

import { getTikTokPublishErrorMessage } from "@/utils/tiktok/publish-errors";
import { buildPlatformAuthorizeUrl } from "@/utils/platforms/oauth-return";
import type { PlatformConnectionPublic } from "@/types/platform-connection";
import type { PlatformPostPublic } from "@/types/platform-post";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface PublishReadinessResponse {
  success: boolean;
  connected: boolean;
  connection: PlatformConnectionPublic | null;
  hasPublishScope: boolean;
  hasTiktokCaption: boolean;
  hasVideoExport: boolean;
  currentExportId: string | null;
  alreadyPublished: boolean;
  isUploading: boolean;
  canPublish: boolean;
  postForCurrentExport: PlatformPostPublic | null;
  error?: string;
}

interface PublishResponse {
  success: boolean;
  alreadyPublished?: boolean;
  error?: string;
  code?: string;
  authorizeUrl?: string;
  post?: PlatformPostPublic;
  video?: {
    profileUrl: string;
    videoUrl: string | null;
  };
}

interface CampaignTikTokPublishPanelProps {
  campaignId: string;
  disabled?: boolean;
  refreshKey?: number;
  imagesComplete?: boolean;
  hasCaptions?: boolean;
  onPublishComplete?: () => void;
}

function TikTokIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-foreground"
      aria-hidden
    >
      <path d="M16.6 5.82s.51.5 0 0A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.1 4.1 0 0 1-1-.48z" />
    </svg>
  );
}

function TikTokPanelShell({
  helperText,
  children,
}: {
  helperText: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 sm:rounded-xl sm:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/70">
          <TikTokIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">TikTok</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {helperText}
          </p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default function CampaignTikTokPublishPanel({
  campaignId,
  disabled = false,
  refreshKey = 0,
  imagesComplete = false,
  hasCaptions = false,
  onPublishComplete,
}: CampaignTikTokPublishPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [readiness, setReadiness] = useState<PublishReadinessResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const publishInFlightRef = useRef(false);
  const campaignReturnPath = `/campaign/${campaignId}?tab=publish`;
  const publishAuthorizeUrl = buildPlatformAuthorizeUrl(
    "/api/platforms/tiktok/publish-authorize",
    campaignReturnPath,
  );

  const loadReadiness = useCallback(async () => {
    if (!hasCaptions) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/platforms/tiktok/publish-readiness?campaignId=${encodeURIComponent(campaignId)}`,
      );
      const data = (await response.json()) as PublishReadinessResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load TikTok publish status");
      }

      setReadiness(data);

      if (
        data.postForCurrentExport?.status === "published" &&
        data.postForCurrentExport.externalUrl
      ) {
        setPublishedUrl(data.postForCurrentExport.externalUrl);
      } else if (!data.alreadyPublished) {
        setPublishedUrl(null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load TikTok publish status",
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId, hasCaptions]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness, refreshKey]);

  useEffect(() => {
    const scopeGranted = searchParams.get("tiktok_scope") === "granted";
    const oauthError = searchParams.get("tiktok_error");

    if (!scopeGranted && !oauthError) {
      return;
    }

    if (scopeGranted) {
      setError(null);
      setMessage("Posting permission granted. You can post to TikTok now.");
      void loadReadiness();
    } else if (oauthError === "scope") {
      setError(
        "TikTok did not grant posting permission. Try again, or check your TikTok app sandbox settings.",
      );
    } else if (oauthError) {
      setError("Could not complete TikTok authorization. Try again.");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("tiktok_scope");
    url.searchParams.delete("tiktok_error");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [loadReadiness, router, searchParams]);

  async function handlePublish() {
    if (publishInFlightRef.current || isPublishing) {
      return;
    }

    publishInFlightRef.current = true;
    setIsPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/platforms/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId }),
      });

      const data = (await response.json()) as PublishResponse;

      if (response.status === 403 && data.code === "PUBLISH_SCOPE_REQUIRED") {
        setError(
          "Posting permission required. Grant access to publish to TikTok.",
        );
        await loadReadiness();
        return;
      }

      if (response.status === 409 && data.code === "PUBLISH_IN_PROGRESS") {
        setMessage("This export is already being published to TikTok.");
        await loadReadiness();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          getTikTokPublishErrorMessage(
            data.error ?? "Failed to publish to TikTok",
          ),
        );
      }

      const viewUrl =
        data.video?.videoUrl ?? data.video?.profileUrl ?? data.post?.externalUrl ?? null;

      setPublishedUrl(viewUrl);
      setMessage(
        data.alreadyPublished
          ? "This export is already on TikTok."
          : "Published to TikTok.",
      );
      await loadReadiness();
      onPublishComplete?.();
    } catch (publishError) {
      const raw =
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish to TikTok";
      setError(getTikTokPublishErrorMessage(raw));
    } finally {
      publishInFlightRef.current = false;
      setIsPublishing(false);
    }
  }

  if (!imagesComplete || !hasCaptions) {
    return null;
  }

  if (loading && !readiness) {
    return (
      <TikTokPanelShell helperText="Checking TikTok publish status…" />
    );
  }

  if (!readiness) {
    return (
      <TikTokPanelShell helperText="Could not load TikTok status. Refresh the page and try again.">
        {error ? (
          <p className="text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </TikTokPanelShell>
    );
  }

  const needsPublishScope =
    Boolean(readiness?.connected && !readiness.hasPublishScope);

  let helperText = "Post your 9:16 Quick Reel with your TikTok caption.";

  if (!readiness.connected) {
    helperText = "Connect TikTok in Settings, then post your video.";
  } else if (!readiness.hasVideoExport) {
    helperText =
      "Export a 9:16 Quick Reel above, then post directly to TikTok.";
  } else if (readiness.isUploading || isPublishing) {
    helperText = "Publishing in progress. Keep this page open until it finishes.";
  } else if (readiness.alreadyPublished || publishedUrl) {
    helperText =
      "This export is already on TikTok. Export a new 9:16 video to post again.";
  } else if (readiness.connected && readiness.hasPublishScope) {
    helperText =
      "Sandbox note: your TikTok account must be set to Private in the TikTok app before posting. Posts are only visible to you until app review passes.";
  }

  const canClickPublish =
    readiness.canPublish &&
    !disabled &&
    !isPublishing &&
    !readiness.isUploading &&
    !readiness.alreadyPublished &&
    !needsPublishScope;

  return (
    <TikTokPanelShell helperText={helperText}>
      <ul className="mb-4 space-y-1.5 text-xs text-muted-foreground">
        <li>{readiness.hasTiktokCaption ? "✓" : "○"} TikTok caption ready</li>
        <li>{readiness.hasVideoExport ? "✓" : "○"} 9:16 video export ready</li>
        <li>{readiness.connected ? "✓" : "○"} TikTok account connected</li>
        <li>
          {readiness.hasPublishScope ? "✓" : "○"} TikTok posting permission
        </li>
        <li>
          {readiness.alreadyPublished || publishedUrl ? "✓" : "○"} Posted to
          TikTok
        </li>
      </ul>

      {readiness.connection ? (
        <p className="mb-4 text-xs text-foreground">
          Account:{" "}
          <span className="font-medium">{readiness.connection.accountLabel}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!readiness.connected ? (
          <Link
            href="/settings/connected-accounts"
            className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Connect TikTok
          </Link>
        ) : needsPublishScope ? (
          <button
            type="button"
            onClick={() => {
              window.location.href = publishAuthorizeUrl;
            }}
            className="btn-primary w-full py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Grant posting permission
          </button>
        ) : (
          <button
            type="button"
            disabled={!canClickPublish}
            onClick={() => void handlePublish()}
            className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {isPublishing || readiness.isUploading
              ? "Publishing to TikTok…"
              : readiness.alreadyPublished
                ? "Already on TikTok"
                : "Post to TikTok"}
          </button>
        )}

        {publishedUrl ? (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto"
          >
            View on TikTok
          </a>
        ) : null}
      </div>

      {isPublishing || readiness.isUploading ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Uploading your video to TikTok and waiting for processing. This can
          take a few minutes — keep this page open.
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
    </TikTokPanelShell>
  );
}
