"use client";

import type { ReactNode } from "react";
import type { PlatformCaption } from "@/types/captions";
import {
  formatHashtagsForDisplay,
  PLATFORM_LABELS,
} from "@/types/captions";

interface CampaignPublishPanelProps {
  sortedCaptions: PlatformCaption[];
  imagesComplete: boolean;
  canGenerateCaptions: boolean;
  isGeneratingCaptions: boolean;
  captionsMessage: string | null;
  copiedPlatform: string | null;
  onGenerateCaptions: () => void;
  onCopyCaption: (platformCaption: PlatformCaption) => void;
  voicePanel?: ReactNode;
}

export default function CampaignPublishPanel({
  sortedCaptions,
  imagesComplete,
  canGenerateCaptions,
  isGeneratingCaptions,
  captionsMessage,
  copiedPlatform,
  onGenerateCaptions,
  onCopyCaption,
  voicePanel,
}: CampaignPublishPanelProps) {
  return (
    <section
      id="section-publish"
      className="scroll-mt-28 rounded-xl border border-border bg-card/30 p-4 md:mt-8 md:scroll-mt-36 md:rounded-2xl md:p-6 lg:scroll-mt-40 lg:p-8"
    >
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Publish</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            AI-written post copy for TikTok, Instagram, and YouTube Shorts.
            Regenerating captions only updates publish copy — not your slide
            images.
          </p>
        </div>

        {sortedCaptions.length > 0 && (
          <button
            type="button"
            onClick={onGenerateCaptions}
            disabled={!canGenerateCaptions}
            className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGeneratingCaptions ? "Regenerating…" : "Regenerate captions"}
          </button>
        )}
      </div>

      {voicePanel && <div className="mt-4">{voicePanel}</div>}

      {captionsMessage && (
        <div className="mt-4 rounded-xl border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
          {captionsMessage}
        </div>
      )}

      <div className="mt-4">
        {sortedCaptions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-background/40 px-4 py-6 text-center">
            <p className="text-xs leading-5 text-muted-foreground">
              {imagesComplete
                ? "Generate hooks, post copy, and hashtags tailored to each platform."
                : "Finish generating slide images on the Slides tab first."}
            </p>
            {imagesComplete && (
              <button
                type="button"
                onClick={onGenerateCaptions}
                disabled={!canGenerateCaptions}
                className="btn-primary mt-4 w-full py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingCaptions ? "Generating captions…" : "Generate captions"}
              </button>
            )}
          </div>
        ) : (
          <article className="overflow-hidden rounded-lg border border-border bg-card/50">
            {sortedCaptions.map((platformCaption, index) => (
              <section
                key={platformCaption.id}
                className={index > 0 ? "border-t border-border" : undefined}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-3">
                  <h3 className="text-sm font-semibold text-secondary-foreground">
                    {PLATFORM_LABELS[platformCaption.platform]}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onCopyCaption(platformCaption)}
                    className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
                  >
                    {copiedPlatform === platformCaption.platform
                      ? "Copied"
                      : "Copy section"}
                  </button>
                </div>

                <div className="space-y-3 px-3 pb-4">
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
                      <p className="mt-1.5 text-sm leading-6 text-secondary-foreground">
                        {platformCaption.hook}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Caption
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-secondary-foreground">
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
  );
}
