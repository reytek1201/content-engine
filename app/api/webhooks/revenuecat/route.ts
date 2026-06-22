import { createAdminClient } from "@/utils/supabase/admin";
import { applyTierEntitlement } from "@/utils/apply-tier-entitlement";
import { NextResponse } from "next/server";

export const maxDuration = 60;

// ─── RevenueCat event types ────────────────────────────────────────────────────

type RCEventType =
  | "INITIAL_PURCHASE"
  | "RENEWAL"
  | "PRODUCT_CHANGE"
  | "CANCELLATION"
  | "EXPIRATION"
  | "BILLING_ISSUE"
  | "SUBSCRIBER_ALIAS"
  | "TRANSFER"
  | "UNCANCELLATION"
  | "NON_RENEWING_PURCHASE"
  | "SUBSCRIPTION_PAUSED"
  | "SUBSCRIPTION_EXTENDED"
  | "TEMPORARY_ENTITLEMENT_GRANT"
  | "INVOICE_ISSUANCE"
  | "TEST";

interface RCEvent {
  id: string;
  type: RCEventType;
  app_user_id: string;           // = Supabase user.id (we set appUserID = user.id)
  original_app_user_id: string;
  product_id: string;            // e.g. "slidepress_creator_monthly"
  entitlement_ids?: string[];    // e.g. ["creator"] or ["agency"]
  expiration_at_ms?: number | null;
  period_type?: string;
  environment?: string;
}

interface RCWebhookPayload {
  event: RCEvent;
}

// ─── Product → tier mapping ────────────────────────────────────────────────────
// Maps RevenueCat product IDs to app tiers. Also falls back to entitlement IDs.

function tierFromRCEvent(event: RCEvent): "creator" | "agency" | null {
  // Prefer entitlement_ids — the most reliable signal from RC.
  if (event.entitlement_ids?.includes("agency")) return "agency";
  if (event.entitlement_ids?.includes("creator")) return "creator";

  // Fall back to product ID string matching.
  const pid = event.product_id?.toLowerCase() ?? "";
  if (pid.includes("agency")) return "agency";
  if (pid.includes("creator")) return "creator";

  return null;
}

// ─── Idempotency ──────────────────────────────────────────────────────────────

async function markEventProcessed(eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("revenuecat_processed_events")
    .insert({ event_id: eventId });

  // Unique violation = already processed.
  if (error?.code === "23505") return false;
  if (error) throw new Error(`Failed to mark RC event processed: ${error.message}`);
  return true;
}

// ─── Tier application ─────────────────────────────────────────────────────────

async function applyTier(
  userId: string,
  tier: string,
  expirationMs: number | null | undefined,
): Promise<void> {
  const periodEndIso = expirationMs
    ? new Date(expirationMs).toISOString()
    : null;

  await applyTierEntitlement(userId, tier, periodEndIso);
}

async function storeRCAppUserId(
  userId: string,
  rcAppUserId: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("usage_balances")
    .update({ revenuecat_app_user_id: rcAppUserId })
    .eq("user_id", userId)
    .is("revenuecat_app_user_id", null); // only set once
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Signature verification using the Authorization header.
  // RevenueCat sends: Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { success: false, error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token || token !== webhookSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let payload: RCWebhookPayload;
  try {
    payload = (await request.json()) as RCWebhookPayload;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const event = payload?.event;
  if (!event?.id || !event?.type) {
    return NextResponse.json(
      { success: false, error: "Missing event.id or event.type" },
      { status: 400 },
    );
  }

  // Idempotency check.
  const isNew = await markEventProcessed(event.id);
  if (!isNew) {
    return NextResponse.json({ success: true, skipped: true });
  }

  // app_user_id is set to supabase user.id by the Capacitor SDK (Purchases.logIn).
  const userId = event.app_user_id ?? event.original_app_user_id;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Missing app_user_id" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "SUBSCRIPTION_EXTENDED":
      case "TEMPORARY_ENTITLEMENT_GRANT": {
        const tier = tierFromRCEvent(event);
        if (!tier) break; // Unknown product — skip rather than downgrade.
        await applyTier(userId, tier, event.expiration_at_ms);
        await storeRCAppUserId(userId, userId);
        break;
      }

      case "PRODUCT_CHANGE": {
        // User switched tier. New entitlements are in entitlement_ids.
        const tier = tierFromRCEvent(event);
        if (!tier) break;
        await applyTier(userId, tier, event.expiration_at_ms);
        break;
      }

      case "CANCELLATION":
        // Keep the paid tier until expiry — don't downgrade yet.
        // EXPIRATION event fires when access actually ends.
        break;

      case "EXPIRATION":
      case "BILLING_ISSUE":
        // EXPIRATION = subscription truly ended. Downgrade to free.
        // BILLING_ISSUE = payment failed (could also keep tier in grace; we downgrade).
        await applyTier(userId, "free", null);
        break;

      // Informational events — no entitlement change needed.
      case "SUBSCRIBER_ALIAS":
      case "TRANSFER":
      case "NON_RENEWING_PURCHASE":
      case "SUBSCRIPTION_PAUSED":
      case "INVOICE_ISSUANCE":
      case "TEST":
        break;

      default:
        // Unknown event type — safe to ignore.
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[RC webhook] Event ${event.id} (${event.type}) failed: ${message}`);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
