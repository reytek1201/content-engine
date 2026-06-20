"use client";

import CreateCampaignSheet from "@/app/components/create-campaign-sheet";
import BrandLogo from "@/app/components/brand-logo";
import CampaignsNavLink from "@/app/components/campaigns-nav-link";
import { ActiveBrandProvider } from "@/app/components/active-brand-provider";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import {
  CreateSheetProvider,
  useCreateSheet,
} from "@/app/components/create-sheet-context";
import { createClient } from "@/utils/supabase/client";
import { hapticImpact, hapticSelection } from "@/utils/haptics";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";

const MOBILE_NAV_PADDING =
  "pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0";

const MOBILE_NATIVE_TOP_PADDING =
  "max-md:pt-[env(safe-area-inset-top,0px)]";

function navLinkClass(isActive: boolean): string {
  return isActive
    ? "rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-foreground"
    : "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground";
}

function CampaignsIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SettingsIcon({
  active,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.25 : 1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-6 w-6 scale-110"}
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function useAuthUser() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  return { user, loading, supabase };
}

function DesktopNav({
  isCampaignsActive,
  isNewCampaignActive,
  isSettingsActive,
}: {
  isCampaignsActive: boolean;
  isNewCampaignActive: boolean;
  isSettingsActive: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 hidden border-b border-border bg-card md:block">
      <div className="page-shell flex items-center justify-between gap-4 py-4">
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <BrandLogo
            preserveActiveBrand
            className="flex shrink-0 items-center gap-2 transition hover:opacity-90"
          />

          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <CampaignsNavLink className={navLinkClass(isCampaignsActive)}>
              Campaigns
            </CampaignsNavLink>
            <Link href="/new" className={navLinkClass(isNewCampaignActive)}>
              New campaign
            </Link>
            <Link href="/settings" className={navLinkClass(isSettingsActive)}>
              Settings
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

function MobileTopBar({ hidden = false }: { hidden?: boolean }) {
  if (hidden) {
    return null;
  }

  return (
    <header className="border-b border-border bg-card/40 md:hidden">
      <div className="flex items-center px-4 py-3">
        <BrandLogo
          preserveActiveBrand
          className="flex items-center gap-2 transition active:opacity-80"
        />
      </div>
    </header>
  );
}

function MobileBottomNav({
  isCampaignsActive,
  isSettingsActive,
  isCreateActive,
  onOpenCreate,
}: {
  isCampaignsActive: boolean;
  isSettingsActive: boolean;
  isCreateActive: boolean;
  onOpenCreate: () => void;
}) {
  const campaignsActive =
    isCampaignsActive && !isCreateActive && !isSettingsActive;
  const settingsActive = isSettingsActive && !isCreateActive;

  function handleCampaignsTap() {
    if (!campaignsActive) {
      void hapticSelection();
    }
  }

  function handleSettingsTap() {
    if (!settingsActive) {
      void hapticSelection();
    }
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-3 px-2 pb-2 pt-2">
        <CampaignsNavLink
          onClick={handleCampaignsTap}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 transition active:scale-[0.97] ${
            campaignsActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <CampaignsIcon active={campaignsActive} />
          </span>
          <span className="text-[10px] font-medium leading-none">Campaigns</span>
        </CampaignsNavLink>

        <button
          type="button"
          onClick={() => {
            void hapticImpact("light");
            onOpenCreate();
          }}
          aria-label="Create new campaign"
          aria-expanded={isCreateActive}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 transition active:scale-[0.97] ${
            isCreateActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span
              className={`absolute bottom-0 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full shadow-lg ${
                isCreateActive
                  ? "bg-gradient-to-r from-primary to-ring shadow-primary/25"
                  : "bg-gradient-to-r from-primary to-ring shadow-primary/15"
              }`}
            >
              <PlusIcon className="h-6 w-6 text-primary-foreground" />
            </span>
          </span>
          <span className="text-[10px] font-medium leading-none">New</span>
        </button>

        <Link
          href="/settings"
          onClick={handleSettingsTap}
          className={`flex min-h-11 flex-col items-center justify-center gap-1 transition active:scale-[0.97] ${
            settingsActive ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <SettingsIcon active={settingsActive} />
          </span>
          <span className="text-[10px] font-medium leading-none">Settings</span>
        </Link>
      </div>
    </nav>
  );
}

function AppNavChrome({ user }: { user: User }) {
  const pathname = usePathname();
  const isNativeApp = useIsNativeApp();
  const { isOpen, openCreateSheet, closeCreateSheet } = useCreateSheet();
  const [formKey, setFormKey] = useState(0);

  const isCampaignsActive = pathname === "/campaigns";
  const isNewCampaignActive = pathname === "/new";
  const isSettingsActive = pathname.startsWith("/settings");
  const isCreateActive = isOpen;
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    closeCreateSheet();
  }, [pathname, closeCreateSheet]);

  function handleOpenCreate() {
    setFormKey((current) => current + 1);
    openCreateSheet();
  }

  return (
    <>
      <DesktopNav
        isCampaignsActive={isCampaignsActive}
        isNewCampaignActive={isNewCampaignActive}
        isSettingsActive={isSettingsActive}
      />
      <MobileTopBar hidden={isNativeApp !== false} />
      <MobileBottomNav
        isCampaignsActive={isCampaignsActive}
        isSettingsActive={isSettingsActive}
        isCreateActive={isCreateActive}
        onOpenCreate={handleOpenCreate}
      />
      <CreateCampaignSheet
        open={isOpen}
        onClose={closeCreateSheet}
        user={user}
        formKey={formKey}
      />
    </>
  );
}

function AppNavLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();
  const isNativeApp = useIsNativeApp();
  const showNav = !loading && Boolean(user);
  const hideMobileTopBar = isNativeApp !== false;

  return (
    <>
      {showNav && <AppNavChrome user={user!} />}
      <div
        className={`flex min-h-0 flex-1 flex-col ${showNav ? MOBILE_NAV_PADDING : ""} ${
          showNav && hideMobileTopBar ? MOBILE_NATIVE_TOP_PADDING : ""
        }`}
      >
        {children}
      </div>
    </>
  );
}

export function AppNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <CreateSheetProvider>
      <Suspense fallback={null}>
        <ActiveBrandProvider>
          <AppNavLayoutInner>{children}</AppNavLayoutInner>
        </ActiveBrandProvider>
      </Suspense>
    </CreateSheetProvider>
  );
}
