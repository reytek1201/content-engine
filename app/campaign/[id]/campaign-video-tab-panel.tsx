"use client";

import CampaignVerticalFormatNotice from "@/app/campaign/[id]/campaign-vertical-format-notice";
import CampaignLockedNotice from "@/app/campaign/[id]/campaign-locked-notice";
import CampaignNarrationPanel from "@/app/campaign/[id]/campaign-narration-panel";
import CampaignVideoLockedPanel from "@/app/campaign/[id]/campaign-video-locked-panel";
import CampaignVideoPanel, {
  type LastVideoExportInfo,
} from "@/app/campaign/[id]/campaign-video-panel";
import type { VoicePersona } from "@/utils/tts/voice-catalog";
import type { AspectRatio } from "@/types/campaign";
import type { VideoExportPreset } from "@/utils/video-export-presets";
import type { VerticalFormatPublishState } from "@/utils/slide-aspect-images";

interface CampaignVideoTabPanelProps {
  imagesComplete: boolean;
  captionsReady: boolean;
  hasVoiceoverScripts: boolean;
  videoExportReady: boolean;
  hasVideoCredits: boolean;
  videoCreditsKnown: boolean;
  videoPlanLabel: string;
  videoTier: string;
  canGenerateCaptions: boolean;
  isGeneratingCaptions: boolean;
  preferredVoicePersona: VoicePersona;
  videoPreset: VideoExportPreset;
  burnCaptions: boolean;
  aspectRatioLabel: string;
  dualFormatVideoReady?: boolean;
  verticalFormatPublishState?: VerticalFormatPublishState;
  videoExportAspectRatio?: AspectRatio;
  onAddVerticalFormat?: () => void;
  brandId: string | null;
  isSavingVoicePersona: boolean;
  isExportingAudio: boolean;
  audioExportMessage: string | null;
  isExportingVideo: boolean;
  isDownloadingLastVideoExport?: boolean;
  videoExportMessage: string | null;
  videoExportError?: string | null;
  lastVideoExport?: LastVideoExportInfo | null;
  campaignStatus: string;
  onGenerateCaptions: () => void;
  onPersonaChange: (persona: VoicePersona) => void;
  onVideoPresetChange: (preset: VideoExportPreset) => void;
  onBurnCaptionsChange: (enabled: boolean) => void;
  onVideoExportAspectRatioChange?: (aspectRatio: AspectRatio) => void;
  onDownloadNarration: () => void;
  onExportVideo: () => void;
  onDownloadLastVideoExport?: () => void;
}

export default function CampaignVideoTabPanel({
  imagesComplete,
  captionsReady,
  hasVoiceoverScripts,
  videoExportReady,
  hasVideoCredits,
  videoCreditsKnown,
  videoPlanLabel,
  videoTier,
  canGenerateCaptions,
  isGeneratingCaptions,
  preferredVoicePersona,
  videoPreset,
  burnCaptions,
  aspectRatioLabel,
  dualFormatVideoReady = false,
  verticalFormatPublishState = "not_applicable",
  videoExportAspectRatio,
  onAddVerticalFormat,
  brandId,
  isSavingVoicePersona,
  isExportingAudio,
  audioExportMessage,
  isExportingVideo,
  isDownloadingLastVideoExport = false,
  videoExportMessage,
  videoExportError = null,
  lastVideoExport = null,
  campaignStatus,
  onGenerateCaptions,
  onPersonaChange,
  onVideoPresetChange,
  onBurnCaptionsChange,
  onVideoExportAspectRatioChange,
  onDownloadNarration,
  onExportVideo,
  onDownloadLastVideoExport,
}: CampaignVideoTabPanelProps) {
  const disabled = campaignStatus === "generating_text";
  const showVideoPanel =
    videoExportReady && (hasVideoCredits || Boolean(lastVideoExport));

  return (
    <section
      id="section-video"
      className="scroll-mt-28 rounded-xl border border-border bg-card/30 p-4 md:scroll-mt-36 md:rounded-2xl md:p-6 lg:scroll-mt-40 lg:p-8"
    >
      <div>
        <h2 className="text-lg font-semibold text-foreground md:text-xl">Video</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6 md:max-w-2xl">
          Preview voice, export Quick Reels or silent videos, and download narration.
        </p>
      </div>

      {(verticalFormatPublishState === "needs_add" ||
        verticalFormatPublishState === "generating") &&
      onAddVerticalFormat ? (
        <div className="mt-4 sm:mt-5">
          <CampaignVerticalFormatNotice
            state={verticalFormatPublishState}
            onAddVerticalFormat={onAddVerticalFormat}
          />
        </div>
      ) : null}

      {!imagesComplete ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-background/40 px-4 py-8 text-center sm:rounded-xl">
          <p className="text-sm text-muted-foreground">
            Finish generating slide images on the Slides tab first.
          </p>
        </div>
      ) : !captionsReady ? (
        <div className="mt-6">
          <CampaignLockedNotice
            variant="action"
            title="Generate captions first"
            description="Video export unlocks after captions — you need YouTube title and description before posting a Short."
          >
            <button
              type="button"
              onClick={onGenerateCaptions}
              disabled={!canGenerateCaptions || isGeneratingCaptions}
              className="btn-primary w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
            >
              {isGeneratingCaptions
                ? "Generating captions…"
                : "Generate captions"}
            </button>
          </CampaignLockedNotice>
        </div>
      ) : (
        <div className="mt-6 space-y-6 sm:mt-8 sm:space-y-8">
          {showVideoPanel && (
            <CampaignVideoPanel
              showVideoPanel
              canStartNewExport={hasVideoCredits}
              aspectRatioLabel={aspectRatioLabel}
              disabled={disabled}
              isExportingVideo={isExportingVideo}
              isDownloadingLastExport={isDownloadingLastVideoExport}
              videoExportMessage={videoExportMessage}
              videoExportError={videoExportError}
              lastVideoExport={lastVideoExport}
              videoPreset={videoPreset}
              burnCaptions={burnCaptions}
              dualFormatEnabled={dualFormatVideoReady}
              verticalFormatState={verticalFormatPublishState}
              videoExportAspectRatio={videoExportAspectRatio}
              onVideoExportAspectRatioChange={onVideoExportAspectRatioChange}
              onAddVerticalFormat={onAddVerticalFormat}
              onPresetChange={onVideoPresetChange}
              onBurnCaptionsChange={onBurnCaptionsChange}
              onExportVideo={onExportVideo}
              onDownloadLastExport={onDownloadLastVideoExport}
            />
          )}

          {videoExportReady &&
            videoCreditsKnown &&
            !hasVideoCredits &&
            !lastVideoExport && (
              <CampaignVideoLockedPanel
                planLabel={videoPlanLabel}
                tier={videoTier}
              />
            )}

          {hasVoiceoverScripts && (
            <CampaignNarrationPanel
              preferredVoicePersona={preferredVoicePersona}
              brandId={brandId}
              disabled={disabled}
              isSavingVoicePersona={isSavingVoicePersona}
              isExportingAudio={isExportingAudio}
              audioExportMessage={audioExportMessage}
              onPersonaChange={onPersonaChange}
              onDownloadNarration={onDownloadNarration}
            />
          )}
        </div>
      )}
    </section>
  );
}
