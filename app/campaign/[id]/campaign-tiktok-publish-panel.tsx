"use client";

import { getTikTokPublishErrorMessage } from "@/utils/tiktok/publish-errors";
import { buildPlatformAuthorizeUrl } from "@/utils/platforms/oauth-return";
import type { PlatformConnectionPublic } from "@/types/platform-connection";
import type { PlatformPostPublic } from "@/types/platform-post";
import {
  canSubmitTikTokPublishForm,
  getCommercialContentLabel,
  getPublishDeclarationText,
  isSelfOnlyPrivacy,
  privacyLevelLabel,
  TIKTOK_BRANDED_CONTENT_POLICY_URL,
  TIKTOK_MUSIC_USAGE_URL,
  type TikTokCreatorInfoPublic,
  type TikTokPublishFormSettings,
  validateTikTokPublishSettings,
} from "@/utils/tiktok/publish-settings";
import type { VerticalFormatPublishState } from "@/utils/slide-aspect-images";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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
  videoPreviewUrl: string | null;
  videoDurationSec: number | null;
  defaultTitle: string | null;
  creatorInfo: TikTokCreatorInfoPublic | null;
  creatorInfoError: string | null;
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
  verticalFormatPublishState?: VerticalFormatPublishState;
  onAddVerticalFormat?: () => void;
  onPublishComplete?: () => void;
}

const EMPTY_FORM: TikTokPublishFormSettings = {
  privacyLevel: "",
  title: "",
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  commercialDisclosure: false,
  yourBrand: false,
  brandedContent: false,
};

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

