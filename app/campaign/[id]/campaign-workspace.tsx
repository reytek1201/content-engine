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
import {
  formatSlidesImageStatus,
  scrollToCampaignNextStep,
  scrollToSlideCard,
} from "@/utils/campaign-progress";
import SlideCard from "@/app/campaign/[id]/slide-card";
import CarouselPreviewModal from "@/app/campaign/[id]/carousel-preview-modal";
import CampaignDetailsPanel from "@/app/campaign/[id]/campaign-details-panel";
import CampaignGeneratingView from "@/app/campaign/[id]/campaign-generating-view";
import CampaignGenerationPanel from "@/app/campaign/[id]/campaign-generation-panel";
import CampaignMobileTabs from "@/app/campaign/[id]/campaign-mobile-tabs";
import CampaignNextStepBar from "@/app/campaign/[id]/campaign-next-step-bar";
import CampaignPublishPanel from "@/app/campaign/[id]/campaign-publish-panel";
import CampaignProgressStrip from "@/app/campaign/[id]/campaign-progress-strip";
import CampaignSlidesMobileView from "@/app/campaign/[id]/campaign-slides-mobile-view";
import CampaignTitleEditor from "@/app/campaign/[id]/campaign-title-editor";
import {
  isMobileWorkspaceLayout,
  type CampaignWorkspaceTab,
} from "@/app/campaign/[id]/campaign-workspace-tab";
import CampaignBackLink from "@/app/components/campaign-back-link";
import DeleteCampaignButton from "@/app/components/delete-campaign-button";
import DuplicateCampaignButton from "@/app/components/duplicate-campaign-button";
import ScrollToTopButton from "@/app/components/scroll-to-top-button";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import {
  canUseNativeSlideExport,
  saveAllSlidesToPhotos,
  shareCampaignZip,
} from "@/utils/native-slide-export";
import { useCallback, useEffect, useRef, useState } from "react";

