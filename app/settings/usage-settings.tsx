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

interface CreditTileProps {
  label: string;
  remaining: number;
  limit: number;
  isLifetime: boolean;
}

function CreditTile({ label, remaining, limit, isLifetime }: CreditTileProps) {
  const pct = limit > 0 ? Math.round(((limit - remaining) / limit) * 100) : 0;
  const low = remaining === 0;

  return (
    <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-foreground">
        {remaining}
        <span className="text-base font-normal text-muted-foreground">
          {" "}
          / {limit}
        </span>
      </dd>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-all ${low ? "bg-red-400" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {remaining} remaining
        {isLifetime ? " (lifetime)" : ""}
      </p>
    </div>
  );
}

const PLAN_FEATURES: Record<
  string,
  { price: string; highlight: string; features: string[] }
> = {
  free: {
    price: "Free",
    highlight: "Get started",
    features: [
      "3 lifetime campaigns",
      "10 slide regenerations",
      "5 voice previews",
      "1 brand workspace",
    ],
  },
  creator: {
    price: "$19 / mo",
    highlight: "Most popular",
    features: [
      "15 campaigns / month",
      "30 slide regenerations",
      "5 video exports",
      "30 voice previews",
      "5 narration exports",
      "3 brand workspaces",
    ],
  },
  agency: {
    price: "$49 / mo",
    highlight: "High volume",
    features: [
      "50 campaigns / month",
      "100 slide regenerations",
      "15 video exports",
      "60 voice previews",
      "15 narration exports",
      "15 brand workspaces",
    ],
  },
};

interface UpgradeButtonProps {
  tier: "creator" | "agency";
  currentTier: string;
}

function UpgradeButton({ tier, currentTier }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrent = currentTier === tier;
  const isDowngrade =
    (currentTier === "agency" && tier === "creator");

  async function handleClick() {
    if (isCurrent) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = (await response.json()) as {
        success: boolean;
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error ?? "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  if (isCurrent) {
    return (
      <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        Current plan
      </span>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          isDowngrade
            ? "border border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {loading
          ? "Redirecting…"
          : isDowngrade
            ? "Switch to Creator"
            : tier === "creator"
              ? "Upgrade to Creator"
              : "Upgrade to Agency Pro"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/billing/create-portal", {
        method: "POST",
      });

      const data = (await response.json()) as {
        success: boolean;
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.success || !data.url) {
        throw new Error(data.error ?? "Failed to open billing portal");
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:opacity-60"
      >
        {loading ? "Opening…" : "Manage subscription"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
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

    // Reload after successful Stripe checkout redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      window.history.replaceState({}, "", "/settings/usage");
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
          {/* Plan header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {usage.planLabel}
              </span>
              {usage.isLifetimeTier ? (
                <span className="text-xs text-muted-foreground">
                  Lifetime credits
                </span>
              ) : usage.resetsAt ? (
                <span className="text-xs text-muted-foreground">
                  Resets {formatResetDate(usage.resetsAt)}
                </span>
              ) : null}
            </div>
            {!usage.isLifetimeTier && <ManageSubscriptionButton />}
          </div>

          {/* Credit tiles */}
          <dl className="grid gap-4 sm:grid-cols-2">
            <CreditTile
              label="Campaigns"
              remaining={usage.remaining.campaigns}
              limit={usage.limits.campaigns}
              isLifetime={usage.isLifetimeTier}
            />
            <CreditTile
              label="Slide regenerations"
              remaining={usage.remaining.regenerations}
              limit={usage.limits.regenerations}
              isLifetime={usage.isLifetimeTier}
            />
            <CreditTile
              label="Video exports"
              remaining={usage.remaining.videos}
              limit={usage.limits.videos}
              isLifetime={usage.isLifetimeTier}
            />
            <CreditTile
              label="Voice previews"
              remaining={usage.remaining.ttsPreviews}
              limit={usage.limits.ttsPreviews}
              isLifetime={usage.isLifetimeTier}
            />
            <CreditTile
              label="Narration exports"
              remaining={usage.remaining.audioExports}
              limit={usage.limits.audioExports}
              isLifetime={usage.isLifetimeTier}
            />
            <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Brand workspaces
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-foreground">
                {usage.brands.count}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}
                  / {usage.brands.limit}
                </span>
              </dd>
              <p className="mt-1 text-xs text-muted-foreground">
                {usage.brands.canCreate
                  ? `${usage.brands.limit - usage.brands.count} available`
                  : "Limit reached"}
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
          </dl>

          {/* Upgrade plans */}
          {usage.tier !== "agency" && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-foreground">
                {usage.tier === "free" ? "Upgrade your plan" : "Plans"}
              </h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(["creator", "agency"] as const).map((planTier) => {
                  const info = PLAN_FEATURES[planTier];
                  const isCurrent = usage.tier === planTier;

                  return (
                    <div
                      key={planTier}
                      className={`rounded-xl border p-4 ${
                        isCurrent
                          ? "border-primary/50 bg-primary/5"
                          : "border-border bg-background/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {planTier === "creator"
                              ? "Creator"
                              : "Agency Pro"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {info.highlight}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                          {info.price}
                        </p>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {info.features.map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-2 text-xs text-muted-foreground"
                          >
                            <span className="text-primary">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4">
                        <UpgradeButton tier={planTier} currentTier={usage.tier} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agency users: just show manage button */}
          {usage.tier === "agency" && (
            <div className="mt-6">
              <p className="text-xs text-muted-foreground">
                You&apos;re on the highest plan. Use{" "}
                <button
                  type="button"
                  onClick={() => {
                    void fetch("/api/billing/create-portal", { method: "POST" })
                      .then((r) => r.json())
                      .then((d: { url?: string }) => {
                        if (d.url) window.location.href = d.url;
                      });
                  }}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Stripe billing portal
                </button>{" "}
                to manage or cancel.
              </p>
            </div>
          )}
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
      description="Credits and plan for your account."
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
