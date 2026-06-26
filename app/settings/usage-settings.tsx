"use client";

import SettingsSection from "@/app/settings/settings-section";
import type { BillingSource, UsageSummary } from "@/types/usage";
import {
  fetchUsageSummary,
  waitForUsageTierChange,
} from "@/utils/client-usage";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import {
  formatPlanPriceLabel,
  getPlanFeatureBullets,
  getPlanHighlight,
  type PaidTier,
  type Tier,
} from "@/utils/plan-limits";
import { Capacitor } from "@capacitor/core";
import Link from "next/link";
import { useEffect, useState } from "react";

const APP_STORE_SUBSCRIPTIONS_URL =
  "https://apps.apple.com/account/subscriptions";
const PLAY_STORE_SUBSCRIPTIONS_URL =
  "https://play.google.com/store/account/subscriptions?package=co.slidepress.app";

function formatRenewalDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
}

function formatSubscriptionPeriodEnd(isoDate: string, tier: Tier): string {
  const label = formatRenewalDate(isoDate);
  if (new Date(isoDate).getTime() < Date.now()) {
    return tier === "free" ? `Resets ${label}` : `Ended ${label}`;
  }
  return tier === "free" ? `Resets ${label}` : `Renews ${label}`;
}

interface CreditTileProps {
  label: string;
  remaining: number;
  limit: number;
}

function CreditTile({ label, remaining, limit }: CreditTileProps) {
  const displayRemaining = limit > 0 ? Math.min(remaining, limit) : remaining;
  const used = limit > 0 ? limit - displayRemaining : 0;
  const pct =
    limit > 0 ? Math.min(100, Math.max(0, Math.round((used / limit) * 100))) : 0;
  const low = remaining === 0;

  return (
    <div className="rounded-xl border border-border bg-background/40 px-4 py-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 text-2xl font-semibold text-foreground">
        {displayRemaining}
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
      </p>
    </div>
  );
}

function planCardInfo(tier: PaidTier, isNative: boolean) {
  return {
    price: formatPlanPriceLabel(tier, isNative ? "iap" : "web"),
    highlight: getPlanHighlight(tier),
    features: getPlanFeatureBullets(tier),
  };
}

// ─── Web upgrade / manage (Stripe) ───────────────────────────────────────────

interface UpgradeButtonProps {
  tier: "creator" | "agency";
  currentTier: string;
}