const USER_SCROLL_COOLDOWN_MS = 3000;
const SLIDE_UPDATE_DEBOUNCE_MS = 150;

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
  const [justFinishedSlide, setJustFinishedSlide] = useState<{
    slideIndex: number;
    imageUrl: string;
  } | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInitialIndex, setPreviewInitialIndex] = useState(0);
  const [isSavingAllPhotos, setIsSavingAllPhotos] = useState(false);
  const [savedAllPhotos, setSavedAllPhotos] = useState(false);
  const [saveAllPhotosProgress, setSaveAllPhotosProgress] = useState<{
    saved: number;
    total: number;
  } | null>(null);
  const isNativeApp = useIsNativeApp();
  const [regeneratingSlideId, setRegeneratingSlideId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<CampaignWorkspaceTab>("slides");
  const [mobileActiveSlideIndex, setMobileActiveSlideIndex] = useState(0);
  const [isRetryingText, setIsRetryingText] = useState(false);
  const textGenerationStarted = useRef(false);
  const prevSlidesRef = useRef(initialSlides);
  const prevImagesCompleteRef = useRef(
    initialSlides.length > 0 && initialSlides.every((slide) => slide.image_url)
  );
  const lastUserScrollAtRef = useRef(0);
  const isGeneratingImagesRef = useRef(false);
  const pendingSlideUpdatesRef = useRef<Map<string, Slide>>(new Map());
  const slideFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justFinishedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    isGeneratingImagesRef.current = isGeneratingImages;
  }, [isGeneratingImages]);

  useEffect(() => {
    function markUserScrolled() {
      lastUserScrollAtRef.current = Date.now();
    }

    window.addEventListener("scroll", markUserScrolled, { passive: true });
    window.addEventListener("wheel", markUserScrolled, { passive: true });
    window.addEventListener("touchmove", markUserScrolled, { passive: true });

    return () => {
      window.removeEventListener("scroll", markUserScrolled);
      window.removeEventListener("wheel", markUserScrolled);
      window.removeEventListener("touchmove", markUserScrolled);
    };
  }, []);

  useEffect(() => {
    const prev = prevSlidesRef.current;
    prevSlidesRef.current = slides;

    let newestReadySlide: Slide | null = null;

    for (const slide of slides) {
      const prevSlide = prev.find((entry) => entry.id === slide.id);
      if (slide.image_url && !prevSlide?.image_url) {
        newestReadySlide = slide;
      }
    }

    if (newestReadySlide && isGeneratingImages) {
      if (newestReadySlide.image_url) {
        setJustFinishedSlide({
          slideIndex: newestReadySlide.slide_index,
          imageUrl: newestReadySlide.image_url,
        });

        if (justFinishedTimerRef.current !== null) {
          clearTimeout(justFinishedTimerRef.current);
        }

        justFinishedTimerRef.current = setTimeout(() => {
          setJustFinishedSlide(null);
          justFinishedTimerRef.current = null;
        }, 4000);
      }

      const allCompleteNow = slides.every((slide) => slide.image_url);

      if (!allCompleteNow) {
        const userScrolledRecently =
          Date.now() - lastUserScrollAtRef.current < USER_SCROLL_COOLDOWN_MS;

        if (!userScrolledRecently) {
          requestAnimationFrame(() => {
            if (isMobileWorkspaceLayout()) {
              setMobileTab("slides");
              setMobileActiveSlideIndex(newestReadySlide!.slide_index);
              return;
            }

            scrollToSlideCard(newestReadySlide!.id);
          });
        }
      }
    }
  }, [slides, isGeneratingImages]);

  useEffect(() => {
    if (imagesComplete && !prevImagesCompleteRef.current) {
      if (isMobileWorkspaceLayout()) {
        setMobileTab("slides");
      } else {
        requestAnimationFrame(() => scrollToCampaignNextStep());
      }
    }

    prevImagesCompleteRef.current = imagesComplete;
  }, [imagesComplete]);

  useEffect(() => {
    return () => {
      if (justFinishedTimerRef.current !== null) {
        clearTimeout(justFinishedTimerRef.current);
      }
    };
  }, []);

  const refreshSlides = useCallback(async () => {
    const { data: refreshedSlides } = await supabase
      .from("slides")
      .select("id, campaign_id, slide_index, text_overlay, voiceover_script, image_url, fal_request_id, created_at, updated_at")
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
    function flushPendingSlideUpdates() {
      slideFlushTimerRef.current = null;
      const updates = pendingSlideUpdatesRef.current;

      if (updates.size === 0) {
        return;
      }

      pendingSlideUpdatesRef.current = new Map();

      setSlides((current) =>
        current.map((slide) => updates.get(slide.id) ?? slide)
      );
    }

    function scheduleSlideFlush() {
      if (slideFlushTimerRef.current !== null) {
        return;
      }

      slideFlushTimerRef.current = setTimeout(
        flushPendingSlideUpdates,
        SLIDE_UPDATE_DEBOUNCE_MS
      );
    }

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

          if (isGeneratingImagesRef.current) {
            pendingSlideUpdatesRef.current.set(updatedSlide.id, updatedSlide);
            scheduleSlideFlush();
            return;
          }

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
      if (slideFlushTimerRef.current !== null) {
        clearTimeout(slideFlushTimerRef.current);
        slideFlushTimerRef.current = null;
      }

      pendingSlideUpdatesRef.current = new Map();
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
          .select("id, campaign_id, slide_index, text_overlay, voiceover_script, image_url, fal_request_id, created_at, updated_at")
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

      if (canUseNativeSlideExport()) {
        await shareCampaignZip(blob, filename);
        setExportMessage(
          "Use the share sheet to save the zip to Files or send it elsewhere."
        );
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);

        setExportMessage("Campaign zip downloaded");
      }
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

      if (isMobileWorkspaceLayout()) {
        setMobileTab("publish");
      }
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

  async function handleSaveAllToPhotos() {
    setError(null);
    setExportMessage(null);
    setIsSavingAllPhotos(true);
    setSaveAllPhotosProgress(null);

    try {
      const result = await saveAllSlidesToPhotos(slides, (saved, total) => {
        setSaveAllPhotosProgress({ saved, total });
      });

      if (result.failedCount > 0) {
        setExportMessage(
          `Saved ${result.savedCount} of ${result.totalCount} slides to Photos`
        );
      } else {
        setSavedAllPhotos(true);
        window.setTimeout(() => setSavedAllPhotos(false), 3000);
        setExportMessage(
          result.savedCount === 1
            ? "Your slide is in Photos — open the Photos app to post."
            : "Your slides are in Photos — open the Photos app to post."
        );
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save slides to Photos"
      );
    } finally {
      setIsSavingAllPhotos(false);
      setSaveAllPhotosProgress(null);
    }
  }

  const handleOpenPreview = useCallback((slideIndex = 0) => {
    setPreviewInitialIndex(slideIndex);
    setPreviewOpen(true);
  }, []);

  const slidesWithImages = slides.filter((slide) => slide.image_url);

  const handleRegenerateSlide = useCallback(async (slideId: string) => {
    setError(null);
    setRegeneratingSlideId(slideId);

    try {
      const slide = slides.find((entry) => entry.id === slideId);
      const textOverlay = slide?.text_overlay?.trim() || undefined;

      const response = await fetch("/api/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId,
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
              }
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
  }, [campaign.id, slides, supabase]);

  const handleSlideUpdated = useCallback((slideId: string, patch: Partial<Slide>) => {
    setSlides((current) =>
      current.map((slide) =>
        slide.id === slideId ? { ...slide, ...patch } : slide
      )
    );
  }, []);

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
        className="page-main scroll-mt-0 max-md:pb-[calc(9.5rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="md:hidden">
          <CampaignBackLink className="mb-3" />
          <CampaignMobileTabs active={mobileTab} onChange={setMobileTab} />

          {(campaign.error_message || error) && (
            <div className="mt-4 space-y-3">
              {campaign.error_message && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
                >
                  {campaign.error_message}
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
                >
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        <header className="hidden border-b border-border pb-6 md:block md:pb-8">
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

        <div className="hidden md:block">
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
            isNativeApp={isNativeApp === true}
            isSavingAllPhotos={isSavingAllPhotos}
            saveAllPhotosProgress={saveAllPhotosProgress}
            savedAllPhotos={savedAllPhotos}
            copiedAllCaptions={copiedPlatform === "all"}
            onGenerateImages={handleGenerateImages}
            onGenerateCaptions={handleGenerateCaptions}
            onDownloadZip={handleDownloadZip}
            onCopyAllCaptions={handleCopyAllCaptions}
            onSaveAllToPhotos={handleSaveAllToPhotos}
          />
        </div>

        <section
          id="section-slides"
          className={`mt-4 scroll-mt-28 md:mt-10 md:scroll-mt-40 ${
            mobileTab !== "slides" ? "max-md:hidden" : ""
          }`}
        >
          <div className="mb-4 hidden flex-wrap items-end justify-between gap-3 md:mb-6 md:flex md:gap-4">
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

          <div className="mb-4 hidden md:block">
            <CampaignGenerationPanel
              slideCount={slideCount}
              imagesReadyCount={imagesReadyCount}
              imagesComplete={imagesComplete}
              isGeneratingImages={isGeneratingImages}
              isStartingImages={isGenerating}
              captionsCount={captions.length}
              isGeneratingCaptions={isGeneratingCaptions}
              justFinishedSlide={justFinishedSlide}
              variant="slides"
            />
          </div>

          {exportMessage && (
            <div className="mb-6 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
              {exportMessage}
            </div>
          )}

          <div className="md:hidden">
            <CampaignSlidesMobileView
              slides={slides}
              activeSlideIndex={mobileActiveSlideIndex}
              aspectRatio={campaign.aspect_ratio}
              slideCount={slideCount}
              imagesReadyCount={imagesReadyCount}
              imagesComplete={imagesComplete}
              isGeneratingImages={isGeneratingImages}
              isStartingImages={isGenerating}
              captionsCount={captions.length}
              isGeneratingCaptions={isGeneratingCaptions}
              justFinishedSlide={justFinishedSlide}
              isNativeApp={isNativeApp === true}
              isAnySlideGenerating={isAnySlideGenerating}
              regeneratingSlideId={regeneratingSlideId}
              onActiveSlideIndexChange={setMobileActiveSlideIndex}
              onOpenPreview={handleOpenPreview}
              onSlideUpdated={handleSlideUpdated}
              onRegenerate={handleRegenerateSlide}
              onError={setError}
            />
          </div>

          <div className="hidden grid-cols-1 gap-4 md:grid md:gap-6">
            {slides.map((slide) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                aspectRatio={campaign.aspect_ratio}
                isNativeApp={isNativeApp === true}
                isAnySlideGenerating={isAnySlideGenerating}
                isRegenerating={regeneratingSlideId === slide.id}
                onOpenPreview={handleOpenPreview}
                onSlideUpdated={handleSlideUpdated}
                onRegenerate={handleRegenerateSlide}
                onError={setError}
              />
            ))}
          </div>
        </section>

        <div
          className={mobileTab !== "publish" ? "max-md:hidden" : ""}
        >
          <div className="md:hidden space-y-4">
            <CampaignGenerationPanel
              slideCount={slideCount}
              imagesReadyCount={imagesReadyCount}
              imagesComplete={imagesComplete}
              isGeneratingImages={isGeneratingImages}
              isStartingImages={isGenerating}
              captionsCount={captions.length}
              isGeneratingCaptions={isGeneratingCaptions}
              variant="publish"
            />
            <CampaignPublishPanel
              sortedCaptions={sortedCaptions}
              canGenerateCaptions={canGenerateCaptions}
              isGeneratingCaptions={isGeneratingCaptions}
              captionsMessage={captionsMessage}
              copiedPlatform={copiedPlatform}
              onGenerateCaptions={handleGenerateCaptions}
              onCopyCaption={handleCopyCaption}
            />
          </div>

          <section
            id="section-publish"
            className="mt-8 hidden scroll-mt-28 rounded-xl border border-border bg-card/30 p-4 sm:mt-10 sm:scroll-mt-36 sm:rounded-2xl sm:p-6 md:block md:scroll-mt-40 md:p-8"
          >
          <CampaignGenerationPanel
            slideCount={slideCount}
            imagesReadyCount={imagesReadyCount}
            imagesComplete={imagesComplete}
            isGeneratingImages={isGeneratingImages}
            isStartingImages={isGenerating}
            captionsCount={captions.length}
            isGeneratingCaptions={isGeneratingCaptions}
            variant="publish"
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
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
        </div>

        {mobileTab === "details" && (
          <div className="md:hidden">
            <CampaignDetailsPanel
              campaign={campaign}
              slideCount={slideCount}
              imagesReadyCount={imagesReadyCount}
              imagesComplete={imagesComplete}
              isGeneratingImages={isGeneratingImages}
              captionsCount={captions.length}
              onTitleSaved={(title) =>
                setCampaign((current) => ({ ...current, title }))
              }
              onError={setError}
            />
          </div>
        )}

        <section className="mt-12 hidden border-t border-border pt-6 md:mt-16 md:block md:pt-8">
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

        <div className="md:hidden">
          <CampaignNextStepBar
            variant="fixed-bottom"
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
            isNativeApp={isNativeApp === true}
            isSavingAllPhotos={isSavingAllPhotos}
            saveAllPhotosProgress={saveAllPhotosProgress}
            savedAllPhotos={savedAllPhotos}
            copiedAllCaptions={copiedPlatform === "all"}
            onGenerateImages={handleGenerateImages}
            onGenerateCaptions={handleGenerateCaptions}
            onDownloadZip={handleDownloadZip}
            onCopyAllCaptions={handleCopyAllCaptions}
            onSaveAllToPhotos={handleSaveAllToPhotos}
            onTabChange={setMobileTab}
          />
        </div>
      </main>
      <div className="hidden md:block">
        <ScrollToTopButton />
      </div>
      {previewOpen && (
        <CarouselPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          slides={slides}
          aspectRatio={campaign.aspect_ratio}
          initialSlideIndex={previewInitialIndex}
        />
      )}
    </div>
  );
}
