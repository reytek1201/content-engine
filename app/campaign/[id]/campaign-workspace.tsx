"use client";

import { createClient } from "@/utils/supabase/client";
import type { Campaign, Slide } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import {
  formatAllCaptionsForCopy,
  formatCaptionForCopy,
  formatHashtagsForDisplay,
  PLATFORM_LABELS,
  sortCaptionsByPlatform,
} from "@/types/captions";
import {
  formatAspectRatio,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/utils/campaign-display";
import Link from "next/link";
import { useEffect, useState } from "react";
import SlideRegenerateControls from "@/app/campaign/[id]/slide-regenerate-controls";
import SlideOverlayEditor from "@/app/campaign/[id]/slide-overlay-editor";
import DeleteCampaignButton from "@/app/components/delete-campaign-button";
import DuplicateCampaignButton from "@/app/components/duplicate-campaign-button";
import type { RegenerateFeedbackChipId } from "@/types/regenerate-feedback";

interface CampaignWorkspaceProps {
  initialCampaign: Campaign;
  initialSlides: Slide[];
  initialCaptions: PlatformCaption[];
}

export default function CampaignWorkspace({
  initialCampaign,
  initialSlides,
  initialCaptions,
}: CampaignWorkspaceProps) {
  const supabase = createClient();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [slides, setSlides] = useState(initialSlides);
  const [captions, setCaptions] = useState(initialCaptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [captionsMessage, setCaptionsMessage] = useState<string | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(
    null
  );
  const [selectedFeedbackBySlide, setSelectedFeedbackBySlide] = useState<
    Record<string, RegenerateFeedbackChipId[]>
  >({});
  const [regenerateNotesBySlide, setRegenerateNotesBySlide] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);

  const imagesComplete = slides.length > 0 && slides.every((slide) => slide.image_url);
  const canGenerateImages =
    !isGenerating &&
    campaign.status !== "generating_images" &&
    !imagesComplete;
  const sortedCaptions = sortCaptionsByPlatform(captions);
  const canGenerateCaptions = slides.length > 0 && !isGeneratingCaptions;
  const isAnySlideGenerating = slides.some(
    (slide) => slide.fal_request_id && !slide.image_url
  );

  useEffect(() => {
    const channel = supabase
      .channel(`campaign-${campaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "slides",
          filter: `campaign_id=eq.${campaign.id}`,
        },
        (payload) => {
          const updatedSlide = payload.new as Slide;
          setSlides((current) =>
            current.map((slide) =>
              slide.id === updatedSlide.id ? updatedSlide : slide
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "campaigns",
          filter: `id=eq.${campaign.id}`,
        },
        (payload) => {
          setCampaign(payload.new as Campaign);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaign.id, supabase]);

  async function handleGenerateImages() {
    setError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        mode?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to start image generation");
      }

      if (data.mode === "sync") {
        const { data: refreshedSlides } = await supabase
          .from("slides")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("slide_index", { ascending: true });

        const { data: refreshedCampaign } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", campaign.id)
          .single();

        if (refreshedSlides) {
          setSlides(refreshedSlides as Slide[]);
        }

        if (refreshedCampaign) {
          setCampaign(refreshedCampaign as Campaign);
        }
      } else {
        setCampaign((current) => ({
          ...current,
          status: "generating_images",
          error_message: null,
        }));
      }
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Something went wrong"
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleDownloadZip() {
    setError(null);
    setExportMessage(null);
    setIsExporting(true);

    try {
      const response = await fetch("/api/export-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Export failed");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? "campaign.zip";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setExportMessage("Campaign zip downloaded");
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Something went wrong"
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleGenerateCaptions() {
    setError(null);
    setCaptionsMessage(null);
    setIsGeneratingCaptions(true);

    try {
      const response = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        captions?: PlatformCaption[];
      };

      if (!response.ok || !data.success || !data.captions) {
        throw new Error(data.error ?? "Failed to generate captions");
      }

      setCaptions(data.captions);
      setCaptionsMessage(
        captions.length > 0
          ? "Captions regenerated — slide images unchanged"
          : "Platform captions generated"
      );
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Something went wrong"
      );
    } finally {
      setIsGeneratingCaptions(false);
    }
  }

  async function handleCopyCaption(platformCaption: PlatformCaption) {
    try {
      await navigator.clipboard.writeText(formatCaptionForCopy(platformCaption));
      setCopiedPlatform(platformCaption.platform);
      window.setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function handleCopyAllCaptions() {
    try {
      await navigator.clipboard.writeText(formatAllCaptionsForCopy(captions));
      setCopiedPlatform("all");
      window.setTimeout(() => setCopiedPlatform(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  function toggleFeedbackChip(
    slideId: string,
    chipId: RegenerateFeedbackChipId
  ) {
    setSelectedFeedbackBySlide((current) => {
      const selected = current[slideId] ?? [];

      if (chipId === "try_again") {
        return {
          ...current,
          [slideId]: selected.includes("try_again") ? [] : ["try_again"],
        };
      }

      const withoutTryAgain = selected.filter((id) => id !== "try_again");
      const next = withoutTryAgain.includes(chipId)
        ? withoutTryAgain.filter((id) => id !== chipId)
        : [...withoutTryAgain, chipId];

      return {
        ...current,
        [slideId]: next,
      };
    });
  }

  async function handleRegenerateSlide(slideId: string) {
    setError(null);
    setRegeneratingSlideId(slideId);

    try {
      const slide = slides.find((entry) => entry.id === slideId);
      const feedback = selectedFeedbackBySlide[slideId] ?? [];
      const notes = regenerateNotesBySlide[slideId]?.trim();

      const response = await fetch("/api/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId,
          feedback,
          notes: notes || undefined,
          text_overlay: slide?.text_overlay ?? undefined,
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        mode?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to regenerate slide");
      }

      setSlides((current) =>
        current.map((slide) =>
          slide.id === slideId
            ? { ...slide, image_url: null, fal_request_id: null }
            : slide
        )
      );

      setCampaign((current) => ({
        ...current,
        status: "generating_images",
        error_message: null,
      }));

      if (data.mode === "sync") {
        const { data: refreshedSlides } = await supabase
          .from("slides")
          .select("*")
          .eq("campaign_id", campaign.id)
          .order("slide_index", { ascending: true });

        const { data: refreshedCampaign } = await supabase
          .from("campaigns")
          .select("*")
          .eq("id", campaign.id)
          .single();

        if (refreshedSlides) {
          setSlides(refreshedSlides as Slide[]);
        }

        if (refreshedCampaign) {
          setCampaign(refreshedCampaign as Campaign);
        }
      }
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "Something went wrong"
      );
    } finally {
      setRegeneratingSlideId(null);
    }
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
        <Link
          href="/campaigns"
          className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          ← All campaigns
        </Link>

        <header className="mt-8 border-b border-border pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="brand-kicker">
                Campaign workspace
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {campaign.title ?? "Untitled campaign"}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                {campaign.topic}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${STATUS_STYLES[campaign.status]}`}
              >
                {STATUS_LABELS[campaign.status]}
              </span>
              <DuplicateCampaignButton campaignId={campaign.id} />
              <DeleteCampaignButton
                campaignId={campaign.id}
                campaignTitle={campaign.title}
              />
            </div>
          </div>

          {campaign.error_message && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            >
              {campaign.error_message}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          )}

          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Target audience
              </dt>
              <dd className="mt-2 text-sm leading-6 text-secondary-foreground">
                {campaign.target_audience ?? "—"}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Aspect ratio
              </dt>
              <dd className="mt-2 text-sm text-secondary-foreground">
                {formatAspectRatio(campaign.aspect_ratio)}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Slides
              </dt>
              <dd className="mt-2 text-sm text-secondary-foreground">
                {campaign.slide_count ?? slides.length}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-card/40 p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Campaign ID
              </dt>
              <dd className="mt-2 truncate font-mono text-xs text-muted-foreground">
                {campaign.id}
              </dd>
            </div>
          </dl>

          {(campaign.product_reference_url ||
            campaign.style_reference_url ||
            campaign.logo_reference_url) && (
            <div className="mt-8">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Campaign references
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {campaign.product_reference_url && (
                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <p className="text-xs font-semibold text-secondary-foreground">Product</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.product_reference_url}
                      alt="Product reference"
                      className="mt-3 max-h-32 w-full rounded-lg object-contain"
                    />
                  </div>
                )}
                {campaign.style_reference_url && (
                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <p className="text-xs font-semibold text-secondary-foreground">Style</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.style_reference_url}
                      alt="Style reference"
                      className="mt-3 max-h-32 w-full rounded-lg object-contain"
                    />
                  </div>
                )}
                {campaign.logo_reference_url && (
                  <div className="rounded-xl border border-border bg-card/40 p-3">
                    <p className="text-xs font-semibold text-secondary-foreground">Logo</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.logo_reference_url}
                      alt="Logo reference"
                      className="mt-3 max-h-32 w-full rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <section className="mt-10 rounded-2xl border border-border bg-card/30 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Publish</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                AI-written post copy for TikTok, Instagram, and YouTube Shorts.
                Regenerating captions only updates publish copy — not your slide
                images.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {sortedCaptions.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyAllCaptions}
                  className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
                >
                  {copiedPlatform === "all" ? "Copied all" : "Copy all"}
                </button>
              )}

              <button
                type="button"
                onClick={handleGenerateCaptions}
                disabled={!canGenerateCaptions}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingCaptions
                  ? "Generating captions…"
                  : captions.length > 0
                    ? "Regenerate captions"
                    : "Generate captions"}
              </button>
            </div>
          </div>

          {captionsMessage && (
            <div className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
              {captionsMessage}
            </div>
          )}

          <div className="mt-6">
            {sortedCaptions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-background/40 px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Click Generate captions to create hooks, post copy, and hashtags
                  tailored to each platform from your slide content.
                </p>
              </div>
            ) : (
              <article className="overflow-hidden rounded-xl border border-border bg-card/50">
                {sortedCaptions.map((platformCaption, index) => (
                  <section
                    key={platformCaption.id}
                    className={
                      index > 0 ? "border-t border-border" : undefined
                    }
                  >
                    <div className="flex items-center justify-between px-5 py-4 sm:px-6">
                      <h3 className="text-sm font-semibold text-secondary-foreground">
                        {PLATFORM_LABELS[platformCaption.platform]}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopyCaption(platformCaption)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
                      >
                        {copiedPlatform === platformCaption.platform
                          ? "Copied"
                          : "Copy section"}
                      </button>
                    </div>

                    <div className="space-y-4 px-5 pb-6 sm:px-6">
                      {platformCaption.platform === "youtube_shorts" &&
                        platformCaption.title && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Title
                            </p>
                            <p className="mt-2 text-sm font-semibold text-foreground">
                              {platformCaption.title}
                            </p>
                          </div>
                        )}

                      {platformCaption.hook && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Hook
                          </p>
                          <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                            {platformCaption.hook}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Caption
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-secondary-foreground">
                          {platformCaption.caption}
                        </p>
                      </div>

                      {platformCaption.hashtags.length > 0 && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Hashtags
                          </p>
                          <p className="mt-2 text-sm leading-6 text-sky-300">
                            {formatHashtagsForDisplay(platformCaption.hashtags)}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>
                ))}
              </article>
            )}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Slides</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {slides.length} slide{slides.length === 1 ? "" : "s"} ·{" "}
                {imagesComplete
                  ? "All images ready"
                  : campaign.status === "generating_images"
                    ? "Images generating…"
                    : "Ready for image generation"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {imagesComplete && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isExporting}
                  className="inline-flex items-center justify-center rounded-xl border border-emerald-700 bg-emerald-950/40 px-5 py-3 text-sm font-semibold text-emerald-200 transition hover:border-emerald-500 hover:bg-emerald-950/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isExporting ? "Preparing zip…" : "Download zip"}
                </button>
              )}

              {canGenerateImages && (
                <button
                  type="button"
                  onClick={handleGenerateImages}
                  disabled={isGenerating}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? "Starting…" : "Generate images"}
                </button>
              )}
            </div>
          </div>

          {exportMessage && (
            <div className="mb-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
              {exportMessage}
            </div>
          )}

          <div className="grid gap-6">
            {slides.map((slide) => (
              <article
                key={slide.id}
                className="overflow-hidden rounded-2xl border border-border bg-card/50"
              >
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <h3 className="text-sm font-semibold text-secondary-foreground">
                    Slide {slide.slide_index + 1}
                  </h3>
                  {slide.image_url ? (
                    <span className="text-xs font-medium text-emerald-400">
                      Image ready
                    </span>
                  ) : slide.fal_request_id ? (
                    <span className="text-xs font-medium text-amber-300">
                      Generating…
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground">
                      Image pending
                    </span>
                  )}
                </div>

                <div
                  className={
                    slide.image_url
                      ? "grid gap-0 lg:grid-cols-[240px_1fr]"
                      : undefined
                  }
                >
                  {slide.image_url && (
                    <div
                      className={`flex items-center justify-center border-b border-border bg-background p-6 lg:border-b-0 lg:border-r ${
                        campaign.aspect_ratio === "4:5"
                          ? "aspect-4/5 lg:aspect-auto lg:min-h-[300px]"
                          : "aspect-9/16 lg:aspect-auto lg:min-h-[300px]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.image_url}
                        alt={`Slide ${slide.slide_index + 1}`}
                        className="max-h-full max-w-full rounded-lg object-contain"
                      />
                    </div>
                  )}

                  <div className="space-y-5 p-5 sm:p-6">
                    <SlideOverlayEditor
                      slideId={slide.id}
                      value={slide.text_overlay ?? ""}
                      disabled={
                        regeneratingSlideId === slide.id ||
                        (isAnySlideGenerating && regeneratingSlideId !== slide.id)
                      }
                      onSaved={(textOverlay) =>
                        setSlides((current) =>
                          current.map((entry) =>
                            entry.id === slide.id
                              ? { ...entry, text_overlay: textOverlay }
                              : entry
                          )
                        )
                      }
                      onError={setError}
                    />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Voiceover script
                      </p>
                      <p className="mt-2 text-sm leading-7 text-secondary-foreground">
                        {slide.voiceover_script ?? "—"}
                      </p>
                    </div>

                    {slide.image_url && (
                      <SlideRegenerateControls
                        disabled={
                          isAnySlideGenerating && regeneratingSlideId !== slide.id
                        }
                        isRegenerating={regeneratingSlideId === slide.id}
                        selectedChipIds={selectedFeedbackBySlide[slide.id] ?? []}
                        notes={regenerateNotesBySlide[slide.id] ?? ""}
                        onNotesChange={(value) =>
                          setRegenerateNotesBySlide((current) => ({
                            ...current,
                            [slide.id]: value,
                          }))
                        }
                        onToggleChip={(chipId) =>
                          toggleFeedbackChip(slide.id, chipId)
                        }
                        onRegenerate={() => handleRegenerateSlide(slide.id)}
                      />
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
