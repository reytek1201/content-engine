"use client";

import CampaignCaptionsAccordion from "@/app/campaign/[id]/campaign-captions-accordion";
import CampaignExportPanel from "@/app/campaign/[id]/campaign-export-panel";
import CampaignYouTubePublishPanel from "@/app/campaign/[id]/campaign-youtube-publish-panel";
import CampaignNarrationPanel from "@/app/campaign/[id]/campaign-narration-panel";
import CampaignVideoLockedPanel from "@/app/campaign/[id]/campaign-video-locked-panel";
import CampaignVideoPanel from "@/app/campaign/[id]/campaign-video-panel";
import type { PlatformCaption } from "@/types/captions";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import type { VoiceQuality } from "@/utils/tts/types";
import type { AspectRatio } from "@/types/campaign";
import type { VideoExportPreset } from "@/utils/video-export-presets";

interface CampaignPublishPanelProps {
  campaignId: string;
  sortedCaptions: PlatformCaption[];
  imagesComplete: boolean;
  hasVoiceoverScripts: boolean;
  videoExportReady: boolean;
  hasVideoCredits: boolean;
  videoCreditsKnown: boolean;
  videoPlanLabel: string;
  videoTier: string;
  canGenerateCaptions: boolean;
  isGeneratingCaptions: boolean;
  captionsMessage: string | null;
  copiedPlatform: string | null;
  copiedAllCaptions: boolean;
  isNativeApp: boolean;
  preferredVoicePersona: VoicePersona;
  voiceQuality: VoiceQuality;
  videoPreset: VideoExportPreset;
  aspectRatioLabel: string;
  dualFormatVideoReady?: boolean;
  videoExportAspectRatio?: AspectRatio;
  brandId: string | null;
  isSavingVoicePersona: boolean;
  isExporting: boolean;
  isExportingAudio: boolean;
  isSavingAllPhotos: boolean;
  saveAllPhotosProgress: { saved: number; total: number } | null;
  savedAllPhotos: boolean;
  exportMessage: string | null;
  audioExportMessage: string | null;
  isExportingVideo: boolean;
  videoExportMessage: string | null;
  youtubePublishRefreshKey?: number;
  campaignStatus: string;
  onGenerateCaptions: () => void;
  onCopyCaption: (platformCaption: PlatformCaption) => void;
  onCopyAllCaptions: () => void;
  onPersonaChange: (persona: VoicePersona) => void;
  onVoiceQualityChange: (voiceQuality: VoiceQuality) => void;
  onVideoPresetChange: (preset: VideoExportPreset) => void;
  onVideoExportAspectRatioChange?: (aspectRatio: AspectRatio) => void;
  onDownloadZip: () => void;
  onDownloadNarration: () => void;
  onExportVideo: () => void;
  onSaveAllToPhotos: () => void;
}

