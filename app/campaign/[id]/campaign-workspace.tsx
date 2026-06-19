"use client";

import { createClient } from "@/utils/supabase/client";
import type { AspectRatio, Campaign, Slide, SlideImage } from "@/types/campaign";
import type { PlatformCaption } from "@/types/captions";
import type { UsageSummary } from "@/types/usage";
import {
  formatAllCaptionsForCopy,
  formatCaptionForCopy,
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
import AddFormatSheet from "@/app/campaign/[id]/add-format-sheet";
import CampaignAspectToggle from "@/app/campaign/[id]/campaign-aspect-toggle";
import CarouselPreviewModal from "@/app/campaign/[id]/carousel-preview-modal";
import CampaignDetailsPanel from "@/app/campaign/[id]/campaign-details-panel";
import CampaignGeneratingView from "@/app/campaign/[id]/campaign-generating-view";
import CampaignGenerationPanel from "@/app/campaign/[id]/campaign-generation-panel";
import CampaignMobileTabs from "@/app/campaign/[id]/campaign-mobile-tabs";
import CampaignNextStepBar from "@/app/campaign/[id]/campaign-next-step-bar";
import {
  CampaignActionsSheet,
} from "@/app/campaign/[id]/campaign-actions-sheet";
import CampaignPublishPanel from "@/app/campaign/[id]/campaign-publish-panel";
import CampaignVideoExportOverlay from "@/app/campaign/[id]/campaign-video-export-overlay";
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
  shareCampaignVideo,
  shareCampaignZip,
} from "@/utils/native-slide-export";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import type { VoiceQuality } from "@/utils/tts/types";
import type { VideoExportPreset } from "@/utils/video-export-presets";
import { getVideoExportFilename } from "@/utils/video-export-filename";
import { readJsonResponse } from "@/utils/read-json-response";
import {
  TTS_EXPORT_SUCCESS_DISCLOSURE,
  TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE,
} from "@/utils/tts/disclosure-copy";
import {
  VIDEO_EXPORT_POLL_TIMEOUT_MS,
  mapPipelineStageToUiStage,
  type VideoExportUiStage,
} from "@/utils/video-export-stages";
import {
  indexSlideImages,
  mergeSlidesWithAspect,
  otherAspectRatio,
  slidesCompleteForAspect,
} from "@/utils/slide-aspect-images";

const USER_SCROLL_COOLDOWN_MS = 3000;
const SLIDE_UPDATE_DEBOUNCE_MS = 150;

interface CampaignWorkspaceProps {
  initialCampaign: Campaign;
  initialSlides: Slide[];
  initialSlideImages: SlideImage[];
  initialCaptions: PlatformCaption[];
  userId: string;
  brandName?: string | null;
  initialPreferredVoicePersona?: VoicePersona;
}