function UpgradeButton({ tier, currentTier }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrent = currentTier === tier;
  const isDowngrade = currentTier === "agency" && tier === "creator";

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
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
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
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

function WebIapManageSubscription() {
  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={APP_STORE_SUBSCRIPTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
      >
        App Store subscriptions
      </a>
      <a
        href={PLAY_STORE_SUBSCRIPTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
      >
        Play Store subscriptions
      </a>
    </div>
  );
}

function WebPaidManageActions({
  billingSource,
}: {
  billingSource: BillingSource | null;
}) {
  if (billingSource === "stripe") {
    return <ManageSubscriptionButton />;
  }
  if (billingSource === "iap") {
    return <WebIapManageSubscription />;
  }
  return null;
}

function WebIapManageHelpText() {
  return (
    <>
      Manage or cancel through the{" "}
      <a
        href={APP_STORE_SUBSCRIPTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        App Store
      </a>{" "}
      or{" "}
      <a
        href={PLAY_STORE_SUBSCRIPTIONS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        Google Play
      </a>{" "}
      on the device where you subscribed.
    </>
  );
}

// ─── Native upgrade / manage (RevenueCat) ────────────────────────────────────

/** Maps our tier ID to the RevenueCat package identifier set in the dashboard. */
const RC_PACKAGE_ID: Record<"creator" | "agency", string> = {
  creator: "creator",
  agency: "agency",
};

interface NativeUpgradeButtonProps {
  tier: "creator" | "agency";
  currentTier: string;
  disabled?: boolean;
  onPurchaseComplete: (expectedTier: "creator" | "agency") => Promise<void>;
}

function NativeUpgradeButton({
  tier,
  currentTier,
  disabled = false,
  onPurchaseComplete,
}: NativeUpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCurrent = currentTier === tier;
  const isDowngrade = currentTier === "agency" && tier === "creator";

  async function handlePurchase() {
    if (isCurrent) return;
    setError(null);
    setLoading(true);

    try {
      const { purchaseRCPackage } = await import("@/utils/revenuecat");
      const { Purchases } = await import("@revenuecat/purchases-capacitor");

      const offerings = await Purchases.getOfferings();
      const offering = offerings.current;

      if (!offering) {
        throw new Error("No offerings available. Please try again later.");
      }

      const pkg = offering.availablePackages.find(
        (p) => p.identifier === RC_PACKAGE_ID[tier],
      );

      if (!pkg) {
        throw new Error("No package found for this plan.");
      }

      const result = await purchaseRCPackage(pkg);

      if (result.cancelled) {
        // User dismissed — not an error.
        setLoading(false);
        return;
      }

      if (!result.success) {
        throw new Error(result.error ?? "Purchase failed");
      }

      await onPurchaseComplete(tier);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
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
        onClick={() => void handlePurchase()}
        disabled={loading || disabled}
        className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          isDowngrade
            ? "border border-border text-secondary-foreground hover:border-ring/60 hover:text-foreground"
            : "bg-primary text-primary-foreground hover:opacity-90"
        }`}
      >
        {loading
          ? "Processing…"
          : isDowngrade
            ? "Switch to Creator"
            : tier === "creator"
              ? "Upgrade to Creator"
              : "Upgrade to Agency Pro"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}

/** Opens the OS-native subscription management screen. */
function NativeManageSubscriptionButton() {
  function handleOpen() {
    const platform = Capacitor.getPlatform();
    if (platform === "ios") {
      // Deep-links to iOS Settings > Apple ID > Subscriptions.
      window.open("https://apps.apple.com/account/subscriptions", "_system");
    } else {
      // Deep-links to Play Store subscriptions.
      window.open(
        "https://play.google.com/store/account/subscriptions?package=co.slidepress.app",
        "_system",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground"
    >
      Manage subscription
    </button>
  );
}

/** Manage + restore actions grouped for the plan header (native IAP). */
function NativeSubscriptionActions({
  showManage,
  restoreMessage,
  onRestoreMessage,
  onRestoreComplete,
  disabled = false,
}: {
  showManage: boolean;
  restoreMessage: string | null;
  onRestoreMessage: (message: string | null) => void;
  onRestoreComplete: () => Promise<void>;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    setLoading(true);
    onRestoreMessage(null);

    try {
      const { restoreRCPurchases } = await import("@/utils/revenuecat");
      const result = await restoreRCPurchases();

      if (result.success) {
        await onRestoreComplete();
        onRestoreMessage("Subscription restored.");
      } else {
        onRestoreMessage(result.error ?? "Nothing to restore");
      }
    } catch (err) {
      onRestoreMessage(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {showManage ? <NativeManageSubscriptionButton /> : null}
        <button
          type="button"
          onClick={() => void handleRestore()}
          disabled={loading || disabled}
          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Restoring…" : "Restore purchases"}
        </button>
      </div>
      {restoreMessage ? (
        <p className="text-xs text-muted-foreground">{restoreMessage}</p>
      ) : null}
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
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [activatingPlan, setActivatingPlan] = useState(false);
  const isNative = isNativeAppRuntime();

  async function syncUsageAfterBillingChange(
    previousTier: Tier,
    expectedTier?: Tier,
  ): Promise<void> {
    setActivatingPlan(true);
    setUsageError(null);

    try {
      const updated = await waitForUsageTierChange(previousTier, {
        expectedTier,
      });

      if (updated) {
        setUsage(updated);
      }

      if (!updated || updated.tier === previousTier) {
        setUsageError(
          "Purchase succeeded. Your plan may take up to a minute to update. Reopen Settings if credits look stale.",
        );
      }
    } finally {
      setActivatingPlan(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      setUsageLoading(true);
      setUsageError(null);

      try {
        const nextUsage = await fetchUsageSummary();

        if (!nextUsage) {
          throw new Error("Failed to load usage");
        }

        if (!cancelled) {
          setUsage(nextUsage);
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
      {activatingPlan ? (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
          role="status"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Activating your subscription…
        </div>
      ) : null}

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
              {usage.resetsAt ? (
                <span className="text-xs text-muted-foreground">
                  {formatSubscriptionPeriodEnd(usage.resetsAt, usage.tier)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Resets monthly
                </span>
              )}
            </div>
            {isNative ? (
              <NativeSubscriptionActions
                showManage={usage.tier !== "free"}
                restoreMessage={restoreMessage}
                onRestoreMessage={setRestoreMessage}
                disabled={activatingPlan}
                onRestoreComplete={async () => {
                  await syncUsageAfterBillingChange(usage.tier);
                }}
              />
            ) : usage.tier !== "free" ? (
              <WebPaidManageActions billingSource={usage.billingSource} />
            ) : null}
          </div>

          {/* Credit tiles */}
          <dl className="grid gap-4 sm:grid-cols-2">
            <CreditTile
              label="Campaigns"
              remaining={usage.remaining.campaigns}
              limit={usage.limits.campaigns}
            />
            <CreditTile
              label="Slide regenerations"
              remaining={usage.remaining.regenerations}
              limit={usage.limits.regenerations}
            />
            <CreditTile
              label="Video exports"
              remaining={usage.remaining.videos}
              limit={usage.limits.videos}
            />
            <CreditTile
              label="Voice previews"
              remaining={usage.remaining.ttsPreviews}
              limit={usage.limits.ttsPreviews}
            />
            <CreditTile
              label="Narration exports"
              remaining={usage.remaining.audioExports}
              limit={usage.limits.audioExports}
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
                  const info = planCardInfo(planTier, isNative);
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
                        {isNative ? (
                          <NativeUpgradeButton
                            tier={planTier}
                            currentTier={usage.tier}
                            disabled={activatingPlan}
                            onPurchaseComplete={async (expectedTier) => {
                              await syncUsageAfterBillingChange(
                                usage.tier,
                                expectedTier,
                              );
                            }}
                          />
                        ) : (
                          <UpgradeButton tier={planTier} currentTier={usage.tier} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agency users: just show manage button */}
          {usage.tier === "agency" && (
            <div className="mt-6 space-y-3">
              <p className="text-xs text-muted-foreground">
                You&apos;re on the highest plan.{" "}
                {isNative ? (
                  <>
                    Manage or cancel your subscription through the{" "}
                    <button
                      type="button"
                      onClick={() => {
                        const platform = Capacitor.getPlatform();
                        if (platform === "ios") {
                          window.open(APP_STORE_SUBSCRIPTIONS_URL, "_system");
                        } else {
                          window.open(PLAY_STORE_SUBSCRIPTIONS_URL, "_system");
                        }
                      }}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {Capacitor.getPlatform() === "ios" ? "App Store" : "Play Store"}
                    </button>
                    .
                  </>
                ) : usage.billingSource === "iap" ? (
                  <WebIapManageHelpText />
                ) : usage.billingSource === "stripe" ? (
                  <>
                    Use{" "}
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
                  </>
                ) : null}
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
