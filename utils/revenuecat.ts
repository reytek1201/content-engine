"use client";

import { Capacitor } from "@capacitor/core";
import type {
  CustomerInfo,
  PurchasesPackage,
  PurchasesOffering,
} from "@revenuecat/purchases-capacitor";
import type { Tier } from "@/utils/plan-limits";

// ─── Platform helpers ─────────────────────────────────────────────────────────

function getApiKey(): string | null {
  const platform = Capacitor.getPlatform();
  if (platform === "ios") {
    return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY ?? null;
  }
  if (platform === "android") {
    return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY ?? null;
  }
  return null;
}

// ─── Configure (call once after user is known) ────────────────────────────────

let _configured = false;

export async function configureRevenueCat(supabaseUserId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[RC] API key not set for platform:", Capacitor.getPlatform());
    return;
  }

  const { Purchases } = await import("@revenuecat/purchases-capacitor");

  await Purchases.configure({ apiKey });
  _configured = true;

  // Identify user so purchases are linked to their Supabase user.id.
  await Purchases.logIn({ appUserID: supabaseUserId });
}

// ─── Logout (call on sign-out) ────────────────────────────────────────────────

export async function logOutRevenueCat(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !_configured) return;

  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.logOut();
    _configured = false;
  } catch (err) {
    console.warn("[RC] logOut failed:", err);
  }
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export async function getRCOffering(): Promise<PurchasesOffering | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const { Purchases } = await import("@revenuecat/purchases-capacitor");
  const offerings = await Purchases.getOfferings();
  return offerings.current ?? null;
}

// ─── Entitlements ─────────────────────────────────────────────────────────────

export function tierFromRCCustomerInfo(
  customerInfo: CustomerInfo | null | undefined,
): Tier | null {
  if (!customerInfo?.entitlements?.active) {
    return null;
  }

  const active = customerInfo.entitlements.active;

  if (active.agency?.isActive) {
    return "agency";
  }

  if (active.creator?.isActive) {
    return "creator";
  }

  return null;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export async function purchaseRCPackage(pkg: PurchasesPackage): Promise<{
  success: boolean;
  cancelled: boolean;
  tier?: Tier | null;
  error?: string;
}> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");

  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return {
      success: true,
      cancelled: false,
      tier: tierFromRCCustomerInfo(customerInfo),
    };
  } catch (err: unknown) {
    const rcErr = err as { userCancelled?: boolean; message?: string };
    if (rcErr?.userCancelled) {
      return { success: false, cancelled: true };
    }
    return {
      success: false,
      cancelled: false,
      error: rcErr?.message ?? "Purchase failed",
    };
  }
}

// ─── Restore ─────────────────────────────────────────────────────────────────

export async function restoreRCPurchases(): Promise<{
  success: boolean;
  tier?: Tier | null;
  error?: string;
}> {
  const { Purchases } = await import("@revenuecat/purchases-capacitor");

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    return {
      success: true,
      tier: tierFromRCCustomerInfo(customerInfo),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Restore failed";
    return { success: false, error: message };
  }
}
