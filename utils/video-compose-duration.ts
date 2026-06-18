/** Extend the last slide so xfade overlap does not shorten video vs narration. */
export function slideClipDurationForCompose(
  durationSeconds: number,
  slideIndex: number,
  slideCount: number,
  crossfadeSeconds: number,
): number {
  if (
    slideCount > 1 &&
    crossfadeSeconds > 0 &&
    slideIndex === slideCount - 1
  ) {
    return durationSeconds + (slideCount - 1) * crossfadeSeconds;
  }

  return durationSeconds;
}
