"use client";

import DeleteAccountSection from "@/app/components/delete-account-section";
import ConnectedAccountsSettings from "@/app/components/connected-accounts-settings";
import BrandsSettingsDesktop from "@/app/components/brands-settings-desktop";
import BiometricSettings from "@/app/components/biometric-settings";
import PasswordResetForm from "@/app/components/password-reset-form";
import PushSettings from "@/app/components/push-settings";
import PushTestSection from "@/app/components/push-test-section";
import SettingsAboutContent from "@/app/components/settings-about";
import SettingsAppVersionFootnote from "@/app/components/settings-app-version-footnote";
import AccountSettings from "@/app/settings/account-settings";
import SettingsSection from "@/app/settings/settings-section";
import UsageSettings from "@/app/settings/usage-settings";
import type { User } from "@supabase/supabase-js";

interface SettingsDesktopProps {
  user: User;
  showPasswordReset?: boolean;
}

export default function SettingsDesktop({
  user,
  showPasswordReset = false,
}: SettingsDesktopProps) {
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

            <AccountSettings
              user={user}
              showSignOut
              showDeleteAccount={false}
              variant="card"
            />

            <SettingsSection
              title="Brands"
              description="Reference images, products, and workspaces for your campaigns."
            >
              <BrandsSettingsDesktop user={user} />
            </SettingsSection>

            <SettingsSection
              title="Security"
              description="Control how the app is locked when you leave it."
            >
              <BiometricSettings />
            </SettingsSection>

            <SettingsSection
              title="Notifications"
              description="Choose when SlidePress can alert you on this device."
            >
              <PushSettings />
            </SettingsSection>

            <PushTestSection />

            <SettingsSection
              title="Connected accounts"
              description="Link social platforms to publish directly from SlidePress."
            >
              <ConnectedAccountsSettings />
            </SettingsSection>

            <UsageSettings variant="card" />

            <SettingsAboutContent variant="card" />

            <DeleteAccountSection />

            <SettingsAppVersionFootnote className="pt-4" />
          </div>
        </div>
      </main>
    </div>
  );
}
