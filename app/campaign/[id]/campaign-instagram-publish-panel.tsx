"use client";

import CampaignInstagramReadinessChecklist from "@/app/campaign/[id]/campaign-instagram-readiness-checklist";
import PlatformTierUpgradeNotice from "@/app/campaign/[id]/platform-tier-upgrade-notice";
import SchedulePublishPicker from "@/app/campaign/[id]/schedule-publish-picker";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { navigatePlatformOAuth } from "@/utils/native-platform-oauth-flow";
import { getInstagramPublishErrorMessage } from "@/utils/instagram/publish-errors";
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
  hasPublishScope: boolean;
  hasInstagramCaption: boolean;
  hasVideoExport: boolean;
  currentExportId: string | null;
  alreadyPublished: boolean;
  isUploading: boolean;
  isScheduled: boolean;
  scheduledPost: PlatformPostPublic | null;
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
    permalink: string;
  };
}

interface CampaignInstagramPublishPanelProps {
  campaignId: string;
  disabled?: boolean;
  refreshKey?: number;
  imagesComplete?: boolean;
  hasCaptions?: boolean;
  verticalFormatPublishState?: VerticalFormatPublishState;
  onPublishComplete?: () => void;
  onPublishingChange?: (publishing: boolean) => void;
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-pink-500"
      aria-hidden
    >
      <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8A3.6 3.6 0 0 0 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6A3.6 3.6 0 0 0 16.4 4H7.6m9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
    </svg>
  );
}

