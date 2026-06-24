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
  hasUsedWebsiteIngest,
  markWebsiteIngestUsed,
} from "@/utils/website-ingest-preference";
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
  onIngestComplete?: (payload: WebsiteIngestCompletePayload) => void;
  selectedTopic?: string;
  disabled?: boolean;
  defaultExpanded?: boolean;
  inputId?: string;
}

function isSameTopic(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export default function WebsiteTopicSuggester({
  onSelectTopic,
  onIngestComplete,
  selectedTopic = "",
  disabled = false,
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
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<WebsiteIngestTopicSuggestion[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultExpanded && !hasUsedWebsiteIngest()) {
      setExpanded(true);
    }
  }, [defaultExpanded]);

  function handleReset() {
    setState("idle");
    setSuggestions([]);
    setBusinessName(null);
    setDescription(null);
    setProductImageUrl(null);
    setLogoImageUrl(null);
    setError(null);
  }

  function handleCollapse() {
    handleReset();
    setExpanded(false);
    setUrl("");
    setConsent(false);
  }

  async function handleAnalyze() {
    if (disabled || state === "thinking") {
      return;
    }

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
    setState("thinking");

    try {
      const response = await fetch("/api/campaigns/ingest-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = (await response.json()) as WebsiteIngestApiResponse;

      if (!response.ok || !data.success || !data.topics.length) {
        throw new Error(data.success ? "No topics returned" : data.error);
      }

      setBusinessName(data.businessName);
      setDescription(data.description);
      setProductImageUrl(data.productImageUrl);
      setLogoImageUrl(data.logoImageUrl);
      setSuggestions(data.topics);
      setState("suggestions");
      markWebsiteIngestUsed();

      onIngestComplete?.({
        businessName: data.businessName,
        description: data.description,
        audience: data.audience,
        topics: data.topics,
        productImageUrl: data.productImageUrl,
        logoImageUrl: data.logoImageUrl,
        sourceUrl: data.sourceUrl,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read that website",
      );
      setState("idle");
    }
  }

  if (!expanded) {
    return (
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/5 px-4 py-2.5 text-sm font-medium text-primary transition hover:border-primary/70 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GlobeIcon />
          Start from your website
        </button>
      </div>
    );
  }

  if (state === "thinking") {
    return (
      <WebsiteIngestLoader
        url={url}
        previewImageUrl={null}
        businessName={null}
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

        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Pick one idea for this campaign. You can switch between them, then
          generate below.
        </p>

        <div className="mt-3 space-y-3">
          {suggestions.map((suggestion) => {
            const isSelected = isSameTopic(suggestion.topic, selectedTopic);

            return (
              <button
                key={suggestion.topic}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onSelectTopic(suggestion.topic, {
                    recommendedFormat: suggestion.recommendedFormat,
                  });
                }}
                className={`w-full rounded-lg border px-3 py-3 text-left transition active:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border bg-background hover:border-primary/60 hover:bg-primary/5"
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
                <p
                  className={`mt-3 text-xs font-semibold ${
                    isSelected ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isSelected ? "Using this topic" : "Use this topic"}
                </p>
              </button>
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
        onClick={() => void handleAnalyze()}
        className="btn-primary mt-4 min-h-11 w-full px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        Analyze website
      </button>

      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
