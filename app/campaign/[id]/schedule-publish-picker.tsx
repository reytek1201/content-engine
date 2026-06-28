"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import type { PlatformPostPublic } from "@/types/platform-post";
import {
  formatScheduleWhen,
  fromDateAndTime,
  getLocalTimezoneLabel,
  getSchedulePresets,
  isScheduleDateValid,
  SCHEDULE_MINUTE_OPTIONS,
  toDateInputValue,
  type SchedulePreset,
  type SuggestedPostTimePlatform,
} from "@/utils/platforms/suggested-post-times";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

const SECONDARY_BUTTON_CLASS =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

interface SchedulePublishPickerProps {
  campaignId: string;
  platformKey: SuggestedPostTimePlatform;
  /** "youtube" | "tiktok" | "instagram" — the platform_posts.platform value */
  platform: "youtube" | "tiktok" | "instagram";
  /** "video" | "carousel" — determines whether carousel endpoint is used */
  publishKind?: "video" | "carousel";
  exportId?: string | null;
  /** TikTok only — must be provided when platform === "tiktok" */
  tikTokPublishSettings?: Record<string, unknown> | null;
  scheduledPost: PlatformPostPublic | null;
  disabled?: boolean;
  onScheduled: (post: PlatformPostPublic) => void;
  onCancelled: () => void;
}

interface SchedulePublishContextValue {
  platformKey: SuggestedPostTimePlatform;
  scheduledPost: PlatformPostPublic | null;
  disabled: boolean;
  isPending: boolean;
  hasFailed: boolean;
  canShowTrigger: boolean;
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  scheduling: boolean;
  cancelling: boolean;
  error: string | null;
  sheetTitle: string;
  presets: SchedulePreset[];
  selectedPresetId: string | "custom";
  selectPreset: (preset: SchedulePreset) => void;
  selectCustom: () => void;
  customDateValue: string;
  setCustomDateValue: (value: string) => void;
  customHour: number;
  setCustomHour: (hour: number) => void;
  customMinute: number;
  setCustomMinute: (minute: number) => void;
  selectedDate: Date;
  selectedLabel: string;
  handleSchedule: () => Promise<void>;
  handleCancel: () => Promise<void>;
}

const SchedulePublishContext = createContext<SchedulePublishContextValue | null>(
  null,
);

function useSchedulePublishContext(): SchedulePublishContextValue {
  const value = useContext(SchedulePublishContext);
  if (!value) {
    throw new Error(
      "Schedule publish components must be used within SchedulePublishRoot",
    );
  }
  return value;
}

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function platformSheetTitle(platformKey: SuggestedPostTimePlatform): string {
  switch (platformKey) {
    case "youtube":
      return "Schedule YouTube post";
    case "tiktok":
      return "Schedule TikTok post";
    case "instagram_reel":
      return "Schedule Instagram Reel";
    case "instagram_carousel":
      return "Schedule Instagram carousel";
    default:
      return "Schedule post";
  }
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ScheduleTimezoneNote() {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      Times are in your local timezone ({getLocalTimezoneLabel()}). Posts
      usually go live within 5 minutes of the time you pick.
    </p>
  );
}