export default function CampaignPublishPanel({
  campaignId,
  sortedCaptions,
  imagesComplete,
  hasVoiceoverScripts,
  videoExportReady,
  hasVideoCredits,
  videoCreditsKnown,
  videoPlanLabel,
  videoTier,
  canGenerateCaptions,
  isGeneratingCaptions,
  captionsMessage,
  copiedPlatform,
  copiedAllCaptions,
  isNativeApp,
  preferredVoicePersona,
  voiceQuality,
  videoPreset,
  aspectRatioLabel,
  dualFormatVideoReady = false,
  videoExportAspectRatio,
  brandId,
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
  youtubePublishRefreshKey = 0,
  campaignStatus,
  onGenerateCaptions,
  onCopyCaption,
  onCopyAllCaptions,
  onPersonaChange,
  onVoiceQualityChange,
  onVideoPresetChange,
  onVideoExportAspectRatioChange,
  onDownloadZip,
  onDownloadNarration,
  onExportVideo,
  onSaveAllToPhotos,
}: CampaignPublishPanelProps) {
  const captionsReady = sortedCaptions.length > 0 && !isGeneratingCaptions;
  const disabled = campaignStatus === "generating_text";

  return (
    <section
      id="section-publish"
      className="scroll-mt-28 rounded-xl border border-border bg-card/30 p-4 md:mt-8 md:scroll-mt-36 md:rounded-2xl md:p-6 lg:scroll-mt-40 lg:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground md:text-xl">
            Publish
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6 md:max-w-2xl">
            Follow the steps: captions → video → YouTube. Downloads are at the
            bottom.
          </p>
        </div>

        {sortedCaptions.length > 0 && (
          <button
            type="button"
            onClick={onGenerateCaptions}
            disabled={!canGenerateCaptions}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5 sm:py-3"
          >
            {isGeneratingCaptions ? "Regenerating…" : "Regenerate captions"}
          </button>
        )}
      </div>

      <div
        id="section-publish-captions"
        className="mt-4 scroll-mt-32 sm:mt-6 md:scroll-mt-40"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
          Step 1 · Captions
        </p>

        {captionsReady && (
          <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-200">Captions ready</p>
            <p className="mt-1 text-sm leading-6 text-emerald-200/90">
              Export your video next, then post to YouTube Shorts.
            </p>
            <button
              type="button"
              onClick={onCopyAllCaptions}
              className="btn-primary mt-4 w-full py-2.5 text-sm sm:w-auto sm:px-6"
            >
              {copiedAllCaptions ? "Copied all captions" : "Copy all captions"}
            </button>
          </div>
        )}

        {isGeneratingCaptions && (
          <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">
              Generating captions…
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Writing hooks and post copy for each platform.
            </p>
          </div>
        )}

        {captionsMessage && (
          <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
            {captionsMessage}
          </div>
        )}

        <div className="mt-3">
          {sortedCaptions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-background/40 px-4 py-6 text-center sm:rounded-xl sm:px-6 sm:py-8">
              <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                {imagesComplete
                  ? "Generate hooks, post copy, and hashtags for TikTok, Instagram, and YouTube Shorts."
                  : "Finish generating slide images in the Slides section first."}
              </p>
              {imagesComplete && (
                <button
                  type="button"
                  onClick={onGenerateCaptions}
                  disabled={!canGenerateCaptions}
                  className="btn-primary mt-4 w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                >
                  {isGeneratingCaptions
                    ? "Generating captions…"
                    : "Generate captions"}
                </button>
              )}
            </div>
          ) : (
            <CampaignCaptionsAccordion
              captions={sortedCaptions}
              copiedPlatform={copiedPlatform}
              onCopyCaption={onCopyCaption}
            />
          )}
        </div>
      </div>

      {imagesComplete && (
        <div
          id="section-publish-video"
          className="mt-6 scroll-mt-32 sm:mt-8 md:scroll-mt-40"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Step 2 · Video export
          </p>

          {!captionsReady ? (
            <div className="rounded-lg border border-dashed border-amber-900/40 bg-amber-950/15 px-4 py-5 sm:rounded-xl sm:px-6">
              <p className="text-sm font-medium text-foreground">
                Generate captions first
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                Video export unlocks after captions — you need YouTube title and
                description before posting a Short.
              </p>
              <button
                type="button"
                onClick={onGenerateCaptions}
                disabled={!canGenerateCaptions || isGeneratingCaptions}
                className="btn-primary mt-4 w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
              >
                {isGeneratingCaptions
                  ? "Generating captions…"
                  : "Generate captions"}
              </button>
            </div>
          ) : (
            <>
              {videoExportReady && hasVideoCredits && (
                <CampaignVideoPanel
                  canExportVideo
                  aspectRatioLabel={aspectRatioLabel}
                  disabled={disabled}
                  isExportingVideo={isExportingVideo}
                  videoExportMessage={videoExportMessage}
                  videoPreset={videoPreset}
                  voiceQuality={voiceQuality}
                  dualFormatEnabled={dualFormatVideoReady}
                  videoExportAspectRatio={videoExportAspectRatio}
                  onVideoExportAspectRatioChange={onVideoExportAspectRatioChange}
                  onPresetChange={onVideoPresetChange}
                  onVoiceQualityChange={onVoiceQualityChange}
                  onExportVideo={onExportVideo}
                />
              )}

              {videoExportReady && videoCreditsKnown && !hasVideoCredits && (
                <CampaignVideoLockedPanel
                  planLabel={videoPlanLabel}
                  tier={videoTier}
                />
              )}
            </>
          )}
        </div>
      )}

      {imagesComplete && (
        <div
          id="section-youtube-publish"
          className="mt-6 scroll-mt-32 sm:mt-8 md:scroll-mt-40"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Step 3 · YouTube Shorts
          </p>

          <CampaignYouTubePublishPanel
            campaignId={campaignId}
            disabled={disabled}
            refreshKey={youtubePublishRefreshKey}
            imagesComplete={imagesComplete}
            hasYoutubeCaptions={captionsReady}
            onGenerateCaptions={onGenerateCaptions}
            canGenerateCaptions={canGenerateCaptions}
            isGeneratingCaptions={isGeneratingCaptions}
          />
        </div>
      )}

      {captionsReady && (
        <div className="mt-6 flex flex-col gap-4 sm:mt-8 sm:gap-6">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Downloads
          </p>

          {hasVoiceoverScripts && (
            <CampaignNarrationPanel
              preferredVoicePersona={preferredVoicePersona}
              voiceQuality={voiceQuality}
              brandId={brandId}
              disabled={disabled}
              isSavingVoicePersona={isSavingVoicePersona}
              isExportingAudio={isExportingAudio}
              audioExportMessage={audioExportMessage}
              onPersonaChange={onPersonaChange}
              onVoiceQualityChange={onVoiceQualityChange}
              onDownloadNarration={onDownloadNarration}
            />
          )}

          <CampaignExportPanel
            imagesComplete={imagesComplete}
            isNativeApp={isNativeApp}
            disabled={disabled}
            isExporting={isExporting}
            isSavingAllPhotos={isSavingAllPhotos}
            saveAllPhotosProgress={saveAllPhotosProgress}
            savedAllPhotos={savedAllPhotos}
            exportMessage={exportMessage}
            onDownloadZip={onDownloadZip}
            onSaveAllToPhotos={onSaveAllToPhotos}
          />
        </div>
      )}
    </section>
  );
}
