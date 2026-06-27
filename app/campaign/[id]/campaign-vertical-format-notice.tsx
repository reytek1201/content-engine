"use client";

import type { VerticalFormatPublishState } from "@/utils/slide-aspect-images";

interface CampaignVerticalFormatNoticeProps {
  state: Extract<VerticalFormatPublishState, "needs_add" | "generating">;
  onAddVerticalFormat: () => void;
}

export default function CampaignVerticalFormatNotice({
  state,
  onAddVerticalFormat,
}: CampaignVerticalFormatNoticeProps) {
  if (state === "generating") {
    return (
      <div
        id="section-video-vertical-format"
        className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-4"
      >
        <p className="text-sm font-semibold text-foreground">
          Generating 9:16 slides…
        </p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          YouTube Shorts and TikTok need vertical slides. We&apos;re creating
          your 9:16 images now — export video and post once they finish.
        </p>
      </div>
    );
  }

  return (
    <div
      id="section-video-vertical-format"
      className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-4"
    >
      <p className="text-sm font-semibold text-foreground">
        YouTube and TikTok need 9:16 vertical slides
      </p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Your campaign is 4:5 feed format. Add 9:16 to generate vertical images
        (same copy and voiceover), then export a Quick Reel and post below.
      </p>
      <button
        type="button"
        onClick={onAddVerticalFormat}
        className="btn-primary mt-4 w-full py-2.5 text-sm sm:w-auto sm:px-6"
      >
        Add 9:16
      </button>
    </div>
  );
}
