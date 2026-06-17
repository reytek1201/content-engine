export interface CaptionSegment {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

function formatSrtTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const secs = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function wrapCaptionText(text: string, maxLineLength = 42): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "";
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length <= maxLineLength) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}

export function buildCaptionSrt(segments: CaptionSegment[]): string {
  return segments
    .map((segment, index) => {
      const body = wrapCaptionText(segment.text);
      if (!body) {
        return null;
      }

      return [
        String(index + 1),
        `${formatSrtTimestamp(segment.startSeconds)} --> ${formatSrtTimestamp(segment.endSeconds)}`,
        body,
        "",
      ].join("\n");
    })
    .filter((entry): entry is string => Boolean(entry))
    .join("\n");
}

export function estimateSlideDurationSeconds(script: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  const estimated = words / 2.5;
  return Math.min(8, Math.max(3, estimated));
}

export function buildCaptionSegmentsFromDurations(
  scripts: string[],
  durationsSeconds: number[],
): CaptionSegment[] {
  let cursor = 0;

  return scripts.map((script, index) => {
    const duration = durationsSeconds[index] ?? 3;
    const segment: CaptionSegment = {
      text: script,
      startSeconds: cursor,
      endSeconds: cursor + duration,
    };
    cursor += duration;
    return segment;
  });
}
