/** Keep in sync with `VIDEO_CROSSFADE_SECONDS` in `compose-slide-video.ts`. */
export const CAPTION_VIDEO_CROSSFADE_SECONDS = 0.45;

/**
 * Maps narration audio timeline to the composed video timeline.
 * Crossfades start each slide's visual transition before its audio boundary.
 */
export function captionOffsetForVideoCompose(
  audioOffsetSeconds: number,
  slideIndex: number,
  crossfadeSeconds = CAPTION_VIDEO_CROSSFADE_SECONDS,
): number {
  if (slideIndex <= 0 || crossfadeSeconds <= 0) {
    return audioOffsetSeconds;
  }

  return Math.max(0, audioOffsetSeconds - slideIndex * crossfadeSeconds);
}