export default function CampaignWorkspace({
  initialCampaign,
  initialSlides,
  initialSlideImages,
  initialCaptions,
  userId,
  brandName = null,
  initialPreferredVoicePersona = "warm",
}: CampaignWorkspaceProps) {
  const supabase = createClient();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [slides, setSlides] = useState(initialSlides);
  const [slideImages, setSlideImages] = useState(initialSlideImages);
  const [activeAspectRatio, setActiveAspectRatio] = useState<AspectRatio>(
    initialCampaign.aspect_ratio,
  );
  const [addFormatSheetOpen, setAddFormatSheetOpen] = useState(false);
  const [isGeneratingFormat, setIsGeneratingFormat] = useState(false);
  const [videoExportAspectRatio, setVideoExportAspectRatio] = useState<AspectRatio>(
    initialCampaign.aspect_ratio,
  );
  const [captions, setCaptions] = useState(initialCaptions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [audioExportMessage, setAudioExportMessage] = useState<string | null>(null);
  const [videoExportMessage, setVideoExportMessage] = useState<string | null>(null);
  const [videoExportError, setVideoExportError] = useState<string | null>(null);
  const [videoExportStage, setVideoExportStage] =
    useState<VideoExportUiStage>("preparing");
  const [youtubePublishRefreshKey, setYoutubePublishRefreshKey] = useState(0);
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
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [isRetryingText, setIsRetryingText] = useState(false);
  const [preferredVoicePersona, setPreferredVoicePersona] = useState<VoicePersona>(
    initialPreferredVoicePersona,
  );
  const [isSavingVoicePersona, setIsSavingVoicePersona] = useState(false);
  const [voiceQuality, setVoiceQuality] = useState<VoiceQuality>("standard");
  const [videoPreset, setVideoPreset] = useState<VideoExportPreset>("quick_reel");
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const textGenerationStarted = useRef(false);
  const prevSlidesRef = useRef(initialSlides);
  const prevImagesCompleteRef = useRef(
    initialSlides.length > 0 &&
      initialSlides.every((slide) => slide.image_url),
  );
  const lastUserScrollAtRef = useRef(0);
  const isGeneratingImagesRef = useRef(false);
  const pendingSlideUpdatesRef = useRef<Map<string, Slide>>(new Map());
  const slideFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justFinishedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideIdsRef = useRef(new Set(initialSlides.map((slide) => slide.id)));

  const imageIndex = useMemo(
    () => indexSlideImages(slideImages),
    [slideImages],
  );

  const displaySlides = useMemo(
    () => mergeSlidesWithAspect(slides, activeAspectRatio, campaign, imageIndex),
    [slides, activeAspectRatio, campaign, imageIndex],
  );

  const secondaryAspectRatio = campaign.secondary_aspect_ratio;
  const upsellAspectRatio = otherAspectRatio(campaign.aspect_ratio);

  const primaryImagesComplete = useMemo(
    () =>
      slides.length > 0 &&
      slidesCompleteForAspect(
        slides,
        campaign.aspect_ratio,
        campaign,
        imageIndex,
      ),
    [slides, campaign, imageIndex],
  );

  const secondaryImagesComplete = useMemo(
    () =>
      Boolean(
        secondaryAspectRatio &&
          slidesCompleteForAspect(
            slides,
            secondaryAspectRatio,
            campaign,
            imageIndex,
          ),
      ),
    [slides, secondaryAspectRatio, campaign, imageIndex],
  );

  const activeImagesComplete = useMemo(
    () =>
      slides.length > 0 &&
      slidesCompleteForAspect(slides, activeAspectRatio, campaign, imageIndex),
    [slides, activeAspectRatio, campaign, imageIndex],
  );

  const imagesComplete = primaryImagesComplete;
  const slideCount = campaign.slide_count ?? slides.length;
  const imagesReadyCount = displaySlides.filter((slide) => slide.image_url).length;
  const canShowFormatUpsell =
    primaryImagesComplete &&
    !secondaryAspectRatio &&
    campaign.status !== "generating_images";
  const dualFormatVideoReady =
    Boolean(secondaryAspectRatio) &&
    primaryImagesComplete &&
    secondaryImagesComplete;

  const isAwaitingTextGeneration =
    slides.length === 0 &&
    (campaign.status === "generating_text" || campaign.status === "failed");

  const isAnySlideGenerating = displaySlides.some(
    (slide) => slide.fal_request_id && !slide.image_url,
  );
  const isGeneratingImages =
    campaign.status === "generating_images" || isAnySlideGenerating;
  const canGenerateImages =
    !isGenerating &&
    campaign.status !== "generating_images" &&
    !primaryImagesComplete;
  const sortedCaptions = sortCaptionsByPlatform(captions);
  const canGenerateCaptions = slides.length > 0 && !isGeneratingCaptions;
  const hasVoiceoverScripts = slides.some((slide) =>
    Boolean(slide.voiceover_script?.trim()),
  );
  const allSlidesHaveVoiceoverScripts =
    slides.length > 0 &&
    slides.every((slide) => Boolean(slide.voiceover_script?.trim()));
  const videoExportReady =
    (videoExportAspectRatio === "9:16" || videoExportAspectRatio === "4:5") &&
    slidesCompleteForAspect(
      slides,
      videoExportAspectRatio,
      campaign,
      imageIndex,
    ) &&
    allSlidesHaveVoiceoverScripts;
  const hasVideoCredits = usage?.canExportVideo ?? false;
  const videoCreditsKnown = !usageLoading;

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      try {
        const response = await fetch("/api/usage");
        const data = (await response.json()) as {
          success: boolean;
          usage?: UsageSummary;
        };

        if (response.ok && data.success && data.usage && !cancelled) {
          setUsage(data.usage);
        }
      } catch {
        // Publish panel falls back to locked video until usage loads.
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
        }
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    slideIdsRef.current = new Set(slides.map((slide) => slide.id));
  }, [slides]);

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
    prevSlidesRef.current = displaySlides;

    let newestReadySlide: Slide | null = null;

    for (const slide of displaySlides) {
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

      const allCompleteNow = displaySlides.every((slide) => slide.image_url);

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
  }, [displaySlides, isGeneratingImages]);

  useEffect(() => {
    if (imagesComplete && !prevImagesCompleteRef.current) {
      if (isMobileWorkspaceLayout()) {
        setMobileTab("slides");
        setActionsSheetOpen(true);
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

  const refreshSlideImages = useCallback(async () => {
    const slideIds = slides.map((slide) => slide.id);

    if (slideIds.length === 0) {
      setSlideImages([]);
      return;
    }

    const { data } = await supabase
      .from("slide_images")
      .select("*")
      .in("slide_id", slideIds);

    if (data) {
      setSlideImages(data as SlideImage[]);
    }
  }, [slides, supabase]);

  const refreshSlides = useCallback(async () => {
    const { data: refreshedSlides } = await supabase
      .from("slides")
      .select("id, campaign_id, slide_index, text_overlay, voiceover_script, image_url, fal_request_id, created_at, updated_at")
      .eq("campaign_id", campaign.id)
      .order("slide_index", { ascending: true });

    if (refreshedSlides) {
      setSlides(refreshedSlides as Slide[]);
    }

    await refreshSlideImages();
  }, [campaign.id, refreshSlideImages, supabase]);

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
          event: "*",
          schema: "public",
          table: "slide_images",
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as SlideImage | undefined;

          if (!row?.slide_id || !slideIdsRef.current.has(row.slide_id)) {
            return;
          }

          if (payload.eventType === "DELETE") {
            setSlideImages((current) =>
              current.filter((entry) => entry.id !== row.id),
            );
            return;
          }

          setSlideImages((current) => {
            const existingIndex = current.findIndex((entry) => entry.id === row.id);

            if (existingIndex === -1) {
              return [...current, row];
            }

            const next = [...current];
            next[existingIndex] = row;
            return next;
          });
        },
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

  async function handleGenerateFormatVariant() {
    setError(null);
    setIsGeneratingFormat(true);

    try {
      const response = await fetch("/api/generate-format-variant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        mode?: string;
        aspectRatio?: AspectRatio;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to add format");
      }

      setAddFormatSheetOpen(false);
      setActiveAspectRatio(data.aspectRatio ?? upsellAspectRatio);
      setCampaign((current) => ({
        ...current,
        secondary_aspect_ratio: data.aspectRatio ?? upsellAspectRatio,
        status: data.mode === "sync" ? "completed" : "generating_images",
        image_generation_aspect: data.mode === "sync" ? null : upsellAspectRatio,
        error_message: null,
      }));

      if (data.mode === "sync") {
        await Promise.all([refreshSlides(), refreshCampaign()]);
      }
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Something went wrong",
      );
    } finally {
      setIsGeneratingFormat(false);
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

  async function handleDownloadNarration() {
    setError(null);
    setAudioExportMessage(null);
    setIsExportingAudio(true);

    try {
      const response = await fetch("/api/export-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          persona: preferredVoicePersona,
          voiceQuality,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Narration export failed");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? "narration.zip";

      if (canUseNativeSlideExport()) {
        await shareCampaignZip(blob, filename);
        setAudioExportMessage(
          `Use the share sheet to save the narration zip. ${TTS_EXPORT_SUCCESS_DISCLOSURE}`,
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

        setAudioExportMessage(`Narration zip downloaded. ${TTS_EXPORT_SUCCESS_DISCLOSURE}`);
      }
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Something went wrong",
      );
    } finally {
      setIsExportingAudio(false);
    }
  }

  async function pollVideoExport(
    exportId: string,
    onStageChange: (stage: VideoExportUiStage) => void,
  ): Promise<string> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < VIDEO_EXPORT_POLL_TIMEOUT_MS) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await fetch(`/api/exports/${exportId}`);
      const data = await readJsonResponse<{
        success?: boolean;
        export?: {
          status?: string;
          stage?: string | null;
          outputUrl?: string | null;
          errorMessage?: string | null;
        };
        error?: string;
      }>(response);

      if (!response.ok || !data.success || !data.export) {
        throw new Error(data.error ?? "Failed to check video export status");
      }

      if (data.export.stage) {
        onStageChange(mapPipelineStageToUiStage(data.export.stage));
      }

      if (data.export.status === "completed" && data.export.outputUrl) {
        return data.export.outputUrl;
      }

      if (data.export.status === "failed") {
        throw new Error(data.export.errorMessage ?? "Video export failed");
      }
    }

    throw new Error(
      "Video export is taking longer than expected. Try again in a few minutes.",
    );
  }

  function getCampaignVideoFilename(): string {
    return getVideoExportFilename(campaign.title, campaign.id, videoPreset);
  }

  async function handleExportVideo() {
    setError(null);
    setVideoExportMessage(null);
    setVideoExportError(null);
    setVideoExportStage("preparing");
    setIsExportingVideo(true);

    try {
      const response = await fetch("/api/export-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          persona: preferredVoicePersona,
          preset: videoPreset,
          voiceQuality,
          aspectRatio: videoExportAspectRatio,
        }),
      });

      const data = await readJsonResponse<{
        success?: boolean;
        exportId?: string;
        error?: string;
        code?: string;
        upgradeUrl?: string;
        fastPath?: "image_only";
        reusedNarration?: boolean;
      }>(response);

      if (response.status === 429 && data.code === "LIMIT_EXCEEDED") {
        setUsage((current) =>
          current
            ? {
                ...current,
                canExportVideo: false,
                remaining: { ...current.remaining, videos: 0 },
              }
            : current,
        );
        throw new Error(
          data.error ??
            "Video export limit reached. View plans in Settings to upgrade.",
        );
      }

      if (!response.ok || !data.success || !data.exportId) {
        throw new Error(data.error ?? "Video export failed");
      }

      if (data.fastPath === "image_only") {
        setVideoExportMessage(
          "Scripts unchanged — reusing narration and re-rendering updated slide images.",
        );
      }

      setUsage((current) =>
        current && current.remaining.videos > 0
          ? {
              ...current,
              remaining: {
                ...current.remaining,
                videos: current.remaining.videos - 1,
              },
              canExportVideo: current.remaining.videos - 1 > 0,
            }
          : current,
      );

      setVideoExportStage("compose_slides");

      const outputUrl = await pollVideoExport(data.exportId, setVideoExportStage);
      if (videoExportAspectRatio === "9:16") {
        setYoutubePublishRefreshKey((current) => current + 1);
      }
      setVideoExportStage("downloading");
      const filename = getCampaignVideoFilename();
      const videoResponse = await fetch(outputUrl);

      if (!videoResponse.ok) {
        throw new Error("Failed to download rendered video");
      }

      const blob = await videoResponse.blob();

      if (canUseNativeSlideExport()) {
        await shareCampaignVideo(blob, filename);
        setVideoExportMessage(
          `Use the share sheet to save your video. ${TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE}`,
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

        setVideoExportMessage(
          `Video downloaded. ${TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE}`,
        );
      }
    } catch (exportError) {
      const message =
        exportError instanceof Error
          ? exportError.message
          : "Something went wrong";

      setError(message);
      setVideoExportError(message);
    } finally {
      setIsExportingVideo(false);
    }
  }

  const publishPanelProps = {
    campaignId: campaign.id,
    sortedCaptions,
    imagesComplete,
    hasVoiceoverScripts,
    videoExportReady,
    hasVideoCredits,
    videoCreditsKnown,
    videoPlanLabel: usage?.planLabel ?? "Free",
    videoTier: usage?.tier ?? "free",
    canGenerateCaptions,
    isGeneratingCaptions,
    captionsMessage,
    copiedPlatform,
    copiedAllCaptions: copiedPlatform === "all",
    isNativeApp: isNativeApp === true,
    preferredVoicePersona,
    voiceQuality,
    videoPreset,
    aspectRatioLabel: formatAspectRatio(videoExportAspectRatio),
    dualFormatVideoReady,
    videoExportAspectRatio,
    brandId: campaign.brand_id,
    isSavingVoicePersona,
    isExporting,
    isExportingAudio,
    isSavingAllPhotos,
    saveAllPhotosProgress,
    savedAllPhotos,
    exportMessage,
    audioExportMessage,
    isExportingVideo,
    videoExportMessage,
    youtubePublishRefreshKey,
    campaignStatus: campaign.status,
    onGenerateCaptions: handleGenerateCaptions,
    onCopyCaption: handleCopyCaption,
    onCopyAllCaptions: handleCopyAllCaptions,
    onPersonaChange: (persona: VoicePersona) => void handleVoicePersonaChange(persona),
    onVoiceQualityChange: setVoiceQuality,
    onVideoPresetChange: setVideoPreset,
    onVideoExportAspectRatioChange: setVideoExportAspectRatio,
    onDownloadZip: handleDownloadZip,
    onDownloadNarration: handleDownloadNarration,
    onExportVideo: handleExportVideo,
    onSaveAllToPhotos: handleSaveAllToPhotos,
  };

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
      const result = await saveAllSlidesToPhotos(displaySlides, (saved, total) => {
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

  const slidesWithImages = displaySlides.filter((slide) => slide.image_url);

  const handleRegenerateSlide = useCallback(async (
    slideId: string,
    options?: { snapProductUrl?: string; feedback?: string[]; notes?: string },
  ) => {
    setError(null);
    setRegeneratingSlideId(slideId);

    try {
      const slide = displaySlides.find((entry) => entry.id === slideId);
      const textOverlay = slide?.text_overlay?.trim() || undefined;

      const response = await fetch("/api/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId,
          aspectRatio: activeAspectRatio,
          text_overlay: textOverlay,
          ...(options?.feedback?.length ? { feedback: options.feedback } : {}),
          ...(options?.notes ? { notes: options.notes } : {}),
          ...(options?.snapProductUrl ? { snapProductUrl: options.snapProductUrl } : {}),
        }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
        mode?: string;
        aspectRatio?: AspectRatio;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to regenerate slide");
      }

      const targetAspect = data.aspectRatio ?? activeAspectRatio;

      setSlideImages((current) => {
        const existing = current.find(
          (entry) =>
            entry.slide_id === slideId && entry.aspect_ratio === targetAspect,
        );

        if (existing) {
          return current.map((entry) =>
            entry.id === existing.id
              ? { ...entry, image_url: null, fal_request_id: null }
              : entry,
          );
        }

        return [
          ...current,
          {
            id: `pending-${slideId}-${targetAspect}`,
            slide_id: slideId,
            aspect_ratio: targetAspect,
            image_url: null,
            fal_request_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });

      if (targetAspect === campaign.aspect_ratio) {
        setSlides((current) =>
          current.map((entry) =>
            entry.id === slideId
              ? {
                  ...entry,
                  image_url: null,
                  fal_request_id: null,
                }
              : entry,
          ),
        );
      }

      setCampaign((current) => ({
        ...current,
        status: "generating_images",
        error_message: null,
        image_generation_aspect: targetAspect,
      }));

      if (data.mode === "sync") {
        await Promise.all([refreshSlides(), refreshCampaign()]);
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
  }, [
    activeAspectRatio,
    campaign.aspect_ratio,
    campaign.id,
    displaySlides,
    refreshCampaign,
    refreshSlides,
  ]);

  const handleSlideUpdated = useCallback((slideId: string, patch: Partial<Slide>) => {
    setSlides((current) =>
      current.map((slide) =>
        slide.id === slideId ? { ...slide, ...patch } : slide
      )
    );
  }, []);

  const handleVoicePersonaChange = useCallback(
    async (persona: VoicePersona) => {
      setPreferredVoicePersona(persona);

      if (!campaign.brand_id) {
        return;
      }

      setIsSavingVoicePersona(true);
      try {
        const response = await fetch(`/api/brands/${campaign.brand_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ preferred_voice_persona: persona }),
        });

        const data = (await response.json()) as {
          success?: boolean;
          error?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "Failed to save voice preference");
        }
      } catch (error) {
        setPreferredVoicePersona(initialPreferredVoicePersona);
        setError(
          error instanceof Error
            ? error.message
            : "Failed to save voice preference",
        );
      } finally {
        setIsSavingVoicePersona(false);
      }
    },
    [campaign.brand_id, initialPreferredVoicePersona],
  );

  const nextStepProps = {
    slideCount,
    imagesReadyCount,
    imagesComplete,
    isGeneratingImages,
    canGenerateImages,
    isStartingImages: isGenerating,
    captionsCount: captions.length,
    canGenerateCaptions,
    isGeneratingCaptions,
    isExporting,
    isExportingAudio,
    hasVoiceoverScripts,
    isNativeApp: isNativeApp === true,
    isSavingAllPhotos,
    saveAllPhotosProgress,
    savedAllPhotos,
    copiedAllCaptions: copiedPlatform === "all",
    onGenerateImages: handleGenerateImages,
    onGenerateCaptions: handleGenerateCaptions,
    onDownloadZip: handleDownloadZip,
    onDownloadNarration: handleDownloadNarration,
    onCopyAllCaptions: handleCopyAllCaptions,
    onSaveAllToPhotos: handleSaveAllToPhotos,
  };

  useEffect(() => {
    if (previewOpen) {
      setActionsSheetOpen(false);
    }
  }, [previewOpen]);

  if (isAwaitingTextGeneration) {
    return (
      <CampaignGeneratingView
        campaign={campaign}
        brandName={brandName}
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
        <div className="md:hidden">
          <CampaignBackLink
            className="mb-3"
            brandId={campaign.brand_id}
            brandName={brandName}
          />
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
          <CampaignBackLink
            className="mb-4"
            brandId={campaign.brand_id}
            brandName={brandName}
          />
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
          <CampaignNextStepBar {...nextStepProps} />
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
                  imagesComplete: activeImagesComplete,
                  isGeneratingImages,
                })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {secondaryAspectRatio ? (
                <CampaignAspectToggle
                  primaryAspectRatio={campaign.aspect_ratio}
                  secondaryAspectRatio={secondaryAspectRatio}
                  activeAspectRatio={activeAspectRatio}
                  onChange={setActiveAspectRatio}
                  disabled={isGeneratingImages}
                />
              ) : null}

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
          </div>

          {canShowFormatUpsell && (
            <div className="mb-4 hidden rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 md:mb-6 md:block">
              <p className="text-sm font-semibold text-foreground">
                Also post in {formatAspectRatio(upsellAspectRatio)}?
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Re-use your copy and voiceover — we&apos;ll generate new images
                sized for {upsellAspectRatio === "9:16" ? "Reels and Stories" : "feed posts"}.
              </p>
              <button
                type="button"
                onClick={() => setAddFormatSheetOpen(true)}
                className="btn-primary mt-4 w-full py-2.5 text-sm sm:w-auto sm:px-6"
              >
                Add {formatAspectRatio(upsellAspectRatio)}
              </button>
            </div>
          )}

          <div className="mb-4 hidden md:block">
            <CampaignGenerationPanel
              {...nextStepProps}
              justFinishedSlide={justFinishedSlide}
              variant="slides"
            />
          </div>

          <div className="md:hidden">
            {secondaryAspectRatio ? (
              <div className="mb-4 flex justify-center">
                <CampaignAspectToggle
                  primaryAspectRatio={campaign.aspect_ratio}
                  secondaryAspectRatio={secondaryAspectRatio}
                  activeAspectRatio={activeAspectRatio}
                  onChange={setActiveAspectRatio}
                  disabled={isGeneratingImages}
                />
              </div>
            ) : null}

            {canShowFormatUpsell ? (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4">
                <p className="text-sm font-semibold text-foreground">
                  Also post in {formatAspectRatio(upsellAspectRatio)}?
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Same copy and voiceover — new images for the other format.
                </p>
                <button
                  type="button"
                  onClick={() => setAddFormatSheetOpen(true)}
                  className="btn-primary mt-4 w-full py-2.5 text-sm"
                >
                  Add {formatAspectRatio(upsellAspectRatio)}
                </button>
              </div>
            ) : null}

            <CampaignSlidesMobileView
              slides={displaySlides}
              activeSlideIndex={mobileActiveSlideIndex}
              aspectRatio={activeAspectRatio}
              campaignId={campaign.id}
              preferredVoicePersona={preferredVoicePersona}
              isSavingVoicePersona={isSavingVoicePersona}
              onPersonaChange={(persona) => void handleVoicePersonaChange(persona)}
              justFinishedSlide={justFinishedSlide}
              nextStepProps={nextStepProps}
              onOpenMoreActions={() => setActionsSheetOpen(true)}
              onTabChange={setMobileTab}
              isNativeApp={isNativeApp === true}
              isAnySlideGenerating={isAnySlideGenerating}
              regeneratingSlideId={regeneratingSlideId}
              onActiveSlideIndexChange={setMobileActiveSlideIndex}
              onOpenPreview={handleOpenPreview}
              onSlideUpdated={handleSlideUpdated}
              onRegenerate={handleRegenerateSlide}
              onError={setError}
              userId={userId}
            />
          </div>

          <div className="hidden grid-cols-1 gap-4 md:grid md:gap-6">
            {displaySlides.map((slide) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                aspectRatio={activeAspectRatio}
                campaignId={campaign.id}
                preferredVoicePersona={preferredVoicePersona}
                onPersonaChange={(persona) => void handleVoicePersonaChange(persona)}
                isSavingVoicePersona={isSavingVoicePersona}
                isNativeApp={isNativeApp === true}
                isAnySlideGenerating={isAnySlideGenerating}
                isRegenerating={regeneratingSlideId === slide.id}
                onOpenPreview={handleOpenPreview}
                onSlideUpdated={handleSlideUpdated}
                onRegenerate={handleRegenerateSlide}
                onError={setError}
                userId={userId}
              />
            ))}
          </div>
        </section>

        <div
          className={mobileTab !== "publish" ? "max-md:hidden" : ""}
        >
          <CampaignPublishPanel {...publishPanelProps} />
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

      </main>
      <CampaignActionsSheet
        open={actionsSheetOpen}
        onClose={() => setActionsSheetOpen(false)}
        onTabChange={setMobileTab}
        {...nextStepProps}
      />
      <div className="hidden md:block">
        <ScrollToTopButton />
      </div>
      {previewOpen && (
        <CarouselPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          slides={displaySlides}
          aspectRatio={activeAspectRatio}
          initialSlideIndex={previewInitialIndex}
        />
      )}
      <AddFormatSheet
        open={addFormatSheetOpen}
        onClose={() => setAddFormatSheetOpen(false)}
        secondaryAspectRatio={upsellAspectRatio}
        slideCount={slideCount}
        isGenerating={isGeneratingFormat}
        onConfirm={() => void handleGenerateFormatVariant()}
      />
      <CampaignVideoExportOverlay
        open={isExportingVideo || Boolean(videoExportError)}
        campaignTitle={campaign.title ?? ""}
        campaignTopic={campaign.topic}
        aspectRatio={videoExportAspectRatio}
        slideCount={slides.length}
        stage={videoExportStage}
        videoPreset={videoPreset}
        error={videoExportError}
        onDismiss={() => {
          setVideoExportError(null);
          setVideoExportStage("preparing");
        }}
      />
    </div>
  );
}