export function SchedulePublishRoot({
  children,
  campaignId,
  platformKey,
  platform,
  publishKind = "video",
  exportId,
  tikTokPublishSettings,
  scheduledPost,
  disabled = false,
  onScheduled,
  onCancelled,
}: SchedulePublishPickerProps & { children: ReactNode }) {
  const [presets, setPresets] = useState<SchedulePreset[]>(() =>
    getSchedulePresets(platformKey),
  );
  const defaultPreset = presets[0]!;

  const [open, setOpen] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string | "custom">(
    defaultPreset.id,
  );
  const [customDateValue, setCustomDateValue] = useState(() =>
    toDateInputValue(defaultPreset.date),
  );
  const [customHour, setCustomHour] = useState(() => defaultPreset.date.getHours());
  const [customMinute, setCustomMinute] = useState(() =>
    defaultPreset.date.getMinutes(),
  );
  const [scheduling, setScheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const hasFailed =
    scheduledPost?.scheduleStatus === "failed" ||
    scheduledPost?.status === "failed";
  const isPending =
    scheduledPost?.status === "scheduled" &&
    scheduledPost.scheduleStatus === "pending";
  const canShowTrigger = !isPending;

  const selectedDate =
    selectedPresetId === "custom"
      ? fromDateAndTime(customDateValue, customHour, customMinute)
      : (presets.find((preset) => preset.id === selectedPresetId)?.date ??
        defaultPreset.date);

  const selectedLabel = formatScheduleWhen(selectedDate);

  function resetPickerState() {
    const nextPresets = getSchedulePresets(platformKey);
    const suggested = nextPresets[0]!.date;
    setPresets(nextPresets);
    setSelectedPresetId(nextPresets[0]!.id);
    setCustomDateValue(toDateInputValue(suggested));
    setCustomHour(suggested.getHours());
    setCustomMinute(suggested.getMinutes());
    setError(null);
  }

  function openSheet() {
    resetPickerState();
    setOpen(true);
  }

  function closeSheet() {
    setOpen(false);
    setError(null);
  }

  function selectPreset(preset: SchedulePreset) {
    setSelectedPresetId(preset.id);
    setCustomDateValue(toDateInputValue(preset.date));
    setCustomHour(preset.date.getHours());
    setCustomMinute(preset.date.getMinutes());
    setError(null);
  }

  function selectCustom() {
    setSelectedPresetId("custom");
    setError(null);
  }

  async function handleSchedule() {
    if (inFlightRef.current || scheduling) return;

    if (!isScheduleDateValid(selectedDate)) {
      setError("Pick a time at least 1 minute in the future.");
      return;
    }

    inFlightRef.current = true;
    setScheduling(true);
    setError(null);

    try {
      const scheduledFor = selectedDate.toISOString();

      const body: Record<string, unknown> = {
        campaignId,
        platform,
        publishKind,
        scheduledFor,
      };

      if (exportId) {
        body.exportId = exportId;
      }

      if (platform === "tiktok" && tikTokPublishSettings) {
        body.publishSettings = tikTokPublishSettings;
      }

      const response = await fetch("/api/platforms/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as {
        success: boolean;
        post?: PlatformPostPublic;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to schedule post");
      }

      closeSheet();
      onScheduled(data.post!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule post");
    } finally {
      inFlightRef.current = false;
      setScheduling(false);
    }
  }

  async function handleCancel() {
    if (!scheduledPost || cancelling) return;

    setCancelling(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/platforms/schedule/${scheduledPost.id}`,
        { method: "DELETE", credentials: "include" },
      );

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Failed to cancel scheduled post");
      }

      onCancelled();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel scheduled post",
      );
    } finally {
      setCancelling(false);
    }
  }

  const contextValue: SchedulePublishContextValue = {
    platformKey,
    scheduledPost,
    disabled,
    isPending,
    hasFailed,
    canShowTrigger,
    open,
    openSheet,
    closeSheet,
    scheduling,
    cancelling,
    error,
    sheetTitle: platformSheetTitle(platformKey),
    presets,
    selectedPresetId,
    selectPreset,
    selectCustom,
    customDateValue,
    setCustomDateValue,
    customHour,
    setCustomHour,
    customMinute,
    setCustomMinute,
    selectedDate,
    selectedLabel,
    handleSchedule,
    handleCancel,
  };

  return (
    <SchedulePublishContext.Provider value={contextValue}>
      {children}
      <SchedulePublishSheet />
    </SchedulePublishContext.Provider>
  );
}

export function SchedulePublishTrigger() {
  const { canShowTrigger, disabled, openSheet } = useSchedulePublishContext();

  if (!canShowTrigger) return null;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={openSheet}
      className={SECONDARY_BUTTON_CLASS}
    >
      <CalendarIcon className="size-4 shrink-0 opacity-80" />
      Schedule for later
    </button>
  );
}

export function SchedulePublishStatus() {
  const ctx = useSchedulePublishContext();

  if (ctx.isPending && ctx.scheduledPost) {
    return (
      <div className="mt-3 rounded-xl border border-sky-900/50 bg-sky-950/20 px-4 py-3">
        <div className="flex items-start gap-3">
          <CalendarIcon className="mt-0.5 size-5 shrink-0 text-sky-300" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-sky-100">
              Scheduled for{" "}
              {formatScheduledTime(ctx.scheduledPost.scheduledFor!)}
            </p>
            <p className="mt-1 text-xs leading-5 text-sky-200/80">
              Posts usually go live within 5 minutes of this time.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={ctx.cancelling || ctx.disabled}
                onClick={() => void ctx.handleCancel()}
                className="inline-flex items-center justify-center rounded-lg border border-sky-800/60 px-3 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-600 hover:text-sky-50 disabled:opacity-60"
              >
                {ctx.cancelling ? "Cancelling…" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={ctx.disabled}
                onClick={ctx.openSheet}
                className="inline-flex items-center justify-center rounded-lg border border-sky-800/60 px-3 py-2 text-sm font-medium text-sky-200 transition hover:border-sky-600 hover:text-sky-50 disabled:opacity-60"
              >
                Change time
              </button>
            </div>
            {ctx.error ? (
              <p className="mt-2 text-sm text-red-300">{ctx.error}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (ctx.hasFailed && ctx.scheduledPost) {
    return (
      <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3">
        <p className="text-sm font-semibold text-red-300">
          Scheduled post failed
        </p>
        {ctx.scheduledPost.failureReason ? (
          <p className="mt-1 text-sm leading-5 text-red-200">
            {ctx.scheduledPost.failureReason}
          </p>
        ) : null}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            disabled={ctx.disabled}
            onClick={ctx.openSheet}
            className="inline-flex items-center justify-center rounded-lg border border-red-800/60 px-3 py-2 text-sm font-medium text-red-200 transition hover:border-red-600 hover:text-red-50 disabled:opacity-60"
          >
            Reschedule
          </button>
          <p className="text-sm text-muted-foreground">
            or use Post now above to publish immediately
          </p>
        </div>
        {ctx.error ? (
          <p className="mt-2 text-sm text-red-300">{ctx.error}</p>
        ) : null}
      </div>
    );
  }

  return null;
}

function SchedulePublishSheet() {
  const ctx = useSchedulePublishContext();
  const minDateValue = toDateInputValue(new Date());
  const hourOptions = Array.from({ length: 24 }, (_, hour) => hour);
  const scheduleValid = isScheduleDateValid(ctx.selectedDate);

  return (
    <BottomSheet
      open={ctx.open}
      onClose={ctx.closeSheet}
      title={ctx.sheetTitle}
      titleId="schedule-publish-title"
      description="Pick when this post should go live."
      dismissDisabled={ctx.scheduling}
      zIndexClass="z-[70]"
      maxHeightClass="max-h-[min(92dvh,640px)]"
      desktopModal
      footer={
        <div className="flex flex-col gap-2 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={ctx.closeSheet}
            disabled={ctx.scheduling}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!scheduleValid || ctx.scheduling || ctx.disabled}
            onClick={() => void ctx.handleSchedule()}
            className="btn-primary py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {ctx.scheduling ? "Scheduling…" : "Confirm schedule"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-foreground">Quick picks</p>
          <div className="mt-2 flex flex-col gap-2">
            {ctx.presets.map((preset) => {
              const selected = ctx.selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => ctx.selectPreset(preset)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    selected
                      ? "border-primary/60 bg-primary/10"
                      : "border-border bg-background/40 hover:border-ring/60"
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {preset.label}
                  </span>
                  {preset.hint ? (
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {preset.hint}
                    </span>
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              onClick={ctx.selectCustom}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                ctx.selectedPresetId === "custom"
                  ? "border-primary/60 bg-primary/10"
                  : "border-border bg-background/40 hover:border-ring/60"
              }`}
            >
              <span className="block text-sm font-semibold text-foreground">
                Pick date &amp; time…
              </span>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                Choose a specific day and time
              </span>
            </button>
          </div>
        </div>

        {ctx.selectedPresetId === "custom" ? (
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <p className="text-sm font-medium text-foreground">Custom time</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block sm:col-span-3">
                <span className="text-xs font-medium text-muted-foreground">
                  Date
                </span>
                <input
                  type="date"
                  value={ctx.customDateValue}
                  min={minDateValue}
                  onChange={(event) => {
                    ctx.setCustomDateValue(event.target.value);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Hour
                </span>
                <select
                  value={ctx.customHour}
                  onChange={(event) => {
                    ctx.setCustomHour(Number(event.target.value));
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {new Date(2000, 0, 1, hour, 0).toLocaleTimeString(
                        undefined,
                        { hour: "numeric" },
                      )}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Minute
                </span>
                <select
                  value={ctx.customMinute}
                  onChange={(event) => {
                    ctx.setCustomMinute(Number(event.target.value));
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {SCHEDULE_MINUTE_OPTIONS.map((minute) => (
                    <option key={minute} value={minute}>
                      {String(minute).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-background/40 px-3 py-2.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Selected
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {ctx.selectedLabel}
          </p>
        </div>

        <ScheduleTimezoneNote />

        {ctx.error ? (
          <p className="text-sm text-red-300">{ctx.error}</p>
        ) : !scheduleValid ? (
          <p className="text-sm text-red-300">
            Pick a time at least 1 minute in the future.
          </p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

/** @deprecated Prefer SchedulePublishRoot + Trigger + Status for inline button rows. */
export default function SchedulePublishPicker(props: SchedulePublishPickerProps) {
  return (
    <SchedulePublishRoot {...props}>
      <SchedulePublishTrigger />
      <SchedulePublishStatus />
    </SchedulePublishRoot>
  );
}
