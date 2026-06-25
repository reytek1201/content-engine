import type { WordTiming } from "@/utils/tts/types";

/**
 * Evenly distributes words across a slide's narration duration.
 * TODO: replace cache misses with forced alignment when available.
 */
export function estimateWordTimingsForScript(
  script: string,
  durationSeconds: number,
  globalOffsetSeconds = 0,
): WordTiming[] {
  const words = script.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || durationSeconds <= 0) {
    return [];
  }

  const sliceDuration = durationSeconds / words.length;

  return words.map((word, index) => {
    const localStart = index * sliceDuration;
    const localEnd = (index + 1) * sliceDuration;

    return {
      word,
      startSeconds: globalOffsetSeconds + localStart,
      endSeconds: globalOffsetSeconds + localEnd,
    };
  });
}

export function offsetWordTimings(
  words: WordTiming[],
  offsetSeconds: number,
): WordTiming[] {
  return words.map((timing) => ({
    word: timing.word,
    startSeconds: timing.startSeconds + offsetSeconds,
    endSeconds: timing.endSeconds + offsetSeconds,
  }));
}
