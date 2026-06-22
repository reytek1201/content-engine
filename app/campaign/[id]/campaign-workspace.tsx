"use client";

import { createClient } from "@/utils/supabase/client";
import type { AspectRatio, Campaign, Slide, SlideImage } from "@/types/campaign";
import type { CaptionCopyField, PlatformCaption } from "@/types/captions";
import type { UsageSummary } from "@/types/usage";
import {
  captionCopyKey,
  formatAllCaptionsForCopy,
  formatCaptionFieldForCopy,
  sortCaptionsByPlatform,
} from "@/types/captions";
import {
  formatAspectRatio,
} from "@/utils/campaign-display";
import {
  formatSlidesImageStatus,
  scrollToCampaignSection,
  scrollToSlideCard,
} from "@/utils/campaign-progress";
import SlideCard from "@/app/campaign/[id]/slide-card";
import AddFormatSheet from "@/app/campaign/[id]/add-format-sheet";
import CampaignAspectToggle from "@/app/campaign/[id]/campaign-aspect-toggle";
import CarouselPreviewModal from "@/app/campaign/[id]/carousel-preview-modal";
import CampaignDetailsPanel from "@/app/campaign/[id]/campaign-details-panel";
import CampaignGeneratingView from "@/app/campaign/[id]/campaign-generating-view";
import CampaignGenerationPanel from "@/app/campaign/[id]/campaign-generation-panel";
import CampaignWorkspaceTabs from "@/app/campaign/[id]/campaign-workspace-tabs";
import CampaignJourneyStrip from "@/app/campaign/[id]/campaign-journey-strip";
import {
  CampaignActionsSheet,
} from "@/app/campaign/[id]/campaign-actions-sheet";
import CampaignPublishPanel from "@/app/campaign/[id]/campaign-publish-panel";
import type { LastVideoExportInfo } from "@/app/campaign/[id]/campaign-video-panel";
import CampaignOperationOverlay from "@/app/campaign/[id]/campaign-operation-overlay";
import { pickActiveCampaignOperation } from "@/utils/campaign-operation-overlay";
import CampaignCaptionsPrompt, {
  shouldShowCaptionsPrompt,
} from "@/app/campaign/[id]/campaign-captions-prompt";
import CampaignWorkspaceTour from "@/app/campaign/[id]/campaign-workspace-tour";
import CampaignSlidesMobileView from "@/app/campaign/[id]/campaign-slides-mobile-view";
import CampaignTitleEditor from "@/app/campaign/[id]/campaign-title-editor";
import {
  isMobileWorkspaceLayout,
  parseCampaignWorkspaceTab,
  type CampaignWorkspaceTab,
} from "@/app/campaign/[id]/campaign-workspace-tab";
import CampaignBackLink from "@/app/components/campaign-back-link";
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
import { useSearchParams } from "next/navigation";
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
  pollVideoExport,
  tryRecoverCompletedExport,
} from "@/utils/poll-video-export";
import { setBiometricLockDeferred } from "@/utils/biometric-lock-defer";
import {
  type VideoExportUiStage,
} from "@/utils/video-export-stages";
import {
  getVerticalFormatPublishState,
  getCarouselFormatPublishState,
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
  const searchParams = useSearchParams();
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
  const [isPublishingYouTube, setIsPublishingYouTube] = useState(false);
  const [isPublishingTikTok, setIsPublishingTikTok] = useState(false);
  const [isPublishingInstagram, setIsPublishingInstagram] = useState(false);
  const [isPublishingInstagramCarousel, setIsPublishingInstagramCarousel] =
    useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAudio, setIsExportingAudio] = useState(false);
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [isDownloadingLastVideoExport, setIsDownloadingLastVideoExport] =
    useState(false);
  const [lastVideoExport, setLastVideoExport] = useState<LastVideoExportInfo | null>(
    null,
  );
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [audioExportMessage, setAudioExportMessage] = useState<string | null>(null);
  const [videoExportMessage, setVideoExportMessage] = useState<string | null>(null);
  const [videoExportError, setVideoExportError] = useState<string | null>(null);
  const [videoExportStage, setVideoExportStage] =
    useState<VideoExportUiStage>("preparing");
  const [publishRefreshKey, setPublishRefreshKey] = useState(0);
  const [publishFlow, setPublishFlow] = useState({
    hasVideoExport: false,
    youtubeAlreadyPublished: false,
    youtubeWatchUrl: null as string | null,
    youtubeConnected: false,
    tiktokAlreadyPublished: false,
    tiktokProfileUrl: null as string | null,
    tiktokConnected: false,
    instagramAlreadyPublished: false,
    instagramProfileUrl: null as string | null,
    instagramConnected: false,
  });
  const [captionsMessage, setCaptionsMessage] = useState<string | null>(null);
  const [justFinishedSlide, setJustFinishedSlide] = useState<{
    slideIndex: number;
    imageUrl: string;
  } | null>(null);
  const [copiedCopyKey, setCopiedCopyKey] = useState<string | null>(null);
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
  const [workspaceTab, setWorkspaceTab] = useState<CampaignWorkspaceTab>("slides");
  const [publishTabHint, setPublishTabHint] = useState<string | null>(null);
  const [mobileActiveSlideIndex, setMobileActiveSlideIndex] = useState(0);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [captionsPromptOpen, setCaptionsPromptOpen] = useState(false);
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
  const skipPublishAutoNavRef = useRef(false);
  const lastUserScrollAtRef = useRef(0);
  const isGeneratingImagesRef = useRef(false);
  const pendingSlideUpdatesRef = useRef<Map<string, Slide>>(new Map());
  const slideFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justFinishedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideIdsRef = useRef(new Set(initialSlides.map((slide) => slide.id)));
  const activeVideoExportIdRef = useRef<string | null>(null);

  const syncVideoExportBiometricDefer = useCallback(() => {
    setBiometricLockDeferred(
      "video_export",
      isExportingVideo || Boolean(activeVideoExportIdRef.current),
    );
  }, [isExportingVideo]);

  useEffect(() => {
    syncVideoExportBiometricDefer();
  }, [syncVideoExportBiometricDefer]);

  useEffect(() => {
    const tab = parseCampaignWorkspaceTab(searchParams.get("tab"));

    if (tab) {
      setWorkspaceTab(tab);
    }
  }, [searchParams]);

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
  const verticalFormatPublishState = useMemo(
    () =>
      getVerticalFormatPublishState({
        slides,
        campaign,
        imageIndex,
        primaryImagesComplete,
      }),
    [slides, campaign, imageIndex, primaryImagesComplete],
  );
  const carouselFormatPublishState = useMemo(
    () =>
      getCarouselFormatPublishState({
        slides,
        campaign,
        imageIndex,
        primaryImagesComplete,
      }),
    [slides, campaign, imageIndex, primaryImagesComplete],
  );
  const verticalVideoExportReady = useMemo(
    () =>
      slides.length > 0 &&
      slidesCompleteForAspect(slides, "9:16", campaign, imageIndex) &&
      allSlidesHaveVoiceoverScripts,
    [slides, campaign, imageIndex, allSlidesHaveVoiceoverScripts],
  );
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
    if (!videoExportReady) {
      setLastVideoExport(null);
      return;
    }

    let cancelled = false;

    async function loadLastVideoExport() {
      try {
        const params = new URLSearchParams({
          campaignId: campaign.id,
          aspectRatio: videoExportAspectRatio,
        });
        const response = await fetch(`/api/export-video/latest?${params}`);
        const data = (await response.json()) as {
          success?: boolean;
          export?: LastVideoExportInfo;
        };

        if (cancelled) {
          return;
        }

        if (response.ok && data.success && data.export) {
          setLastVideoExport(data.export);
        } else {
          setLastVideoExport(null);
        }
      } catch {
        if (!cancelled) {
          setLastVideoExport(null);
        }
      }
    }

    void loadLastVideoExport();

    return () => {
      cancelled = true;
    };
  }, [
    campaign.id,
    videoExportAspectRatio,
    videoExportReady,
    publishRefreshKey,
  ]);

  useEffect(() => {
    if (!isNativeApp) {
      return;
    }

    async function recoverStaleVideoExportError() {
      const exportId = activeVideoExportIdRef.current;

      if (!exportId || !videoExportError) {
        return;
      }

      const outputUrl = await tryRecoverCompletedExport(
        exportId,
        setVideoExportStage,
      );

      if (!outputUrl) {
        return;
      }

      setVideoExportError(null);
      setPublishRefreshKey((current) => current + 1);
      setVideoExportMessage(
        "Your video finished rendering while you were away. Use Download last export on Publish.",
      );
    }

    function handleResume() {
      if (document.visibilityState !== "visible") {
        return;
      }

      void recoverStaleVideoExportError();
    }

    document.addEventListener("visibilitychange", handleResume);

    return () => {
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [isNativeApp, videoExportError]);

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
    if (captions.length === 0 || !imagesComplete) {
      setPublishFlow({
        hasVideoExport: false,
        youtubeAlreadyPublished: false,
        youtubeWatchUrl: null,
        youtubeConnected: false,
        tiktokAlreadyPublished: false,
        tiktokProfileUrl: null,
        tiktokConnected: false,
        instagramAlreadyPublished: false,
        instagramProfileUrl: null,
        instagramConnected: false,
      });
      return;
    }

    let cancelled = false;

    async function loadPublishFlow() {
      try {
        const campaignId = encodeURIComponent(campaign.id);
        const [youtubeResponse, tiktokResponse, instagramReelResponse, instagramCarouselResponse] =
          await Promise.all([
          fetch(`/api/platforms/youtube/publish-readiness?campaignId=${campaignId}`),
          fetch(`/api/platforms/tiktok/publish-readiness?campaignId=${campaignId}`),
          fetch(`/api/platforms/instagram/publish-readiness?campaignId=${campaignId}`),
          fetch(`/api/platforms/instagram/carousel-publish-readiness?campaignId=${campaignId}`),
        ]);

        const youtubeData = (await youtubeResponse.json()) as {
          success?: boolean;
          hasVideoExport?: boolean;
          alreadyPublished?: boolean;
          watchUrl?: string | null;
          connected?: boolean;
        };

        const tiktokData = (await tiktokResponse.json()) as {
          success?: boolean;
          hasVideoExport?: boolean;
          alreadyPublished?: boolean;
          profileUrl?: string | null;
          connected?: boolean;
        };

        const instagramReelData = (await instagramReelResponse.json()) as {
          success?: boolean;
          alreadyPublished?: boolean;
          profileUrl?: string | null;
          connected?: boolean;
        };

        const instagramCarouselData =
          (await instagramCarouselResponse.json()) as {
            success?: boolean;
            alreadyPublished?: boolean;
            profileUrl?: string | null;
            connected?: boolean;
          };

        if (cancelled) {
          return;
        }

        const youtubeOk = youtubeResponse.ok && youtubeData.success;
        const tiktokOk = tiktokResponse.ok && tiktokData.success;
        const instagramReelOk =
          instagramReelResponse.ok && instagramReelData.success;
        const instagramCarouselOk =
          instagramCarouselResponse.ok && instagramCarouselData.success;

        if (youtubeOk || tiktokOk || instagramReelOk || instagramCarouselOk) {
          const instagramAlreadyPublished = Boolean(
            (instagramReelOk && instagramReelData.alreadyPublished) ||
              (instagramCarouselOk && instagramCarouselData.alreadyPublished),
          );
          const instagramProfileUrl =
            (instagramReelOk &&
            instagramReelData.alreadyPublished &&
            instagramReelData.profileUrl) ||
            (instagramCarouselOk &&
              instagramCarouselData.alreadyPublished &&
              instagramCarouselData.profileUrl) ||
            null;

          setPublishFlow({
            hasVideoExport: Boolean(
              (youtubeOk && youtubeData.hasVideoExport) ||
                (tiktokOk && tiktokData.hasVideoExport),
            ),
            youtubeAlreadyPublished: youtubeOk
              ? Boolean(youtubeData.alreadyPublished)
              : false,
            youtubeWatchUrl: youtubeOk ? (youtubeData.watchUrl ?? null) : null,
            youtubeConnected: youtubeOk ? Boolean(youtubeData.connected) : false,
            tiktokAlreadyPublished: tiktokOk
              ? Boolean(tiktokData.alreadyPublished)
              : false,
            tiktokProfileUrl: tiktokOk ? (tiktokData.profileUrl ?? null) : null,
            tiktokConnected: tiktokOk ? Boolean(tiktokData.connected) : false,
            instagramAlreadyPublished,
            instagramProfileUrl,
            instagramConnected: Boolean(
              (instagramReelOk && instagramReelData.connected) ||
                (instagramCarouselOk && instagramCarouselData.connected),
            ),
          });
        }
      } catch {
        // Next-step bar falls back to copy-captions guidance.
      }
    }

    void loadPublishFlow();

    return () => {
      cancelled = true;
    };
  }, [campaign.id, captions.length, imagesComplete, publishRefreshKey]);

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
              setWorkspaceTab("slides");
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
      if (!skipPublishAutoNavRef.current) {
        setWorkspaceTab("publish");
        setPublishTabHint(
          "Images ready — generate captions to continue to video and YouTube.",
        );

        if (captions.length === 0 && shouldShowCaptionsPrompt(campaign.id)) {
          setActionsSheetOpen(false);
          setCaptionsPromptOpen(true);
        }
      }

      skipPublishAutoNavRef.current = false;
    }

    prevImagesCompleteRef.current = imagesComplete;
  }, [campaign.id, captions.length, imagesComplete]);

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

  function getCampaignVideoFilename(preset: VideoExportPreset = videoPreset): string {
    return getVideoExportFilename(campaign.title, campaign.id, preset);
  }

  async function deliverCampaignVideoBlob(
    blob: Blob,
    filename: string,
    webSuccessMessage: string,
  ) {
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

      setVideoExportMessage(`${webSuccessMessage} ${TTS_VIDEO_EXPORT_SUCCESS_DISCLOSURE}`);
    }
  }

  async function handleDownloadLastVideoExport() {
    if (!lastVideoExport) {
      return;
    }

    setError(null);
    setVideoExportMessage(null);
    setVideoExportError(null);
    setIsDownloadingLastVideoExport(true);

    try {
      const videoResponse = await fetch(lastVideoExport.outputUrl);

      if (!videoResponse.ok) {
        throw new Error(
          "This export is no longer available. Export a new video to generate a fresh copy.",
        );
      }

      const blob = await videoResponse.blob();
      const preset = lastVideoExport.preset ?? videoPreset;
      const filename = getCampaignVideoFilename(preset);
      await deliverCampaignVideoBlob(blob, filename, "Last export downloaded.");
    } catch (downloadError) {
      const message =
        downloadError instanceof Error
          ? downloadError.message
          : "Something went wrong";

      setError(message);
      setVideoExportError(message);
    } finally {
      setIsDownloadingLastVideoExport(false);
    }
  }

  async function handleExportVideo() {
    setError(null);
    setVideoExportMessage(null);
    setVideoExportError(null);
    setVideoExportStage("preparing");
    setIsExportingVideo(true);

    let exportId: string | undefined;
    let completed = false;

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

      exportId = data.exportId;
      activeVideoExportIdRef.current = exportId;
      syncVideoExportBiometricDefer();

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
      setPublishRefreshKey((current) => current + 1);
      if (videoExportAspectRatio === "9:16") {
        setWorkspaceTab("publish");
        requestAnimationFrame(() => {
          scrollToCampaignSection("section-publish");
        });
      }
      setVideoExportStage("downloading");
      const filename = getCampaignVideoFilename();
      const videoResponse = await fetch(outputUrl);

      if (!videoResponse.ok) {
        throw new Error("Failed to download rendered video");
      }

      const blob = await videoResponse.blob();
      await deliverCampaignVideoBlob(blob, filename, "Video downloaded.");
      completed = true;
      activeVideoExportIdRef.current = null;
      syncVideoExportBiometricDefer();
    } catch (exportError) {
      if (exportId) {
        const recoveredUrl = await tryRecoverCompletedExport(
          exportId,
          setVideoExportStage,
        );

        if (recoveredUrl) {
          setPublishRefreshKey((current) => current + 1);
          setVideoExportMessage(
            "Your video finished rendering. Use Download last export on Publish.",
          );
          setVideoExportError(null);
          activeVideoExportIdRef.current = null;
          syncVideoExportBiometricDefer();
          completed = true;
        }
      }

      if (!completed) {
        const message =
          exportError instanceof Error
            ? exportError.message
            : "Something went wrong";

        setError(message);
        setVideoExportError(message);
      }
    } finally {
      setIsExportingVideo(false);
    }
  }

  const activeCampaignOperation = useMemo(
    () =>
      pickActiveCampaignOperation({
        videoExportError,
        isExportingVideo,
        isPublishingYouTube,
        isPublishingTikTok,
        isPublishingInstagram,
        isPublishingInstagramCarousel,
        isGeneratingCaptions,
        isGeneratingFormat,
        isExportingAudio,
        isExporting,
      }),
    [
      videoExportError,
      isExportingVideo,
      isPublishingYouTube,
      isPublishingTikTok,
      isPublishingInstagram,
      isPublishingInstagramCarousel,
      isGeneratingCaptions,
      isGeneratingFormat,
      isExportingAudio,
      isExporting,
    ],
  );

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
    copiedCopyKey,
    copiedAllCaptions: copiedCopyKey === "all",
    isNativeApp: isNativeApp === true,
    preferredVoicePersona,
    voiceQuality,
    videoPreset,
    aspectRatioLabel: formatAspectRatio(videoExportAspectRatio),
    dualFormatVideoReady,
    verticalFormatPublishState,
    carouselFormatPublishState,
    videoExportAspectRatio,
    onAddVerticalFormat: () => setAddFormatSheetOpen(true),
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
    isDownloadingLastVideoExport,
    videoExportMessage,
    videoExportError,
    lastVideoExport,
    publishRefreshKey,
    publishTabHint,
    hasVideoExport: publishFlow.hasVideoExport,
    youtubeAlreadyPublished: publishFlow.youtubeAlreadyPublished,
    onPublishComplete: () => setPublishRefreshKey((current) => current + 1),
    onYouTubePublishingChange: setIsPublishingYouTube,
    onTikTokPublishingChange: setIsPublishingTikTok,
    onInstagramPublishingChange: setIsPublishingInstagram,
    onInstagramCarouselPublishingChange: setIsPublishingInstagramCarousel,
    campaignStatus: campaign.status,
    onGenerateCaptions: handleGenerateCaptions,
    onCopyCaptionField: handleCopyCaptionField,
    onCopyAllCaptions: handleCopyAllCaptions,
    onPersonaChange: (persona: VoicePersona) => void handleVoicePersonaChange(persona),
    onVoiceQualityChange: setVoiceQuality,
    onVideoPresetChange: setVideoPreset,
    onVideoExportAspectRatioChange: setVideoExportAspectRatio,
    onDownloadZip: handleDownloadZip,
    onDownloadNarration: handleDownloadNarration,
    onExportVideo: handleExportVideo,
    onDownloadLastVideoExport: handleDownloadLastVideoExport,
    onSaveAllToPhotos: handleSaveAllToPhotos,
  };

  async function handleGenerateCaptions() {
    setError(null);
    setCaptionsMessage(null);
    setIsGeneratingCaptions(true);
    setWorkspaceTab("publish");
    requestAnimationFrame(() => {
      scrollToCampaignSection("section-publish-captions");
    });

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

      setWorkspaceTab("publish");
      setPublishTabHint(null);
      setCaptionsPromptOpen(false);
      requestAnimationFrame(() => {
        scrollToCampaignSection("section-publish-video");
      });
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

  async function handleCopyCaptionField(
    platformCaption: PlatformCaption,
    field: CaptionCopyField
  ) {
    try {
      await navigator.clipboard.writeText(
        formatCaptionFieldForCopy(platformCaption, field)
      );
      setCopiedCopyKey(captionCopyKey(platformCaption.platform, field));
      window.setTimeout(() => setCopiedCopyKey(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  async function handleCopyAllCaptions() {
    try {
      await navigator.clipboard.writeText(formatAllCaptionsForCopy(captions));
      setCopiedCopyKey("all");
      window.setTimeout(() => setCopiedCopyKey(null), 2000);
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
    options?: {
      snapProductUrl?: string;
      feedback?: string[];
      notes?: string;
      textOverlay?: string;
      headlineChanged?: boolean;
    },
  ) => {
    setError(null);
    skipPublishAutoNavRef.current = true;
    setRegeneratingSlideId(slideId);

    try {
      const slide = displaySlides.find((entry) => entry.id === slideId);
      const textOverlay =
        options?.textOverlay?.trim() ||
        slide?.text_overlay?.trim() ||
        undefined;

      const response = await fetch("/api/regenerate-slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slideId,
          aspectRatio: activeAspectRatio,
          text_overlay: textOverlay,
          headlineChanged: options?.headlineChanged === true,
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

  const journeyProps = {
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
    copiedAllCaptions: copiedCopyKey === "all",
    videoExportReady,
    hasVideoCredits,
    hasVideoExport: publishFlow.hasVideoExport,
    youtubeAlreadyPublished: publishFlow.youtubeAlreadyPublished,
    youtubeWatchUrl: publishFlow.youtubeWatchUrl,
    tiktokAlreadyPublished: publishFlow.tiktokAlreadyPublished,
    tiktokProfileUrl: publishFlow.tiktokProfileUrl,
    instagramAlreadyPublished: publishFlow.instagramAlreadyPublished,
    instagramProfileUrl: publishFlow.instagramProfileUrl,
    isExportingVideo,
    verticalFormatPublishState,
    verticalVideoExportReady,
    onGenerateImages: handleGenerateImages,
    onGenerateCaptions: handleGenerateCaptions,
    onDownloadZip: handleDownloadZip,
    onDownloadNarration: handleDownloadNarration,
    onCopyAllCaptions: handleCopyAllCaptions,
    onSaveAllToPhotos: handleSaveAllToPhotos,
    onAddVerticalFormat: () => setAddFormatSheetOpen(true),
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
        </header>

        <CampaignWorkspaceTabs
          active={workspaceTab}
          onChange={setWorkspaceTab}
          className="mt-4 md:mt-6"
        />

        {(workspaceTab === "slides" || workspaceTab === "publish") && (
          <div className="mt-4 md:hidden">
            <CampaignJourneyStrip
              layout="default"
              onTabChange={setWorkspaceTab}
              {...journeyProps}
            />
          </div>
        )}

        <div className="hidden md:block">
          {(workspaceTab === "slides" || workspaceTab === "publish") && (
            <CampaignJourneyStrip
              layout="sticky"
              onTabChange={setWorkspaceTab}
              {...journeyProps}
            />
          )}
        </div>

        <section
          id="section-slides"
          className={`mt-4 scroll-mt-28 md:mt-10 md:scroll-mt-40 ${
            workspaceTab !== "slides" ? "hidden" : ""
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
              {...journeyProps}
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
              journeyProps={journeyProps}
              onOpenMoreActions={() => setActionsSheetOpen(true)}
              onTabChange={setWorkspaceTab}
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

        <div className={workspaceTab !== "publish" ? "hidden" : ""}>
          <CampaignPublishPanel {...publishPanelProps} />
        </div>

        {workspaceTab === "details" && (
          <CampaignDetailsPanel
            campaign={campaign}
            brandName={brandName}
            showYouTubeConnectHint={
              isNativeApp !== true &&
              captions.length > 0 &&
              publishFlow.hasVideoExport &&
              !publishFlow.youtubeAlreadyPublished &&
              !publishFlow.youtubeConnected
            }
            onTitleSaved={(title) =>
              setCampaign((current) => ({ ...current, title }))
            }
            onError={setError}
            onTabChange={setWorkspaceTab}
            {...journeyProps}
          />
        )}

      </main>
      <CampaignActionsSheet
        open={actionsSheetOpen}
        onClose={() => setActionsSheetOpen(false)}
        onTabChange={setWorkspaceTab}
        {...journeyProps}
      />
      <CampaignCaptionsPrompt
        open={captionsPromptOpen}
        campaignId={campaign.id}
        canGenerateCaptions={canGenerateCaptions}
        isGeneratingCaptions={isGeneratingCaptions}
        onGenerateCaptions={handleGenerateCaptions}
        onClose={() => setCaptionsPromptOpen(false)}
      />
      <CampaignWorkspaceTour
        enabled={
          workspaceTab !== "details" &&
          !captionsPromptOpen &&
          !actionsSheetOpen &&
          !previewOpen
        }
        onTabChange={setWorkspaceTab}
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
      <CampaignOperationOverlay
        open={activeCampaignOperation !== null}
        kind={activeCampaignOperation ?? "captions"}
        headline={campaign.title?.trim() || campaign.topic}
        videoStage={videoExportStage}
        videoPreset={videoPreset}
        aspectRatio={videoExportAspectRatio}
        slideCount={slides.length}
        error={
          activeCampaignOperation === "video_export" ? videoExportError : null
        }
        onDismiss={() => {
          setVideoExportError(null);
          setVideoExportStage("preparing");
          activeVideoExportIdRef.current = null;
          syncVideoExportBiometricDefer();
        }}
      />
    </div>
  );
}
