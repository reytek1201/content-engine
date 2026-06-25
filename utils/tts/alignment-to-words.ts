import type { WordTiming } from "@/utils/tts/types";

export interface CharacterAlignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export function alignmentToWordTimings(
  alignment: CharacterAlignment,
  normalizedText: string,
): WordTiming[] {
  const words = normalizedText.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } =
    alignment;

  if (characters.length === 0 || starts.length !== characters.length) {
    return [];
  }

  const timings: WordTiming[] = [];
  let charIndex = 0;

  for (const word of words) {
    while (charIndex < characters.length && /\s/.test(characters[charIndex] ?? "")) {
      charIndex++;
    }

    const wordStartCharIndex = charIndex;
    let matchedChars = 0;

    while (matchedChars < word.length && charIndex < characters.length) {
      charIndex++;
      matchedChars++;
    }

    const wordEndCharIndex = Math.max(wordStartCharIndex, charIndex - 1);
    const startSeconds = starts[wordStartCharIndex] ?? 0;
    const endSeconds = ends[wordEndCharIndex] ?? startSeconds;

    timings.push({
      word,
      startSeconds,
      endSeconds: Math.max(endSeconds, startSeconds),
    });
  }

  return timings;
}
