"use client";

import type { PlatformPostPublic } from "@/types/platform-post";
import {
  getSuggestedScheduleDate,
  toDatetimeLocalValue,
  type SuggestedPostTimePlatform,
} from "@/utils/platforms/suggested-post-times";
import { useRef, useState } from "react";

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

function formatScheduledTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SchedulePublishPicker({
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
}: SchedulePublishPickerProps) {
  const [open, setOpen] = useState(false);
  const [dateValue, setDateValue] = useState<string>(() =>
    toDatetimeLocalValue(getSuggestedScheduleDate(platformKey)),
  );
  const [scheduling, setScheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  // Pending scheduled post from a previous failed run
  const hasFailed =
    scheduledPost?.scheduleStatus === "failed" ||
    scheduledPost?.status === "failed";
  const isPending =
    scheduledPost?.status === "scheduled" &&
    scheduledPost.scheduleStatus === "pending";

  async function handleSchedule() {
    if (inFlightRef.current || scheduling) return;

    inFlightRef.current = true;
    setScheduling(true);
    setError(null);

    try {
      const scheduledFor = new Date(dateValue).toISOString();

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

      setOpen(false);
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

  // Pending scheduled post — show status + cancel
  if (isPending && scheduledPost) {
    return (
      <div className="mt-3 rounded-xl border border-sky-900/50 bg-sky-950/20 px-3 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-sky-200">
            Scheduled for{" "}
            <span className="font-semibold">
              {formatScheduledTime(scheduledPost.scheduledFor!)}
            </span>
          </p>
          <button
            type="button"
            disabled={cancelling || disabled}
            onClick={() => void handleCancel()}
            className="text-xs font-medium text-sky-300 underline-offset-2 hover:underline disabled:opacity-60"
          >
            {cancelling ? "Cancelling…" : "Cancel scheduled post"}
          </button>
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-red-300">{error}</p>
        ) : null}
      </div>
    );
  }

  // Failed scheduled post — show failure reason + retry options
  if (hasFailed && scheduledPost) {
    return (
      <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/20 px-3 py-2.5">
        <p className="text-xs font-semibold text-red-300">Scheduled post failed</p>
        {scheduledPost.failureReason ? (
          <p className="mt-0.5 text-xs text-red-200">
            {scheduledPost.failureReason}
          </p>
        ) : null}
        <div className="mt-2 flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={disabled || open}
            onClick={() => {
              setDateValue(toDatetimeLocalValue(getSuggestedScheduleDate(platformKey)));
              setOpen(true);
            }}
            className="text-xs font-medium text-red-300 underline-offset-2 hover:underline disabled:opacity-60"
          >
            Reschedule
          </button>
          <span className="hidden text-xs text-muted-foreground sm:inline">·</span>
          <p className="text-xs text-muted-foreground">
            or use "Post now" above to publish immediately
          </p>
        </div>
        {open ? <PickerForm /> : null}
        {error ? <p className="mt-1.5 text-xs text-red-300">{error}</p> : null}
      </div>
    );
  }

  // Idle — show "Schedule for later" toggle
  return (
    <div>
      {!open ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(true)}
          className="mt-2 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          Schedule for later
        </button>
      ) : (
        <>
          <PickerForm />
          <button
            type="button"
            onClick={() => { setOpen(false); setError(null); }}
            className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Cancel
          </button>
        </>
      )}
      {error ? (
        <p className="mt-1.5 text-xs text-red-300">{error}</p>
      ) : null}
    </div>
  );

  function PickerForm() {
    return (
      <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
        <label className="block text-xs font-medium text-foreground">
          Publish at
        </label>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          Suggested time (general guideline — not personalized to your audience)
        </p>
        <input
          type="datetime-local"
          value={dateValue}
          onChange={(e) => setDateValue(e.target.value)}
          min={toDatetimeLocalValue(new Date(Date.now() + 60_000))}
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          disabled={!dateValue || scheduling || disabled}
          onClick={() => void handleSchedule()}
          className="btn-primary mt-3 w-full py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
        >
          {scheduling ? "Scheduling…" : "Confirm schedule"}
        </button>
      </div>
    );
  }
}
