"use client";

import BrandLibraryEditor from "@/app/components/brand-library-editor";
import DeleteAccountSection from "@/app/components/delete-account-section";
import PasswordResetForm from "@/app/components/password-reset-form";
import { createClient } from "@/utils/supabase/client";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import { buildNativeOAuthRedirectUrl } from "@/utils/native-oauth";
import type { UsageSummary } from "@/types/usage";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

function formatResetDate(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
  }).format(new Date(isoDate));
}

interface SettingsContentProps {
  user: User;
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function SettingsContent({ user }: SettingsContentProps) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showPasswordReset = searchParams.get("reset") === "1";

  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);

  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return;
    }

    void supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(() => {
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );
        router.refresh();
      });
  }, [supabase, router]);

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
              : "Failed to load usage"
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

  async function handlePasswordReset() {
    if (!user.email) {
      return;
    }

    setResetSending(true);
    setResetMessage(null);
    setResetError(null);

    const redirectTo = isNativeAppRuntime()
      ? buildNativeOAuthRedirectUrl("/settings?reset=1")
      : `${window.location.origin}/settings?reset=1`;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo,
    });

    if (error) {
      setResetError(error.message);
    } else {
      setResetMessage("Check your email for a password reset link.");
    }

    setResetSending(false);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="page-main">
        <div className="page-content">
          <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Settings
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Account, brand assets, and usage.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {showPasswordReset ? (
            <SettingsSection
              title="Set a new password"
              description="You opened a password reset link. Choose a new password to finish."
            >
              <PasswordResetForm />
            </SettingsSection>
          ) : null}

          <SettingsSection
            title="Account"
            description="Manage your sign-in and session."
          >
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-foreground">{user.email}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={resetSending || !user.email}
                onClick={() => void handlePasswordReset()}
                className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resetSending ? "Sending…" : "Send password reset email"}
              </button>

              <button
                type="button"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>

            {resetMessage && (
              <p className="mt-4 text-sm text-primary">{resetMessage}</p>
            )}

            {resetError && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
              >
                {resetError}
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="Brand library">
            <BrandLibraryEditor user={user} />
          </SettingsSection>

          <SettingsSection
            title="Usage"
            description="Campaign activity for your account."
          >
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
                    <dd className="mt-2 text-sm text-foreground">
                      {usage.planLabel}
                    </dd>
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
          </SettingsSection>

          <DeleteAccountSection />
        </div>
        </div>
      </main>
    </div>
  );
}
