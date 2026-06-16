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
} from "@/utils/campaign-display";
import { formatSlidesImageStatus } from "@/utils/campaign-progress";
import {
  downloadSlideImage,
  slideImageFilename,
} from "@/utils/download-slide";
import SlideRegenerateControls from "@/app/campaign/[id]/slide-regenerate-controls";
import SlideOverlayEditor from "@/app/campaign/[id]/slide-overlay-editor";
import CarouselPreviewModal from "@/app/campaign/[id]/carousel-preview-modal";
import CampaignGeneratingView from "@/app/campaign/[id]/campaign-generating-view";
import CampaignNextStepBar from "@/app/campaign/[id]/campaign-next-step-bar";
import CampaignProgressStrip from "@/app/campaign/[id]/campaign-progress-strip";
import CampaignTitleEditor from "@/app/campaign/[id]/campaign-title-editor";
import CampaignBackLink from "@/app/components/campaign-back-link";
import DeleteCampaignButton from "@/app/components/delete-campaign-button";
import DuplicateCampaignButton from "@/app/components/duplicate-campaign-button";
import ScrollToTopButton from "@/app/components/scroll-to-top-button";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import type { RegenerateFeedbackChipId } from "@/types/regenerate-feedback";
import {
  saveSlideImageToPhotos,
  shareSlideImage,
} from "@/utils/native-slide-export";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const [copiedVoiceoverSlideId, setCopiedVoiceoverSlideId] = useState<
    string | null
  >(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [downloadingSlideId, setDownloadingSlideId] = useState<string | null>(
    null
  );
  const [savingSlideId, setSavingSlideId] = useState<string | null>(null);
  const [sharingSlideId, setSharingSlideId] = useState<string | null>(null);
  const isNativeApp = useIsNativeApp();
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(
    null
  );
  const [selectedFeedbackBySlide, setSelectedFeedbackBySlide] = useState<
    Record<string, RegenerateFeedbackChipId[]>
  >({});
  const [regenerateNotesBySlide, setRegenerateNotesBySlide] = useState<
    Record<string, string>
  >({});
  const [headlineDraftBySlide, setHeadlineDraftBySlide] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isRetryingText, setIsRetryingText] = useState(false);
  const textGenerationStarted = useRef(false);

  const isAwaitingTextGeneration =
    slides.length === 0 &&
    (campaign.status === "generating_text" || campaign.status === "failed");

  const imagesComplete = slides.length > 0 && slides.every((slide) => slide.image_url);
  const imagesReadyCount = slides.filter((slide) => slide.image_url).length;
  const slideCount = campaign.slide_count ?? slides.length;
  const isAnySlideGenerating = slides.some(
    (slide) => slide.fal_request_id && !slide.image_url
  );
  const isGeneratingImages =
    campaign.status === "generating_images" || isAnySlideGenerating;
  const canGenerateImages =
    !isGenerating &&
    campaign.status !== "generating_images" &&
    !imagesComplete;
  const sortedCaptions = sortCaptionsByPlatform(captions);
  const canGenerateCaptions = slides.length > 0 && !isGeneratingCaptions;

  const refreshSlides = useCallback(async () => {
    const { data: refreshedSlides } = await supabase
      .from("slides")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("slide_index", { ascending: true });

    if (refreshedSlides) {
      setSlides(refreshedSlides as Slide[]);
    }
  }, [campaign.id, supabase]);

  const refreshCampaign = useCallback(async () => {
    const { data: refreshedCampaign } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign.id)
      .single();

    if (refreshedCampaign) {
      setCampaign(refreshedCampaign as Campaign);
    }
  }, [campaign.id, supabase]);

  const runTextGeneration = useCallback(async () => {
    setIsRetryingText(true);

    try {
      const response = await fetch(
        `/api/campaigns/${campaign.id}/generate-text`,
        { method: "POST" }
      );

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Campaign generation failed");
      }

      await Promise.all([refreshSlides(), refreshCampaign()]);
    } catch (generationError) {
      await refreshCampaign();
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Campaign generation failed"
      );
    } finally {
      setIsRetryingText(false);
    }
  }, [campaign.id, refreshCampaign, refreshSlides]);

  useEffect(() => {
    if (campaign.status !== "generating_text" || textGenerationStarted.current) {
      return;
    }

    textGenerationStarted.current = true;
    void runTextGeneration();
  }, [campaign.status, runTextGeneration]);

  function handleRetryTextGeneration() {
    setError(null);
    setCampaign((current) => ({
      ...current,
      status: "generating_text",
      error_message: null,
    }));
    void runTextGeneration();
  }

  useEffect(() => {
    const channel = supabase
      .channel(`campaign-${campaign.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "slides",
          filter: `campaign_id=eq.${campaign.id}`,
        },
        (payload) => {
          const newSlide = payload.new as Slide;
          setSlides((current) => {
            if (current.some((slide) => slide.id === newSlide.id)) {
              return current;
            }

            return [...current, newSlide].sort(
              (left, right) => left.slide_index - right.slide_index
            );
          });
        }
      )
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

  async function handleCopyVoiceover(slideId: string, script: string) {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedVoiceoverSlideId(slideId);
      window.setTimeout(() => setCopiedVoiceoverSlideId(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function handleDownloadSlide(slide: Slide) {
    if (!slide.image_url) {
      return;
    }

    setError(null);
    setDownloadingSlideId(slide.id);

    try {
      await downloadSlideImage(
        slide.image_url,
        slideImageFilename(slide.slide_index)
      );
    } catch {
      setError("Could not download slide image");
    } finally {
      setDownloadingSlideId(null);
    }
  }

  async function handleSaveSlideToPhotos(slide: Slide) {
    if (!slide.image_url) {
      return;
    }

    setError(null);
    setSavingSlideId(slide.id);

    try {
      await saveSlideImageToPhotos(
        slide.image_url,
        slideImageFilename(slide.slide_index)
      );
    } catch {
      setError("Could not save slide to Photos");
    } finally {
      setSavingSlideId(null);
    }
  }

  async function handleShareSlide(slide: Slide) {
    if (!slide.image_url) {
      return;
    }

    setError(null);
    setSharingSlideId(slide.id);

    try {
      await shareSlideImage(
        slide.image_url,
        slideImageFilename(slide.slide_index),
        `Slide ${slide.slide_index + 1}`
      );
    } catch {
      setError("Could not share slide image");
    } finally {
      setSharingSlideId(null);
    }
  }

  function handleOpenPreview(slideIndex = 0) {
    setPreviewInitialIndex(slideIndex);
    setPreviewOpen(true);
  }

  const slidesWithImages = slides.filter((slide) => slide.image_url);

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
      const draftHeadline = headlineDraftBySlide[slideId]?.trim();
      const textOverlay =
        draftHeadline || slide?.text_overlay?.trim() || undefined;

      const response = await fetch("/api/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId,
          feedback,
          notes: notes || undefined,
          text_overlay: textOverlay,
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
            ? {
                ...slide,
                image_url: null,
                fal_request_id: null,
                ...(textOverlay ? { text_overlay: textOverlay } : {}),
              }
            : slide
        )
      );

      if (textOverlay) {
        setHeadlineDraftBySlide((current) => {
          const next = { ...current };
          delete next[slideId];
          return next;
        });
      }

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

  if (isAwaitingTextGeneration) {
    return (
      <CampaignGeneratingView
        campaign={campaign}
        isRetrying={isRetryingText}
        onRetry={handleRetryTextGeneration}
      />
    );
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <main
        id="campaign-workspace-top"
        className="page-main scroll-mt-0"
      >
        <header className="border-b border-border pb-6 md:pb-8">
          <CampaignBackLink className="mb-4" />
          <div className="flex flex-wrap items-start justify-between gap-3 md:gap-4">
            <div>
              <p className="brand-kicker">
                Campaign workspace
              </p>
              <CampaignTitleEditor
                campaignId={campaign.id}
                value={campaign.title ?? "Untitled campaign"}
                onSaved={(title) =>
                  setCampaign((current) => ({ ...current, title }))
                }
                onError={setError}
              />
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:mt-3 md:text-base md:leading-7">
                {campaign.topic}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-3">
              <DuplicateCampaignButton campaignId={campaign.id} />
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

          <CampaignProgressStrip
            slideCount={slideCount}
            imagesReadyCount={imagesReadyCount}
            imagesComplete={imagesComplete}
            isGeneratingImages={isGeneratingImages}
            captionsCount={captions.length}
          />

          <dl className="mt-6 grid gap-3 sm:grid-cols-2 md:mt-8 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card/40 p-3 md:rounded-xl md:p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Target audience
              </dt>
              <dd className="mt-1.5 text-sm leading-6 text-secondary-foreground md:mt-2">
                {campaign.target_audience ?? "—"}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3 md:rounded-xl md:p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Aspect ratio
              </dt>
              <dd className="mt-1.5 text-sm text-secondary-foreground md:mt-2">
                {formatAspectRatio(campaign.aspect_ratio)}
              </dd>
            </div>
            <div className="rounded-lg border border-border bg-card/40 p-3 md:rounded-xl md:p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Slides
              </dt>
              <dd className="mt-1.5 text-sm text-secondary-foreground md:mt-2">
                {campaign.slide_count ?? slides.length}
              </dd>
            </div>
          </dl>

          {(campaign.product_reference_url ||
            campaign.style_reference_url ||
            campaign.logo_reference_url) && (
            <div className="mt-6 md:mt-8">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Campaign references
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:mt-4 sm:gap-4 sm:grid-cols-3">
                {campaign.product_reference_url && (
                  <div className="rounded-lg border border-border bg-card/40 p-2 sm:p-3">
                    <p className="text-[10px] font-semibold text-secondary-foreground sm:text-xs">Product</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.product_reference_url}
                      alt="Product reference"
                      className="mt-2 max-h-20 w-full rounded-md object-contain sm:mt-3 sm:max-h-32 sm:rounded-lg"
                    />
                  </div>
                )}
                {campaign.style_reference_url && (
                  <div className="rounded-lg border border-border bg-card/40 p-2 sm:p-3">
                    <p className="text-[10px] font-semibold text-secondary-foreground sm:text-xs">Style</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.style_reference_url}
                      alt="Style reference"
                      className="mt-2 max-h-20 w-full rounded-md object-contain sm:mt-3 sm:max-h-32 sm:rounded-lg"
                    />
                  </div>
                )}
                {campaign.logo_reference_url && (
                  <div className="rounded-lg border border-border bg-card/40 p-2 sm:p-3">
                    <p className="text-[10px] font-semibold text-secondary-foreground sm:text-xs">Logo</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.logo_reference_url}
                      alt="Logo reference"
                      className="mt-2 max-h-20 w-full rounded-md object-contain sm:mt-3 sm:max-h-32 sm:rounded-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <CampaignNextStepBar
          slideCount={slideCount}
          imagesReadyCount={imagesReadyCount}
          imagesComplete={imagesComplete}
          isGeneratingImages={isGeneratingImages}
          canGenerateImages={canGenerateImages}
          isStartingImages={isGenerating}
          captionsCount={captions.length}
          canGenerateCaptions={canGenerateCaptions}
          isGeneratingCaptions={isGeneratingCaptions}
          isExporting={isExporting}
          copiedAllCaptions={copiedPlatform === "all"}
          onGenerateImages={handleGenerateImages}
          onGenerateCaptions={handleGenerateCaptions}
          onDownloadZip={handleDownloadZip}
          onCopyAllCaptions={handleCopyAllCaptions}
        />

        <section id="section-slides" className="mt-8 scroll-mt-32 md:mt-10 md:scroll-mt-48">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-6 md:gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground md:text-xl">Slides</h2>
              <p className="mt-0.5 text-xs text-muted-foreground md:mt-1 md:text-sm">
                {formatSlidesImageStatus({
                  slideCount,
                  imagesReadyCount,
                  imagesComplete,
                  isGeneratingImages,
                })}
              </p>
            </div>

            {slidesWithImages.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenPreview(0)}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:w-auto sm:px-5 sm:py-3"
              >
                Preview carousel
              </button>
            )}
          </div>

          {exportMessage && (
            <div className="mb-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
              {exportMessage}
            </div>
          )}

          <div className="grid gap-4 md:gap-6">
            {slides.map((slide) => (
              <article
                key={slide.id}
                className="overflow-hidden rounded-xl border border-border bg-card/50 md:rounded-2xl"
              >
                <div className="flex items-center justify-between border-b border-border px-3 py-2.5 md:px-5 md:py-4">
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
                      className={`flex max-h-64 flex-col items-center justify-center border-b border-border bg-background p-3 sm:max-h-80 md:max-h-none md:p-6 lg:border-b-0 lg:border-r ${
                        campaign.aspect_ratio === "4:5"
                          ? "aspect-4/5 max-md:aspect-auto lg:aspect-auto lg:min-h-[300px]"
                          : "aspect-9/16 max-md:aspect-auto lg:aspect-auto lg:min-h-[300px]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(slide.slide_index)}
                        className="group relative max-h-full max-w-full cursor-zoom-in"
                        aria-label={`Expand slide ${slide.slide_index + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={slide.image_url}
                          alt={`Slide ${slide.slide_index + 1}`}
                          className="max-h-56 max-w-full rounded-lg object-contain transition group-hover:opacity-95 sm:max-h-72 md:max-h-full"
                        />
                        <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 md:flex">
                          <span className="rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm">
                            Expand
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(slide.slide_index)}
                        className="mt-3 hidden text-xs font-medium text-muted-foreground transition hover:text-foreground md:inline-block lg:hidden"
                      >
                        Expand image
                      </button>
                    </div>
                  )}

                  <div className="space-y-4 p-3 sm:space-y-5 sm:p-4 md:p-6">
                    <SlideOverlayEditor
                      slideId={slide.id}
                      value={slide.text_overlay ?? ""}
                      disabled={
                        regeneratingSlideId === slide.id ||
                        (isAnySlideGenerating && regeneratingSlideId !== slide.id)
                      }
                      onDraftChange={(textOverlay) =>
                        setHeadlineDraftBySlide((current) => ({
                          ...current,
                          [slide.id]: textOverlay,
                        }))
                      }
                      onSaved={(textOverlay) => {
                        setHeadlineDraftBySlide((current) => {
                          const next = { ...current };
                          delete next[slide.id];
                          return next;
                        });
                        setSlides((current) =>
                          current.map((entry) =>
                            entry.id === slide.id
                              ? { ...entry, text_overlay: textOverlay }
                              : entry
                          )
                        );
                      }}
                      onError={setError}
                    />
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Voiceover script
                        </p>
                        {slide.voiceover_script && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyVoiceover(
                                slide.id,
                                slide.voiceover_script ?? ""
                              )
                            }
                            className="text-xs font-medium text-muted-foreground transition hover:text-foreground"
                          >
                            {copiedVoiceoverSlideId === slide.id
                              ? "Copied"
                              : "Copy"}
                          </button>
                        )}
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-secondary-foreground md:mt-2 md:leading-7">
                        {slide.voiceover_script ?? "—"}
                      </p>
                    </div>

                    {slide.image_url && (
                      <div className="flex flex-wrap gap-2">
                        {isNativeApp === true ? (
                          <>
                            <button
                              type="button"
                              disabled={savingSlideId === slide.id}
                              onClick={() => handleSaveSlideToPhotos(slide)}
                              className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                            >
                              {savingSlideId === slide.id
                                ? "Saving…"
                                : "Save to Photos"}
                            </button>
                            <button
                              type="button"
                              disabled={sharingSlideId === slide.id}
                              onClick={() => handleShareSlide(slide)}
                              className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                            >
                              {sharingSlideId === slide.id ? "Sharing…" : "Share"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={downloadingSlideId === slide.id}
                            onClick={() => handleDownloadSlide(slide)}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                          >
                            {downloadingSlideId === slide.id
                              ? "Downloading…"
                              : "Download image"}
                          </button>
                        )}
                      </div>
                    )}

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

        <section
          id="section-publish"
          className="mt-8 scroll-mt-32 rounded-xl border border-border bg-card/30 p-4 sm:mt-10 sm:scroll-mt-36 sm:rounded-2xl sm:p-6 md:scroll-mt-48 md:p-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground md:text-xl">Publish</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6 md:max-w-2xl">
                AI-written post copy for TikTok, Instagram, and YouTube Shorts.
                Regenerating captions only updates publish copy — not your slide
                images.
              </p>
            </div>

            {sortedCaptions.length > 0 && (
              <button
                type="button"
                onClick={handleGenerateCaptions}
                disabled={!canGenerateCaptions}
                className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5 sm:py-3"
              >
                {isGeneratingCaptions ? "Regenerating…" : "Regenerate captions"}
              </button>
            )}
          </div>

          {captionsMessage && (
            <div className="mt-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
              {captionsMessage}
            </div>
          )}

          <div className="mt-4 sm:mt-6">
            {sortedCaptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-background/40 px-4 py-6 text-center sm:rounded-xl sm:px-6 sm:py-8">
                <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                  Use the next step bar to generate hooks, post copy, and
                  hashtags tailored to each platform.
                </p>
              </div>
            ) : (
              <article className="overflow-hidden rounded-lg border border-border bg-card/50 sm:rounded-xl">
                {sortedCaptions.map((platformCaption, index) => (
                  <section
                    key={platformCaption.id}
                    className={
                      index > 0 ? "border-t border-border" : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4 md:px-6">
                      <h3 className="text-sm font-semibold text-secondary-foreground">
                        {PLATFORM_LABELS[platformCaption.platform]}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopyCaption(platformCaption)}
                        className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition hover:border-ring/60 hover:text-foreground sm:px-3 sm:py-1.5 sm:text-xs"
                      >
                        {copiedPlatform === platformCaption.platform
                          ? "Copied"
                          : "Copy section"}
                      </button>
                    </div>

                    <div className="space-y-3 px-3 pb-4 sm:space-y-4 sm:px-5 sm:pb-6 md:px-6">
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
                          <p className="mt-1.5 text-sm leading-6 text-secondary-foreground sm:mt-2">
                            {platformCaption.hook}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Caption
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-secondary-foreground sm:mt-2 sm:leading-7">
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

        <section className="mt-12 border-t border-border pt-6 md:mt-16 md:pt-8">
          <h2 className="text-sm font-semibold text-foreground">Danger zone</h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Permanently delete this campaign and all of its slides. This cannot
            be undone.
          </p>
          <DeleteCampaignButton
            campaignId={campaign.id}
            campaignTitle={campaign.title}
            className="mt-4"
          />
        </section>
      </main>
      <ScrollToTopButton />
      <CarouselPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        slides={slides}
        aspectRatio={campaign.aspect_ratio}
        initialSlideIndex={previewInitialIndex}
      />
    </div>
  );
}
