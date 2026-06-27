"use client";

import CampaignCaptionsAccordion from "@/app/campaign/[id]/campaign-captions-accordion";
import CampaignExportPanel from "@/app/campaign/[id]/campaign-export-panel";
import CampaignTikTokPublishPanel from "@/app/campaign/[id]/campaign-tiktok-publish-panel";
import CampaignInstagramPublishPanel from "@/app/campaign/[id]/campaign-instagram-publish-panel";
import CampaignInstagramCarouselPublishPanel from "@/app/campaign/[id]/campaign-instagram-carousel-publish-panel";
import CampaignYouTubePublishPanel from "@/app/campaign/[id]/campaign-youtube-publish-panel";
import type { CaptionCopyField, PlatformCaption } from "@/types/captions";
import type { VerticalFormatPublishState, CarouselFormatPublishState } from "@/utils/slide-aspect-images";

interface CampaignPublishPanelProps {
  campaignId: string;
  sortedCaptions: PlatformCaption[];
  imagesComplete: boolean;
  canGenerateCaptions: boolean;
  isGeneratingCaptions: boolean;
  captionsMessage: string | null;
  captionGenerationError?: string | null;
  copiedCopyKey: string | null;
  copiedAllCaptions: boolean;
  isNativeApp: boolean;
  verticalFormatPublishState?: VerticalFormatPublishState;
  carouselFormatPublishState?: CarouselFormatPublishState;
  onAddVerticalFormat?: () => void;
  isExporting: boolean;
  isSavingAllPhotos: boolean;
  saveAllPhotosProgress: { saved: number; total: number } | null;
  savedAllPhotos: boolean;
  exportMessage: string | null;
  publishRefreshKey?: number;
  onPublishComplete?: () => void;
  onYouTubePublishingChange?: (publishing: boolean) => void;
  onTikTokPublishingChange?: (publishing: boolean) => void;
  onInstagramPublishingChange?: (publishing: boolean) => void;
  onInstagramCarouselPublishingChange?: (publishing: boolean) => void;
  campaignStatus: string;
  onGenerateCaptions: () => void;
  onCopyCaptionField: (
    platformCaption: PlatformCaption,
    field: CaptionCopyField
  ) => void;
  onCopyAllCaptions: () => void;
  onDownloadZip: () => void;
  onSaveAllToPhotos: () => void;
}

export default function CampaignPublishPanel({
  campaignId,
  sortedCaptions,
  imagesComplete,
  canGenerateCaptions,
  isGeneratingCaptions,
  captionsMessage,
  captionGenerationError = null,
  copiedCopyKey,
  copiedAllCaptions,
  isNativeApp,
  verticalFormatPublishState = "not_applicable",
  carouselFormatPublishState = "not_applicable",
  onAddVerticalFormat,
  isExporting,
  isSavingAllPhotos,
  saveAllPhotosProgress,
  savedAllPhotos,
  exportMessage,
  publishRefreshKey = 0,
  onPublishComplete,
  onYouTubePublishingChange,
  onTikTokPublishingChange,
  onInstagramPublishingChange,
  onInstagramCarouselPublishingChange,
  campaignStatus,
  onGenerateCaptions,
  onCopyCaptionField,
  onCopyAllCaptions,
  onDownloadZip,
  onSaveAllToPhotos,
}: CampaignPublishPanelProps) {
  const captionsReady = sortedCaptions.length > 0 && !isGeneratingCaptions;
  const disabled = campaignStatus === "generating_text";

  return (
    <section
      id="section-publish"
      className="scroll-mt-28 rounded-xl border border-border bg-card/30 p-4 md:scroll-mt-36 md:rounded-2xl md:p-6 lg:scroll-mt-40 lg:p-8"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground md:text-xl">
            Publish
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6 md:max-w-2xl">
            Copy captions, post to YouTube, TikTok, or Instagram, and download slide assets.
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
          Captions
        </p>

        {captionsReady && (
          <div className="mt-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-200">Captions ready</p>
            <p className="mt-1 text-sm leading-6 text-emerald-200/90">
              Copy captions or post to platforms below. Export video on the Video tab.
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

        {captionGenerationError ? (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          >
            <p>{captionGenerationError}</p>
            <button
              type="button"
              onClick={onGenerateCaptions}
              disabled={!canGenerateCaptions || isGeneratingCaptions}
              className="mt-3 rounded-lg border border-amber-200/30 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Try generating captions again
            </button>
          </div>
        ) : null}

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
                  : "Finish generating slide images on the Slides tab first."}
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
              copiedCopyKey={copiedCopyKey}
              onCopyCaptionField={onCopyCaptionField}
            />
          )}
        </div>
      </div>

      {imagesComplete && (
        <div
          id="section-youtube-publish"
          className="mt-6 scroll-mt-32 sm:mt-8 md:scroll-mt-40"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            YouTube Shorts
          </p>

          <CampaignYouTubePublishPanel
            campaignId={campaignId}
            disabled={disabled}
            refreshKey={publishRefreshKey}
            imagesComplete={imagesComplete}
            hasYoutubeCaptions={captionsReady}
            verticalFormatPublishState={verticalFormatPublishState}
            onAddVerticalFormat={onAddVerticalFormat}
            onGenerateCaptions={onGenerateCaptions}
            canGenerateCaptions={canGenerateCaptions}
            isGeneratingCaptions={isGeneratingCaptions}
            onPublishComplete={onPublishComplete}
            onPublishingChange={onYouTubePublishingChange}
          />
        </div>
      )}

      {imagesComplete && captionsReady && (
        <div
          id="section-tiktok-publish"
          className="mt-6 scroll-mt-32 sm:mt-8 md:scroll-mt-40"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            TikTok
          </p>

          <CampaignTikTokPublishPanel
            campaignId={campaignId}
            disabled={disabled}
            refreshKey={publishRefreshKey}
            imagesComplete={imagesComplete}
            hasCaptions={captionsReady}
            verticalFormatPublishState={verticalFormatPublishState}
            onAddVerticalFormat={onAddVerticalFormat}
            onPublishComplete={onPublishComplete}
            onPublishingChange={onTikTokPublishingChange}
          />
        </div>
      )}

      {imagesComplete && captionsReady && (
        <div
          id="section-instagram-publish"
          className="mt-6 scroll-mt-32 sm:mt-8 md:scroll-mt-40"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Instagram Reels
          </p>

          <CampaignInstagramPublishPanel
            campaignId={campaignId}
            disabled={disabled}
            refreshKey={publishRefreshKey}
            imagesComplete={imagesComplete}
            hasCaptions={captionsReady}
            verticalFormatPublishState={verticalFormatPublishState}
            onPublishComplete={onPublishComplete}
            onPublishingChange={onInstagramPublishingChange}
          />
        </div>
      )}

      {imagesComplete && captionsReady && (
        <div
          id="section-instagram-carousel-publish"
          className="mt-6 scroll-mt-32 sm:mt-8 md:scroll-mt-40"
        >
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Instagram Carousel
          </p>

          <CampaignInstagramCarouselPublishPanel
            campaignId={campaignId}
            disabled={disabled}
            refreshKey={publishRefreshKey}
            imagesComplete={imagesComplete}
            hasCaptions={captionsReady}
            carouselFormatPublishState={carouselFormatPublishState}
            onPublishComplete={onPublishComplete}
            onPublishingChange={onInstagramCarouselPublishingChange}
          />
        </div>
      )}

      {captionsReady && (
        <div className="mt-6 sm:mt-8">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
            Downloads
          </p>

          <div className="mt-3">
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
        </div>
      )}
    </section>
  );
}
