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

export interface SchedulePreset {
  id: string;
  label: string;
  date: Date;
  /** Short hint shown on the chip, e.g. "general guideline" */
  hint?: string;
}

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

/** Tomorrow at 9:00 AM local time. */
export function getTomorrowMorningDate(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

/** A future date `hours` from now, snapped to the next 15-minute mark. */
export function getInHoursDate(hours: number): Date {
  const d = new Date(Date.now() + hours * 60 * 60 * 1000);
  const minutes = d.getMinutes();
  const snapped = Math.ceil(minutes / 15) * 15;
  d.setMinutes(snapped, 0, 0);
  if (snapped >= 60) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
  }
  return d;
}

export function formatScheduleWhen(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayMs = targetDay.getTime() - today.getTime();
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (dayMs === 0) return `Today, ${time}`;
  if (dayMs === 86_400_000) return `Tomorrow, ${time}`;

  const day = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${day}, ${time}`;
}

export function formatScheduleTimeOnly(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getSchedulePresets(
  platform: SuggestedPostTimePlatform,
): SchedulePreset[] {
  const suggested = getSuggestedScheduleDate(platform);
  const { hour, minute } = SUGGESTED_POST_TIMES[platform];

  return [
    {
      id: "suggested",
      label: formatScheduleWhen(suggested),
      date: suggested,
      hint: `Suggested ${formatScheduleTimeOnly(
        new Date(2000, 0, 1, hour, minute),
      )} — general guideline`,
    },
    {
      id: "tomorrow-morning",
      label: formatScheduleWhen(getTomorrowMorningDate()),
      date: getTomorrowMorningDate(),
    },
    {
      id: "in-1h",
      label: formatScheduleWhen(getInHoursDate(1)),
      date: getInHoursDate(1),
    },
    {
      id: "in-3h",
      label: formatScheduleWhen(getInHoursDate(3)),
      date: getInHoursDate(3),
    },
  ];
}

/** Format a Date as a local datetime-local input value (YYYY-MM-DDTHH:mm). */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** Format a Date as YYYY-MM-DD for date inputs. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateAndTime(
  dateValue: string,
  hour: number,
  minute: number,
): Date {
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function parseDatetimeLocalValue(value: string): {
  dateValue: string;
  hour: number;
  minute: number;
} {
  const [datePart, timePart] = value.split("T");
  const [hour, minute] = timePart.split(":").map(Number);
  return { dateValue: datePart, hour, minute };
}

export const SCHEDULE_MINUTE_OPTIONS = [0, 15, 30, 45] as const;

export function getLocalTimezoneLabel(): string {
  const parts = new Intl.DateTimeFormat(undefined, {
    timeZoneName: "long",
  }).formatToParts(new Date());
  return (
    parts.find((part) => part.type === "timeZoneName")?.value ??
    "your local timezone"
  );
}

export function isScheduleDateValid(date: Date, minLeadMs = 60_000): boolean {
  return date.getTime() >= Date.now() + minLeadMs;
}
