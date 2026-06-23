"use client";

import {
  AboutIcon,
  AccountIcon,
  BrandIcon,
  ConnectedAccountsIcon,
  DevIcon,
  NotificationsIcon,
  SecurityIcon,
  SettingsListGroup,
  SettingsListRow,
  SettingsSectionLabel,
  UsageIcon,
  WidgetsIcon,
} from "@/app/settings/settings-list";
import SettingsAppVersionFootnote from "@/app/components/settings-app-version-footnote";
import { useUsageSummary } from "@/app/settings/usage-settings";
import {
  checkBiometry,
  biometryLabel,
  isBiometricSupported,
} from "@/utils/biometric-auth";
import { brandsListHref } from "@/utils/brands-back-target";
import {
  clearBiometricSession,
  isBiometricLockEnabled,
} from "@/utils/biometric-session";
import { isNativeAppRuntime } from "@/utils/is-native-app";
import { isPushNotificationsEnabled } from "@/utils/push-preferences";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

interface SettingsHubProps {
  user: User;
}

export default function SettingsHub({ user }: SettingsHubProps) {
  const supabase = createClient();
  const router = useRouter();
  const { usage } = useUsageSummary();

  const [securityLabel, setSecurityLabel] = useState<string | null>(null);
  const [notificationsLabel, setNotificationsLabel] = useState<string | null>(
    null,
  );
  const [signingOut, setSigningOut] = useState(false);
  const showNotificationsLink = isNativeAppRuntime();
  const showWidgetsLink = isNativeAppRuntime();

  useEffect(() => {
    if (!isBiometricSupported() || !isBiometricLockEnabled()) {
      setSecurityLabel(isBiometricLockEnabled() ? "On" : "Off");
      return;
    }

    void checkBiometry().then((info) => {
      if (!isBiometricLockEnabled()) {
        setSecurityLabel("Off");
        return;
      }

      if (info.isAvailable) {
        setSecurityLabel(biometryLabel(info.biometryType));
      } else {
        setSecurityLabel("On");
      }
    });
  }, []);

  useEffect(() => {
    if (!showNotificationsLink) {
      return;
    }

    setNotificationsLabel(isPushNotificationsEnabled() ? "On" : "Off");
  }, [showNotificationsLink]);

  async function handleSignOut() {
    setSigningOut(true);
    await clearBiometricSession();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const usageTrailing = usage ? `${usage.remaining.campaigns} left` : null;
  const showDevLink = process.env.NEXT_PUBLIC_ALLOW_PUSH_TEST === "true";

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="page-main">
        <div className="page-content">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              {user.email}
            </p>
            {usage ? (
              <span className="mt-2 inline-flex rounded-full bg-secondary/60 px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                {usage.planLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <SettingsSectionLabel>Account</SettingsSectionLabel>
              <SettingsListGroup>
                <SettingsListRow
                  href="/settings/account"
                  label="Account"
                  icon={<AccountIcon />}
                />
                <SettingsListRow
                  href={brandsListHref("settings")}
                  label="Brands"
                  icon={<BrandIcon />}
                />
              </SettingsListGroup>
            </div>

            <div className="space-y-2">
              <SettingsSectionLabel>App</SettingsSectionLabel>
              <SettingsListGroup>
                <SettingsListRow
                  href="/settings/security"
                  label="Security"
                  value={securityLabel}
                  icon={<SecurityIcon />}
                />
                {showNotificationsLink ? (
                  <SettingsListRow
                    href="/settings/notifications"
                    label="Notifications"
                    value={notificationsLabel}
                    icon={<NotificationsIcon />}
                  />
                ) : null}
                {showWidgetsLink ? (
                  <SettingsListRow
                    href="/settings/widgets"
                    label="Widgets"
                    icon={<WidgetsIcon />}
                  />
                ) : null}
                <SettingsListRow
                  href="/settings/usage"
                  label="Usage"
                  value={usageTrailing}
                  icon={<UsageIcon />}
                />
                <SettingsListRow
                  href="/settings/connected-accounts"
                  label="Connected accounts"
                  icon={<ConnectedAccountsIcon />}
                />
              </SettingsListGroup>
            </div>

            <div className="space-y-2">
              <SettingsSectionLabel>About</SettingsSectionLabel>
              <SettingsListGroup>
                <SettingsListRow
                  href="/settings/about"
                  label="About"
                  icon={<AboutIcon />}
                />
                {showDevLink ? (
                  <SettingsListRow
                    href="/settings/dev"
                    label="Push test (dev)"
                    icon={<DevIcon />}
                  />
                ) : null}
              </SettingsListGroup>
            </div>

            <div className="space-y-2">
              <SettingsSectionLabel>Session</SettingsSectionLabel>
              <button
                type="button"
                disabled={signingOut}
                onClick={() => void handleSignOut()}
                className="flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-secondary/35 px-4 py-3.5 text-sm font-semibold text-red-400 shadow-sm transition hover:border-red-900/30 hover:bg-red-950/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>

            <SettingsAppVersionFootnote className="pt-2 pb-4" />
          </div>
        </div>
      </main>
    </div>
  );
}