function CheckboxField({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-2 text-xs leading-5 ${
        disabled ? "cursor-not-allowed text-muted-foreground/70" : "text-foreground"
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border bg-background accent-primary disabled:opacity-50"
      />
      <span>{label}</span>
    </label>
  );
}

export default function CampaignTikTokPublishPanel({
  campaignId,
  disabled = false,
  refreshKey = 0,
  imagesComplete = false,
  hasCaptions = false,
  verticalFormatPublishState = "not_applicable",
  onPublishComplete,
}: CampaignTikTokPublishPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [readiness, setReadiness] = useState<PublishReadinessResponse | null>(
    null,
  );
  const [form, setForm] = useState<TikTokPublishFormSettings>(EMPTY_FORM);
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
      setForm((current) => ({
        ...current,
        title: current.title || data.defaultTitle || "",
      }));

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

  const creator = readiness?.creatorInfo ?? null;
  const commercialLabel = getCommercialContentLabel(form);
  const declarationText = getPublishDeclarationText(form);

  const formValidationError = useMemo(() => {
    if (!creator) {
      return readiness?.creatorInfoError ?? null;
    }

    return validateTikTokPublishSettings(
      creator,
      form,
      readiness?.videoDurationSec ?? null,
    );
  }, [creator, form, readiness?.creatorInfoError, readiness?.videoDurationSec]);

  const brandedContentBlocksPrivate =
    form.commercialDisclosure && form.brandedContent;

  const canSubmit = canSubmitTikTokPublishForm(
    form,
    creator,
    readiness?.videoDurationSec ?? null,
    formValidationError,
  );

  function updateForm(patch: Partial<TikTokPublishFormSettings>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  async function handlePublish() {
    if (publishInFlightRef.current || isPublishing || !canSubmit) {
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
        body: JSON.stringify({
          campaignId,
          publishSettings: form,
        }),
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
          : "Published to TikTok. It may take a few minutes to appear on your profile.",
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
    Boolean(readiness.connected && !readiness.hasPublishScope);

  let helperText = "Review your post settings, then publish to TikTok.";

  if (!readiness.connected) {
    helperText = "Connect TikTok in Settings, then post your video.";
  } else if (verticalFormatPublishState === "needs_add") {
    helperText =
      "Add 9:16 slides first (banner above), then export a vertical Quick Reel.";
  } else if (verticalFormatPublishState === "generating") {
    helperText =
      "9:16 slides are generating — export a vertical Quick Reel once they finish.";
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
      "Sandbox note: your TikTok account must be Private before posting until app review passes.";
  }

  const showPublishForm =
    readiness.connected &&
    readiness.hasPublishScope &&
    readiness.hasVideoExport &&
    !readiness.alreadyPublished &&
    !publishedUrl &&
    !needsPublishScope;

  const canClickPublish =
    showPublishForm &&
    canSubmit &&
    !disabled &&
    !isPublishing &&
    !readiness.isUploading;

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

      {creator ? (
        <p className="mb-4 text-xs text-foreground">
          Posting to{" "}
          <span className="font-medium">{creator.creatorNickname}</span>
          {creator.creatorUsername ? (
            <span className="text-muted-foreground">
              {" "}
              (@{creator.creatorUsername.replace(/^@/, "")})
            </span>
          ) : null}
        </p>
      ) : readiness.connection ? (
        <p className="mb-4 text-xs text-foreground">
          Account:{" "}
          <span className="font-medium">{readiness.connection.accountLabel}</span>
        </p>
      ) : null}

      {showPublishForm ? (
        <div className="space-y-4 rounded-xl border border-border/70 bg-background/30 p-4">
          {readiness.videoPreviewUrl ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <video
                src={readiness.videoPreviewUrl}
                controls
                playsInline
                className="max-h-64 w-full rounded-lg border border-border bg-black object-contain"
              />
              {readiness.videoDurationSec ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Duration: {Math.ceil(readiness.videoDurationSec)}s (max{" "}
                  {creator?.maxVideoPostDurationSec ?? 60}s for this account)
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="tiktok-post-title"
              className="mb-1.5 block text-xs font-semibold text-foreground"
            >
              Title
            </label>
            <textarea
              id="tiktok-post-title"
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              placeholder="Write your TikTok caption and hashtags"
            />
          </div>

          <div>
            <label
              htmlFor="tiktok-privacy-level"
              className="mb-1.5 block text-xs font-semibold text-foreground"
            >
              Who can view this post
            </label>
            <select
              id="tiktok-privacy-level"
              value={form.privacyLevel}
              onChange={(event) =>
                updateForm({ privacyLevel: event.target.value })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select visibility</option>
              {creator?.privacyLevelOptions.map((option) => {
                const disabledOption =
                  brandedContentBlocksPrivate && isSelfOnlyPrivacy(option);

                return (
                  <option
                    key={option}
                    value={option}
                    disabled={disabledOption}
                    title={
                      disabledOption
                        ? "Branded content visibility cannot be set to private."
                        : undefined
                    }
                  >
                    {privacyLevelLabel(option)}
                    {disabledOption ? " (unavailable for branded content)" : ""}
                  </option>
                );
              })}
            </select>
            {brandedContentBlocksPrivate ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Branded content visibility cannot be set to private.
              </p>
            ) : null}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-foreground">
              Interaction settings
            </legend>
            <CheckboxField
              id="tiktok-allow-comment"
              label="Allow comment"
              checked={form.allowComment}
              disabled={creator?.commentDisabled}
              onChange={(checked) => updateForm({ allowComment: checked })}
            />
            <CheckboxField
              id="tiktok-allow-duet"
              label="Allow duet"
              checked={form.allowDuet}
              disabled={creator?.duetDisabled}
              onChange={(checked) => updateForm({ allowDuet: checked })}
            />
            <CheckboxField
              id="tiktok-allow-stitch"
              label="Allow stitch"
              checked={form.allowStitch}
              disabled={creator?.stitchDisabled}
              onChange={(checked) => updateForm({ allowStitch: checked })}
            />
          </fieldset>

          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <CheckboxField
              id="tiktok-commercial-disclosure"
              label="Disclose promotional content"
              checked={form.commercialDisclosure}
              onChange={(checked) =>
                updateForm({
                  commercialDisclosure: checked,
                  yourBrand: checked ? form.yourBrand : false,
                  brandedContent: checked ? form.brandedContent : false,
                  privacyLevel:
                    checked && form.brandedContent && isSelfOnlyPrivacy(form.privacyLevel)
                      ? ""
                      : form.privacyLevel,
                })
              }
            />

            {form.commercialDisclosure ? (
              <div className="space-y-2 border-t border-border/60 pt-3">
                <CheckboxField
                  id="tiktok-your-brand"
                  label="Your brand — you are promoting yourself or your own business"
                  checked={form.yourBrand}
                  onChange={(checked) => updateForm({ yourBrand: checked })}
                />
                <CheckboxField
                  id="tiktok-branded-content"
                  label="Branded content — you are promoting another brand or third party"
                  checked={form.brandedContent}
                  onChange={(checked) =>
                    updateForm({
                      brandedContent: checked,
                      privacyLevel:
                        checked && isSelfOnlyPrivacy(form.privacyLevel)
                          ? ""
                          : form.privacyLevel,
                    })
                  }
                />
                {form.commercialDisclosure &&
                !form.yourBrand &&
                !form.brandedContent ? (
                  <p className="text-xs text-amber-200/90">
                    You need to indicate if your content promotes yourself, a
                    third party, or both.
                  </p>
                ) : null}
                {commercialLabel ? (
                  <p className="text-xs text-muted-foreground">{commercialLabel}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            {declarationText}{" "}
            <a
              href={TIKTOK_MUSIC_USAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              Music Usage Confirmation
            </a>
            {form.commercialDisclosure && form.brandedContent ? (
              <>
                {" "}
                ·{" "}
                <a
                  href={TIKTOK_BRANDED_CONTENT_POLICY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Branded Content Policy
                </a>
              </>
            ) : null}
          </p>

          {formValidationError ? (
            <p className="text-xs text-amber-200/90" role="status">
              {formValidationError}
            </p>
          ) : null}
        </div>
      ) : readiness.creatorInfoError ? (
        <p className="mb-4 text-xs text-red-300" role="alert">
          {readiness.creatorInfoError}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
