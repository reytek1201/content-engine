"use client";

import WebsiteIngestLoader from "@/app/components/website-ingest-loader";
import type {
  TopicSelectionOptions,
  WebsiteIngestApiResponse,
  WebsiteIngestCompletePayload,
  WebsiteIngestTopicSuggestion,
  WebsiteTopicAngle,
} from "@/types/website-ingest";
import {
  clearCachedWebsiteIngest,
  getCachedWebsiteIngest,
  getHostnameFromUrl,
  setCachedWebsiteIngest,
  updateCachedWebsiteIngestSelection,
  type CachedWebsiteIngest,
} from "@/utils/website-ingest-cache";
import {
  hasUsedWebsiteIngest,
  markWebsiteIngestUsed,
} from "@/utils/website-ingest-preference";
import type { UsageSummary } from "@/types/usage";
import { DEFAULT_SLIDE_COUNT } from "@/types/slides";
import {
  formatDraftDurationShort,
} from "@/utils/campaign-draft-timing";
import Link from "next/link";
import { useEffect, useState } from "react";

function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

const ANGLE_LABELS: Record<WebsiteTopicAngle, string> = {
  pain_point: "Pain point",
  curiosity: "Curiosity",
  contrarian: "Contrarian",
};

interface WebsiteTopicSuggesterProps {
  onSelectTopic: (topic: string, options?: TopicSelectionOptions) => void;
  onUseTopicAndGenerate?: (
    topic: string,
    options?: TopicSelectionOptions,
  ) => void;
  onRequestFullDraft?: (
    topic: string,
    options?: TopicSelectionOptions,
  ) => void;
  onIngestComplete?: (payload: WebsiteIngestCompletePayload) => void;
  onSaveBrandKit?: (payload: WebsiteIngestCompletePayload) => Promise<void>;
  brandId?: string | null;
  selectedTopic?: string;
  slideCount?: number;
  disabled?: boolean;
  campaignLimitReached?: boolean;
  usage?: UsageSummary | null;
  usageLoading?: boolean;
  defaultExpanded?: boolean;
  inputId?: string;
}

