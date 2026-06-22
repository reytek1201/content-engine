"use client";

import CampaignYouTubeReadinessChecklist from "@/app/campaign/[id]/campaign-youtube-readiness-checklist";
import PlatformTierUpgradeNotice from "@/app/campaign/[id]/platform-tier-upgrade-notice";
import { getYouTubePublishErrorMessage } from "@/utils/youtube/publish-errors";
import { buildPlatformAuthorizeUrl } from "@/utils/platforms/oauth-return";
import type { VerticalFormatPublishState } from "@/utils/slide-aspect-images";
import type { PlatformConnectionPublic } from "@/types/platform-connection";
import type { PlatformPostPublic } from "@/types/platform-post";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface PublishReadinessResponse {
  success: boolean;
  connected: boolean;
  connection: PlatformConnectionPublic | null;
  hasUploadScope: boolean;
  hasYoutubeCaption: boolean;
  hasVideoExport: boolean;
  currentExportId: string | null;
  alreadyPublished: boolean;
  isUploading: boolean;
  canPublish: boolean;
  tierAllowed?: boolean;
  canConnectPlatform?: boolean;
  upgradeUrl?: string;
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
    shortsUrl: string;
    watchUrl: string;
  };
}

interface CampaignYouTubePublishPanelProps {
  campaignId: string;
  disabled?: boolean;
  refreshKey?: number;
  imagesComplete?: boolean;
  hasYoutubeCaptions?: boolean;
  verticalFormatPublishState?: VerticalFormatPublishState;
  onAddVerticalFormat?: () => void;
  onGenerateCaptions?: () => void;
  canGenerateCaptions?: boolean;
  isGeneratingCaptions?: boolean;
  onPublishComplete?: () => void;
  onPublishingChange?: (publishing: boolean) => void;
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

function YouTubePanelShell({
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
          <YouTubeIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            YouTube Shorts
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {helperText}
          </p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export default function CampaignYouTubePublishPanel({
  campaignId,
  disabled = false,
  refreshKey = 0,
  imagesComplete = false,
  hasYoutubeCaptions = false,
  verticalFormatPublishState = "not_applicable",
  onGenerateCaptions,
  canGenerateCaptions = false,
  isGeneratingCaptions = false,
  onPublishComplete,
  onPublishingChange,
}: CampaignYouTubePublishPanelProps) {
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
  const uploadAuthorizeUrl = buildPlatformAuthorizeUrl(
    "/api/platforms/youtube/upload-authorize",
    campaignReturnPath,
  );

  const loadReadiness = useCallback(async () => {
    if (!hasYoutubeCaptions) {
      return;
    }

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
          : "Failed to load YouTube publish status",
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId, hasYoutubeCaptions]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness, refreshKey]);

  useEffect(() => {
    onPublishingChange?.(
      isPublishing || Boolean(readiness?.isUploading),
    );
  }, [isPublishing, readiness?.isUploading, onPublishingChange]);

  useEffect(() => {
    return () => {
      onPublishingChange?.(false);
    };
  }, [onPublishingChange]);

  useEffect(() => {
    const scopeGranted = searchParams.get("youtube_scope") === "granted";
    const oauthError = searchParams.get("youtube_error");

    if (!scopeGranted && !oauthError) {
      return;
    }

    if (scopeGranted) {
      setError(null);
      setMessage("Upload permission granted. You can post to YouTube now.");
      void loadReadiness();
    } else if (oauthError === "scope") {
      setError(
        "YouTube did not grant upload permission. Try again, or confirm your Google account is on the OAuth test users list.",
      );
    } else if (oauthError) {
      setError("Could not complete YouTube authorization. Try again.");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("youtube_scope");
    url.searchParams.delete("youtube_error");
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
        await loadReadiness();
        return;
      }

      if (response.status === 409 && data.code === "PUBLISH_IN_PROGRESS") {
        setMessage("This export is already being published to YouTube.");
        await loadReadiness();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          getYouTubePublishErrorMessage(
            data.error ?? "Failed to publish to YouTube",
          ),
        );
      }

      const shortsUrl =
        data.video?.shortsUrl ?? data.post?.externalUrl ?? null;

      setPublishedUrl(shortsUrl);
      setMessage(
        data.alreadyPublished
          ? "This export is already on YouTube."
          : "Published to YouTube Shorts.",
      );
      await loadReadiness();
      onPublishComplete?.();
    } catch (publishError) {
      const raw =
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish to YouTube";
      setError(getYouTubePublishErrorMessage(raw));
    } finally {
      publishInFlightRef.current = false;
      setIsPublishing(false);
    }
  }

  if (!imagesComplete) {
    return null;
  }

  if (!hasYoutubeCaptions) {
    return (
      <YouTubePanelShell helperText="Generate captions first — they unlock your YouTube title, description, and hashtags.">
        <CampaignYouTubeReadinessChecklist
          hasCaptions={false}
          hasVideoExport={false}
          connected={false}
          alreadyPublished={false}
        />
        <button
          type="button"
          disabled={disabled || !canGenerateCaptions || isGeneratingCaptions}
          onClick={onGenerateCaptions}
          className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
        >
          {isGeneratingCaptions ? "Generating captions…" : "Generate captions"}
        </button>
      </YouTubePanelShell>
    );
  }

  if (loading && !readiness) {
    return (
      <YouTubePanelShell helperText="Checking YouTube publish status…" />
    );
  }

  if (!readiness) {
    return (
      <YouTubePanelShell helperText="Could not load YouTube status. Refresh the page and try again.">
        {error ? (
          <p className="text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </YouTubePanelShell>
    );
  }

  const needsUploadScope =
    Boolean(readiness?.connected && !readiness.hasUploadScope);

  let helperText = "Post your 9:16 Quick Reel with YouTube Shorts caption.";

  if (!readiness.connected) {
    helperText = readiness.canConnectPlatform === false
      ? "Your plan includes one platform connection. Upgrade to connect YouTube, TikTok, and Instagram."
      : "Step 3: Connect YouTube in Settings, then post your Short.";
  } else if (!readiness.tierAllowed) {
    helperText =
      "Your plan allows publishing from one platform. Disconnect other accounts or upgrade to post to YouTube.";
  } else if (verticalFormatPublishState === "needs_add") {
    helperText =
      "Add 9:16 slides first (banner above), then export a vertical Quick Reel.";
  } else if (verticalFormatPublishState === "generating") {
    helperText =
      "9:16 slides are generating — export a vertical Quick Reel once they finish.";
  } else if (!readiness.hasVideoExport) {
    helperText =
      "Step 2: Export a 9:16 Quick Reel above, then post directly to YouTube.";
  } else if (readiness.isUploading || isPublishing) {
    helperText = "Publishing in progress. Keep this page open until it finishes.";
  } else if (readiness.alreadyPublished || publishedUrl) {
    helperText =
      "This export is already on YouTube. Export a new 9:16 video to post again.";
  }

  const canClickPublish =
    readiness.canPublish &&
    !disabled &&
    !isPublishing &&
    !readiness.isUploading &&
    !readiness.alreadyPublished &&
    !needsUploadScope;

  return (
    <YouTubePanelShell helperText={helperText}>
      <CampaignYouTubeReadinessChecklist
        hasCaptions={readiness.hasYoutubeCaption}
        hasVideoExport={readiness.hasVideoExport}
        connected={readiness.connected}
        alreadyPublished={readiness.alreadyPublished || Boolean(publishedUrl)}
      />

      {readiness.connection ? (
        <p className="mb-4 text-xs text-foreground">
          Channel:{" "}
          <span className="font-medium">{readiness.connection.accountLabel}</span>
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!readiness.connected ? (
          readiness.canConnectPlatform === false ? (
            <Link
              href={readiness.upgradeUrl ?? "/settings/usage"}
              className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-sm sm:w-auto sm:px-6"
            >
              Upgrade to connect YouTube
            </Link>
          ) : (
            <Link
              href="/settings/connected-accounts"
              className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-sm sm:w-auto sm:px-6"
            >
              Connect YouTube
            </Link>
          )
        ) : !readiness.tierAllowed ? (
          <Link
            href={readiness.upgradeUrl ?? "/settings/usage"}
            className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Upgrade to post to YouTube
          </Link>
        ) : needsUploadScope ? (
          <button
            type="button"
            onClick={() => {
              window.location.href = uploadAuthorizeUrl;
            }}
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
            {isPublishing || readiness.isUploading
              ? "Publishing to YouTube…"
              : readiness.alreadyPublished
                ? "Already on YouTube"
                : "Post to YouTube Shorts"}
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

      {isPublishing || readiness.isUploading ? (
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

      {!readiness.connected && readiness.canConnectPlatform === false ? (
        <PlatformTierUpgradeNotice message="Free includes one platform connection. Disconnect your current account in Settings to switch, or upgrade for all three platforms." />
      ) : readiness.connected && readiness.tierAllowed === false ? (
        <PlatformTierUpgradeNotice message="Publishing to YouTube requires upgrading or removing extra connected accounts in Settings." />
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2.5 text-xs text-red-300">
          {error}
        </div>
      ) : null}
    </YouTubePanelShell>
  );
}
