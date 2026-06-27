/**
 * Static best-practice default hours for each platform.
 * These are general guidelines only — NOT personalized to the user's audience.
 * Keep all four defaults here so they're easy to find and adjust.
 */
export const SUGGESTED_POST_TIMES = {
  youtube: { hour: 14, minute: 0 },
  tiktok: { hour: 19, minute: 0 },
  instagram_reel: { hour: 11, minute: 0 },
  instagram_carousel: { hour: 10, minute: 0 },
} as const;

export type SuggestedPostTimePlatform = keyof typeof SUGGESTED_POST_TIMES;

/**
 * Returns the next occurrence of the suggested time for a platform.
 * If today's occurrence has already passed, returns tomorrow's.
 */
export function getSuggestedScheduleDate(
  platform: SuggestedPostTimePlatform,
): Date {
  const { hour, minute } = SUGGESTED_POST_TIMES[platform];
  const d = new Date();
  d.setHours(hour, minute, 0, 0);

  if (d <= new Date()) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

/** Format a Date as a local datetime-local input value (YYYY-MM-DDTHH:mm). */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