function isSameTopic(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function urlsMatchForCache(leftUrl: string, rightUrl: string): boolean {
  const leftHost = getHostnameFromUrl(leftUrl);
  const rightHost = getHostnameFromUrl(rightUrl);

  return Boolean(leftHost && rightHost && leftHost === rightHost);
}

function IngestErrorNotice({
  message,
  retryable,
  onRetry,
  onUseCached,
  cachedHostname,
}: {
  message: string;
  retryable: boolean;
  onRetry?: () => void;
  onUseCached?: () => void;
  cachedHostname?: string | null;
}) {
  return (
    <div
      role={retryable ? "status" : "alert"}
      className={`mt-2 rounded-lg border px-3 py-2.5 text-xs leading-5 ${
        retryable
          ? "border-amber-900/50 bg-amber-950/30 text-amber-100"
          : "border-red-900/60 bg-red-950/40 text-red-200"
      }`}
    >
      <p>{message}</p>
      {(onRetry || onUseCached) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-md border border-current/30 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-white/5"
            >
              Try again
            </button>
          ) : null}
          {onUseCached && cachedHostname ? (
            <button
              type="button"
              onClick={onUseCached}
              className="rounded-md border border-current/30 px-2.5 py-1 text-[11px] font-semibold transition hover:bg-white/5"
            >
              Use saved ideas for {cachedHostname}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function WebsiteTopicSuggester({
  onSelectTopic,
  onUseTopicAndGenerate,
  onRequestFullDraft,
  onIngestComplete,
  onSaveBrandKit,
  brandId = null,
  selectedTopic = "",
  slideCount = DEFAULT_SLIDE_COUNT,
  disabled = false,
  campaignLimitReached = false,
  usage = null,
  usageLoading = false,
  defaultExpanded = false,
  inputId = "website-url",
}: WebsiteTopicSuggesterProps) {
  const [expanded, setExpanded] = useState(false);
  const [url, setUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "thinking" | "suggestions">(
    "idle",
  );
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [audience, setAudience] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<WebsiteIngestTopicSuggestion[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isRetryableIngestError, setIsRetryableIngestError] = useState(false);
  const [offerCachedIngestFallback, setOfferCachedIngestFallback] =
    useState(false);
  const [cachedIngest, setCachedIngest] = useState<CachedWebsiteIngest | null>(
    null,
  );
  const [isSavingBrandKit, setIsSavingBrandKit] = useState(false);
  const [brandKitSaved, setBrandKitSaved] = useState(false);
  const [brandKitError, setBrandKitError] = useState<string | null>(null);

  const generateDisabled = disabled || usageLoading || campaignLimitReached;

  useEffect(() => {
    const cache = getCachedWebsiteIngest();
    setCachedIngest(cache);

    if (cache?.inputUrl) {
      setUrl(cache.inputUrl);
      setConsent(true);
    }
  }, []);

  useEffect(() => {
    if (defaultExpanded && !hasUsedWebsiteIngest()) {
      setExpanded(true);
    }
  }, [defaultExpanded]);

  function handleSelectTopic(
    topic: string,
    options?: TopicSelectionOptions,
  ) {
    updateCachedWebsiteIngestSelection(topic, options?.recommendedFormat);
    onSelectTopic(topic, options);
  }

  function toCompletePayload(
    data: WebsiteIngestApiResponse & { success: true },
  ): WebsiteIngestCompletePayload {
    return {
      businessName: data.businessName,
      description: data.description,
      audience: data.audience,
      topics: data.topics,
      productImageUrl: data.productImageUrl,
      logoImageUrl: data.logoImageUrl,
      sourceUrl: data.sourceUrl,
    };
  }

  function applyIngestResult(
    data: WebsiteIngestApiResponse & { success: true },
    inputUrl: string,
    options?: {
      notifyReferences?: boolean;
      preserveReferenceUrls?: boolean;
      preservedProductImageUrl?: string | null;
      preservedLogoImageUrl?: string | null;
    },
  ) {
    const nextProductImageUrl = options?.preserveReferenceUrls
      ? (options.preservedProductImageUrl ?? productImageUrl)
      : data.productImageUrl;
    const nextLogoImageUrl = options?.preserveReferenceUrls
      ? (options.preservedLogoImageUrl ?? logoImageUrl)
      : data.logoImageUrl;

    setBusinessName(data.businessName);
    setDescription(data.description);
    setAudience(data.audience);
    setSourceUrl(data.sourceUrl);
    setSuggestions(data.topics);
    setProductImageUrl(nextProductImageUrl);
    setLogoImageUrl(nextLogoImageUrl);

    setCachedWebsiteIngest(inputUrl, {
      ...data,
      productImageUrl: nextProductImageUrl,
      logoImageUrl: nextLogoImageUrl,
    });
    setCachedIngest(getCachedWebsiteIngest());
    markWebsiteIngestUsed();
    setBrandKitSaved(false);
    setBrandKitError(null);

    if (options?.notifyReferences !== false && !options?.preserveReferenceUrls) {
      onIngestComplete?.({
        ...toCompletePayload(data),
        productImageUrl: nextProductImageUrl,
        logoImageUrl: nextLogoImageUrl,
      });
    }
  }

  function restoreFromCache(cache: CachedWebsiteIngest) {
    setUrl(cache.inputUrl);
    setConsent(true);
    setExpanded(true);
    applyIngestResult(cache, cache.inputUrl);
    setState("suggestions");
    setError(null);

    if (cache.selectedTopic) {
      handleSelectTopic(cache.selectedTopic, {
        recommendedFormat: cache.selectedFormat,
      });
    }
  }

  function handleReset() {
    setState("idle");
    setSuggestions([]);
    setBusinessName(null);
    setDescription(null);
    setAudience(null);
    setSourceUrl(null);
    setProductImageUrl(null);
    setLogoImageUrl(null);
    setError(null);
    setIsRetryableIngestError(false);
    setOfferCachedIngestFallback(false);
    setBrandKitSaved(false);
    setBrandKitError(null);
  }

  function handleCollapse() {
    handleReset();
    setExpanded(false);
    setUrl("");
    setConsent(false);
    clearCachedWebsiteIngest();
    setCachedIngest(null);
  }

  function handleExpand() {
    setExpanded(true);

    const cache = getCachedWebsiteIngest();

    if (cache) {
      setUrl(cache.inputUrl);
      setConsent(true);
    }
  }

  async function requestIngest(options: {
    regenerate?: boolean;
    skipReferenceUpload?: boolean;
  } = {}) {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Enter your website URL");
      return;
    }

    if (!consent) {
      setError("Confirm you have permission to use this website");
      return;
    }

    setError(null);
    setIsRetryableIngestError(false);
    setOfferCachedIngestFallback(false);
    setState("thinking");

    try {
      const response = await fetch("/api/campaigns/ingest-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: trimmedUrl,
          regenerate: options.regenerate ?? false,
          excludeTopics: options.regenerate
            ? suggestions.map((suggestion) => suggestion.topic)
            : undefined,
          skipReferenceUpload: options.skipReferenceUpload ?? false,
        }),
      });

      const data = (await response.json()) as WebsiteIngestApiResponse;

      if (!response.ok || !data.success || !data.topics.length) {
        const retryable =
          !data.success &&
          (data.code === "ai_busy" || response.status === 503);
        const cached = getCachedWebsiteIngest();

        setIsRetryableIngestError(retryable);
        setOfferCachedIngestFallback(
          Boolean(
            retryable &&
              cached &&
              urlsMatchForCache(trimmedUrl, cached.inputUrl),
          ),
        );

        throw new Error(data.success ? "No topics returned" : data.error);
      }

      setIsRetryableIngestError(false);
      setOfferCachedIngestFallback(false);

      applyIngestResult(data, trimmedUrl, {
        preserveReferenceUrls: options.skipReferenceUpload === true,
        preservedProductImageUrl: productImageUrl,
        preservedLogoImageUrl: logoImageUrl,
        notifyReferences: options.skipReferenceUpload !== true,
      });
      setState("suggestions");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read that website",
      );
      setState(suggestions.length > 0 ? "suggestions" : "idle");
    }
  }

  async function handleSaveBrandKit() {
    if (!onSaveBrandKit || !brandId) {
      return;
    }

    setBrandKitError(null);
    setIsSavingBrandKit(true);

    try {
      await onSaveBrandKit({
        businessName: businessName ?? "Your business",
        description: description ?? "",
        audience: audience ?? "",
        topics: suggestions,
        productImageUrl,
        logoImageUrl,
        sourceUrl: sourceUrl ?? url.trim(),
      });
      setBrandKitSaved(true);
    } catch (err) {
      setBrandKitError(
        err instanceof Error ? err.message : "Could not save brand kit",
      );
    } finally {
      setIsSavingBrandKit(false);
    }
  }

  const canSaveBrandKit =
    Boolean(brandId && onSaveBrandKit) &&
    Boolean(productImageUrl || logoImageUrl);

  if (!expanded) {
    const cachedHostname = cachedIngest
      ? getHostnameFromUrl(cachedIngest.inputUrl)
      : null;

    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleExpand}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition hover:border-primary/70 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GlobeIcon />
          Start from your website
        </button>
        {cachedIngest && cachedHostname ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => restoreFromCache(cachedIngest)}
            className="block text-sm font-medium text-primary underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            Resume ideas for {cachedHostname}
          </button>
        ) : null}
      </div>
    );
  }

  if (state === "thinking") {
    return (
      <WebsiteIngestLoader
        url={url}
        previewImageUrl={null}
        businessName={businessName}
      />
    );
  }

  if (state === "suggestions") {
    const headerImageUrl = logoImageUrl ?? productImageUrl;

    return (
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            {headerImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headerImageUrl}
                alt=""
                className="h-11 w-11 shrink-0 rounded-lg border border-border object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Campaign ideas
              </p>
              {businessName ? (
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {businessName}
                </p>
              ) : null}
              {description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCollapse}
            className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Reset
          </button>
        </div>

        {(productImageUrl || logoImageUrl) && (
          <p className="mt-3 text-xs text-primary">
            {(() => {
              const refs = [
                productImageUrl ? "product" : null,
                logoImageUrl ? "logo" : null,
              ].filter(Boolean);

              if (refs.length === 0) {
                return null;
              }

              return `Added ${refs.join(" and ")} reference${refs.length > 1 ? "s" : ""} from your site.`;
            })()}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() =>
              void requestIngest({
                regenerate: true,
                skipReferenceUpload: true,
              })
            }
            className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            New ideas
          </button>
          {canSaveBrandKit ? (
            <button
              type="button"
              disabled={disabled || isSavingBrandKit || brandKitSaved}
              onClick={() => void handleSaveBrandKit()}
              className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {brandKitSaved
                ? "Saved to brand kit"
                : isSavingBrandKit
                  ? "Saving…"
                  : "Save to brand kit"}
            </button>
          ) : null}
        </div>

        {brandKitError ? (
          <p className="mt-2 text-xs text-red-400">{brandKitError}</p>
        ) : null}

        {error ? (
          <IngestErrorNotice
            message={error}
            retryable={isRetryableIngestError}
            cachedHostname={
              offerCachedIngestFallback
                ? getHostnameFromUrl(cachedIngest?.inputUrl ?? url)
                : null
            }
            onRetry={
              isRetryableIngestError
                ? () =>
                    void requestIngest({
                      regenerate: true,
                      skipReferenceUpload: true,
                    })
                : undefined
            }
            onUseCached={
              offerCachedIngestFallback && cachedIngest
                ? () => restoreFromCache(cachedIngest)
                : undefined
            }
          />
        ) : null}

        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-secondary-foreground">
            Use this topic
          </span>{" "}
          pre-fills the form.{" "}
          <span className="font-medium text-secondary-foreground">
            Use &amp; generate
          </span>{" "}
          starts immediately.{" "}
          <span className="font-medium text-secondary-foreground">
            Create full draft
          </span>{" "}
          shows cost before slide images and captions run (
          {formatDraftDurationShort(slideCount)}).
        </p>

        <div className="mt-3 space-y-3">
          {suggestions.map((suggestion) => {
            const isSelected = isSameTopic(suggestion.topic, selectedTopic);

            return (
              <div
                key={suggestion.topic}
                className={`rounded-lg border px-3 py-3 transition ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-background"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                    {ANGLE_LABELS[suggestion.angle]}
                  </span>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {suggestion.recommendedFormat === "9:16"
                      ? "9:16 Reels"
                      : "4:5 Feed"}
                  </span>
                  {isSelected ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                      Selected
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {suggestion.topic}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {suggestion.rationale}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      handleSelectTopic(suggestion.topic, {
                        recommendedFormat: suggestion.recommendedFormat,
                      });
                    }}
                    className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
                    }`}
                  >
                    {isSelected ? "Using this topic" : "Use this topic"}
                  </button>
                  {onUseTopicAndGenerate ? (
                    <button
                      type="button"
                      disabled={generateDisabled}
                      onClick={() => {
                        onUseTopicAndGenerate(suggestion.topic, {
                          recommendedFormat: suggestion.recommendedFormat,
                        });
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Use &amp; generate
                    </button>
                  ) : null}
                  {onRequestFullDraft ? (
                    campaignLimitReached && usage ? (
                      <p className="w-full rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs leading-5 text-amber-100">
                        You&apos;ve used all {usage.limits.campaigns} campaigns
                        this month on your {usage.planLabel} plan.{" "}
                        <Link
                          href="/settings/usage"
                          className="font-medium underline underline-offset-2"
                        >
                          View usage
                        </Link>{" "}
                        or upgrade to get more.
                      </p>
                    ) : (
                      <button
                        type="button"
                        disabled={disabled || usageLoading}
                        onClick={() => {
                          onRequestFullDraft(suggestion.topic, {
                            recommendedFormat: suggestion.recommendedFormat,
                          });
                        }}
                        className="inline-flex flex-col items-center justify-center rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span>Create full draft</span>
                        <span className="mt-0.5 text-[10px] font-medium text-primary-foreground/80">
                          {formatDraftDurationShort(slideCount)}
                        </span>
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            Start from your website
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Paste your homepage and we&apos;ll suggest campaign topics grounded
            in your business.
          </p>
        </div>
        {!defaultExpanded ? (
          <button
            type="button"
            onClick={handleCollapse}
            className="shrink-0 text-xs text-muted-foreground transition hover:text-foreground"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {cachedIngest ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => restoreFromCache(cachedIngest)}
          className="mt-3 text-sm font-medium text-primary underline-offset-2 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          Resume ideas for{" "}
          {getHostnameFromUrl(cachedIngest.inputUrl) ?? "your site"}
        </button>
      ) : null}

      <label htmlFor={inputId} className="sr-only">
        Website URL
      </label>
      <input
        id={inputId}
        type="url"
        inputMode="url"
        autoComplete="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://yourbusiness.com"
        disabled={disabled}
        className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
      />

      <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-border"
        />
        <span>I have permission to use this website for campaign ideas.</span>
      </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => void requestIngest()}
        className="btn-primary mt-4 min-h-11 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        Analyze website
      </button>

      {error ? (
        <IngestErrorNotice
          message={error}
          retryable={isRetryableIngestError}
          cachedHostname={
            offerCachedIngestFallback
              ? getHostnameFromUrl(cachedIngest?.inputUrl ?? url)
              : null
          }
          onRetry={
            isRetryableIngestError ? () => void requestIngest() : undefined
          }
          onUseCached={
            offerCachedIngestFallback && cachedIngest
              ? () => restoreFromCache(cachedIngest)
              : undefined
          }
        />
      ) : null}
    </div>
  );
}
