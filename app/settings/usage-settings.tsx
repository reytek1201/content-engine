"use client";

import SettingsSection from "@/app/settings/settings-section";
import type { UsageSummary } from "@/types/usage";
import Link from "next/link";
import { useEffect, useState } from "react";

function formatResetDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
  }).format(new Date(isoDate));
}

interface UsageSettingsProps {
  variant?: "card" | "plain";
}

export default function UsageSettings({ variant = "card" }: UsageSettingsProps) {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      setUsageLoading(true);
      setUsageError(null);

      try {
        const response = await fetch("/api/usage");
        const data = (await response.json()) as {
          success: boolean;
          usage?: UsageSummary;
          error?: string;
        };

        if (!response.ok || !data.success || !data.usage) {
          throw new Error(data.error ?? "Failed to load usage");
        }

        if (!cancelled) {
          setUsage(data.usage);
        }
      } catch (loadError) {
        if (!cancelled) {
          setUsageError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load usage",
          );
        }
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
        }
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, []);

  const body = (
    <>
      {usageLoading ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading usage…
        </div>
      ) : usageError ? (
        <p className="text-sm text-red-200">{usageError}</p>
      ) : usage ? (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Campaigns this month
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-foreground">
                {usage.campaignsThisMonth}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {usage.limits.campaignsPerMonth}
                </span>
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {usage.remaining.campaigns} remaining
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Slide regenerations
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-foreground">
                {usage.slideRegenerationsThisMonth}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {usage.limits.slideRegenerationsPerMonth}
                </span>
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {usage.remaining.slideRegenerations} remaining
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Voice previews
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-foreground">
                {usage.ttsPreviewsThisMonth}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {usage.limits.ttsPreviewsPerMonth}
                </span>
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {usage.remaining.ttsPreviews} remaining
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Narration exports
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-foreground">
                {usage.audioExportsThisMonth}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {usage.limits.audioExportsPerMonth}
                </span>
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {usage.remaining.audioExports} remaining
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total campaigns
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-foreground">
                {usage.totalCampaigns}
              </dd>
            </div>
            <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Plan
              </dt>
              <dd className="mt-2 text-sm text-foreground">{usage.planLabel}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Beta limits reset on {formatResetDate(usage.resetsAt)}.
          </p>
        </>
      ) : null}

      <p className="mt-6 text-xs leading-5 text-muted-foreground">
        Need a new campaign?{" "}
        <Link
          href="/new"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          Create one
        </Link>{" "}
        or open{" "}
        <Link
          href="/campaigns"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          My campaigns
        </Link>
        .
      </p>
    </>
  );

  if (variant === "plain") {
    return <div>{body}</div>;
  }

  return (
    <SettingsSection
      title="Usage"
      description="Campaign activity for your account."
    >
      {body}
    </SettingsSection>
  );
}

/** Hook for hub trailing values — exported for settings hub. */
export function useUsageSummary() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      try {
        const response = await fetch("/api/usage");
        const data = (await response.json()) as {
          success: boolean;
          usage?: UsageSummary;
        };

        if (response.ok && data.success && data.usage && !cancelled) {
          setUsage(data.usage);
        }
      } catch {
        // Hub can show rows without trailing values.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, []);

  return { usage, loading };
}