function InstagramPanelShell({
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
          <InstagramIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">
            Instagram Reels
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

export default function CampaignInstagramPublishPanel({
  campaignId,
  disabled = false,
  refreshKey = 0,
  imagesComplete = false,
  hasCaptions = false,
  verticalFormatPublishState = "not_applicable",
  onPublishComplete,
  onPublishingChange,
}: CampaignInstagramPublishPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNativeApp = useIsNativeApp();
  const [readiness, setReadiness] = useState<PublishReadinessResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [scheduledPost, setScheduledPost] = useState<PlatformPostPublic | null>(null);
  const publishInFlightRef = useRef(false);
  const campaignReturnPath = `/campaign/${campaignId}?tab=publish`;
  const publishAuthorizeUrl = buildPlatformAuthorizeUrl(
    "/api/platforms/instagram/publish-authorize",
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
        `/api/platforms/instagram/publish-readiness?campaignId=${encodeURIComponent(campaignId)}`,
      );
      const data = (await response.json()) as PublishReadinessResponse;

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to load Instagram publish status");
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

      setScheduledPost(data.scheduledPost ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load Instagram publish status",
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId, hasCaptions]);

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
    const scopeGranted = searchParams.get("instagram_scope") === "granted";
    const oauthError = searchParams.get("instagram_error");

    if (!scopeGranted && !oauthError) {
      return;
    }

    if (scopeGranted) {
      setError(null);
      setMessage("Publishing permission granted. You can post to Instagram now.");
      void loadReadiness();
    } else if (oauthError === "scope") {
      setError(
        "Instagram did not grant publishing permission. Try again and approve all requested access.",
      );
    } else if (oauthError) {
      setError("Could not complete Instagram authorization. Try again.");
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("instagram_scope");
    url.searchParams.delete("instagram_error");
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
      const response = await fetch("/api/platforms/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ campaignId }),
      });

      const data = (await response.json()) as PublishResponse;

      if (response.status === 403 && data.code === "PUBLISH_SCOPE_REQUIRED") {
        setError(
          "Publishing permission required. Grant access to post Reels to Instagram.",
        );
        await loadReadiness();
        return;
      }

      if (response.status === 409 && data.code === "PUBLISH_IN_PROGRESS") {
        setMessage("This export is already being published to Instagram.");
        await loadReadiness();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(
          getInstagramPublishErrorMessage(
            data.error ?? "Failed to publish to Instagram",
          ),
        );
      }

      const permalink =
        data.video?.permalink ?? data.post?.externalUrl ?? null;

      setPublishedUrl(permalink);
      setMessage(
        data.alreadyPublished
          ? "This export is already on Instagram."
          : "Published to Instagram Reels.",
      );
      await loadReadiness();
      onPublishComplete?.();
    } catch (publishError) {
      const raw =
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish to Instagram";
      setError(getInstagramPublishErrorMessage(raw));
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
      <InstagramPanelShell helperText="Checking Instagram publish status…" />
    );
  }

  if (!readiness) {
    return (
      <InstagramPanelShell helperText="Could not load Instagram status. Refresh the page and try again.">
        {error ? (
          <p className="text-xs text-red-300" role="alert">
            {error}
          </p>
        ) : null}
      </InstagramPanelShell>
    );
  }

  const needsPublishScope =
    Boolean(readiness.connected && !readiness.hasPublishScope);

  let helperText = "Post your 9:16 Quick Reel with your Instagram caption.";

  if (!readiness.connected) {
    helperText =
      readiness.canConnectPlatform === false
        ? "Your plan includes one platform connection. Upgrade to connect YouTube, TikTok, and Instagram."
        : "Connect Instagram in Settings, then post your Reel.";
  } else if (!readiness.tierAllowed) {
    helperText =
      "Your plan allows publishing from one platform. Disconnect other accounts or upgrade to post to Instagram.";
  } else if (verticalFormatPublishState === "needs_add") {
    helperText =
      "Add 9:16 slides first (banner above), then export a vertical Quick Reel.";
  } else if (verticalFormatPublishState === "generating") {
    helperText =
      "9:16 slides are generating — export a vertical Quick Reel once they finish.";
  } else if (!readiness.hasVideoExport) {
    helperText =
      "Export a 9:16 Quick Reel above, then post directly to Instagram.";
  } else if (readiness.isUploading || isPublishing) {
    helperText = "Publishing in progress. Keep this page open until it finishes.";
  } else if (readiness.isScheduled || scheduledPost) {
    helperText = scheduledPost?.scheduledFor
      ? `Scheduled to post on ${new Date(scheduledPost.scheduledFor).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
      : "Scheduled to post.";
  } else if (readiness.alreadyPublished || publishedUrl) {
    helperText =
      "This export is already on Instagram. Export a new 9:16 video to post again.";
  }

  const canClickPublish =
    readiness.canPublish &&
    !disabled &&
    !isPublishing &&
    !readiness.isUploading &&
    !readiness.alreadyPublished &&
    !readiness.isScheduled &&
    !scheduledPost &&
    !needsPublishScope;

  return (
    <InstagramPanelShell helperText={helperText}>
      <CampaignInstagramReadinessChecklist
        hasCaptions={readiness.hasInstagramCaption}
        hasVideoExport={readiness.hasVideoExport}
        connected={readiness.connected}
        alreadyPublished={readiness.alreadyPublished || Boolean(publishedUrl)}
      />

      {readiness.connection ? (
        <p className="mb-4 text-xs text-foreground">
          Account:{" "}
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
              Upgrade to connect Instagram
            </Link>
          ) : (
            <Link
              href="/settings/connected-accounts"
              className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-sm sm:w-auto sm:px-6"
            >
              Connect Instagram
            </Link>
          )
        ) : !readiness.tierAllowed ? (
          <Link
            href={readiness.upgradeUrl ?? "/settings/usage"}
            className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Upgrade to post to Instagram
          </Link>
        ) : needsPublishScope ? (
          <button
            type="button"
            onClick={() => {
              navigatePlatformOAuth(publishAuthorizeUrl, isNativeApp === true, (nextPath) => {
                router.replace(nextPath);
                router.refresh();
              });
            }}
            className="btn-primary w-full py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Grant publishing permission
          </button>
        ) : (
          <button
            type="button"
            disabled={!canClickPublish}
            onClick={() => void handlePublish()}
            className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
          >
            {isPublishing || readiness.isUploading
              ? "Publishing to Instagram…"
              : readiness.alreadyPublished
                ? "Already on Instagram"
                : "Post to Instagram Reels"}
          </button>
        )}

        {publishedUrl ? (
          <a
            href={publishedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto"
          >
            View on Instagram
          </a>
        ) : null}
      </div>

      {readiness.connected &&
      readiness.hasVideoExport &&
      !readiness.alreadyPublished &&
      !readiness.isUploading &&
      !isPublishing ? (
        <SchedulePublishPicker
          campaignId={campaignId}
          platformKey="instagram_reel"
          platform="instagram"
          publishKind="video"
          exportId={readiness.currentExportId}
          scheduledPost={scheduledPost}
          disabled={disabled}
          onScheduled={(post) => {
            setScheduledPost(post);
            void loadReadiness();
          }}
          onCancelled={() => {
            setScheduledPost(null);
            void loadReadiness();
          }}
        />
      ) : null}

      {isPublishing || readiness.isUploading ? (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Uploading and processing on Instagram. This can take a few minutes —
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
        <PlatformTierUpgradeNotice message="Publishing to Instagram requires upgrading or removing extra connected accounts in Settings." />
      ) : null}

      {error ? (
        <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2.5 text-xs text-red-300">
          {error}
        </div>
      ) : null}
    </InstagramPanelShell>
  );
}
