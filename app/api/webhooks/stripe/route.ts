import { createAdminClient } from "@/utils/supabase/admin";
import { applyTierEntitlement } from "@/utils/apply-tier-entitlement";
import {
  getStripe,
  resolvePriceId,
  resolveTier,
} from "@/utils/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

export const maxDuration = 60;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function markEventProcessed(eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("stripe_processed_events")
    .insert({ event_id: eventId });

  // Unique violation = already processed.
  if (error?.code === "23505") return false;
  if (error) throw new Error(`Failed to mark event processed: ${error.message}`);
  return true;
}

async function upsertCustomer(
  userId: string,
  customerId: string,
  subscriptionId?: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("usage_balances")
    .update({
      stripe_customer_id: customerId,
      ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
    })
    .eq("user_id", userId);
}

async function applyTier(
  userId: string,
  tier: string,
  periodEnd: number | null,
): Promise<void> {
  const periodEndIso = periodEnd
    ? new Date(periodEnd * 1000).toISOString()
    : null;

  await applyTierEntitlement(userId, tier, periodEndIso);
}

async function getUserIdFromCustomer(
  customerId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("usage_balances")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

function subscriptionPeriodEnd(
  subscription: Stripe.Subscription & { current_period_end?: number },
): number | null {
  return subscription.current_period_end ?? null;
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const tier = session.metadata?.tier as string | undefined;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  if (!userId || !customerId || !tier) {
    throw new Error(
      `checkout.session.completed missing required metadata: userId=${userId}, customerId=${customerId}, tier=${tier}`,
    );
  }

  await upsertCustomer(userId, customerId, subscriptionId ?? undefined);

  const stripe = getStripe();
  const sub = (await stripe.subscriptions.retrieve(
    session.subscription as string,
  )) as Stripe.Subscription & { current_period_end?: number };

  await applyTier(userId, tier, subscriptionPeriodEnd(sub));
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Only refill on subscription invoices — ignore one-off charges.
  const billingReason = invoice.billing_reason;
  if (
    billingReason !== "subscription_create" &&
    billingReason !== "subscription_cycle" &&
    billingReason !== "subscription_update"
  ) {
    return;
  }

  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customerId) return;

  const userId = await getUserIdFromCustomer(customerId);
  if (!userId) return;

  // Prefer the subscription line item over the first line (may be proration).
  const subscriptionLine =
    invoice.lines.data.find((line) => line.subscription) ??
    invoice.lines.data[0];

  const lineWithPrice = subscriptionLine as
    | { price?: string | { id: string } | null; period?: { end?: number } | null }
    | undefined;

  const priceId = resolvePriceId(lineWithPrice?.price);

  let tier = resolveTier(
    priceId,
    (invoice as Stripe.Invoice & { subscription_details?: { metadata?: Stripe.Metadata } })
      .subscription_details?.metadata,
  );

  // Fallback: fetch subscription metadata if line-item price wasn't enough.
  const subscriptionId =
    (typeof subscriptionLine?.subscription === "string"
      ? subscriptionLine.subscription
      : null) ??
    (typeof (invoice as Stripe.Invoice & { subscription?: string }).subscription ===
    "string"
      ? (invoice as Stripe.Invoice & { subscription: string }).subscription
      : null);

  if (!tier && subscriptionId) {
    const sub = (await getStripe().subscriptions.retrieve(
      subscriptionId,
    )) as Stripe.Subscription;
    tier = resolveTier(
      resolvePriceId(
        sub.items.data[0]?.price as string | { id: string } | null | undefined,
      ),
      sub.metadata,
    );
  }

  // Never downgrade to free on an unrecognised price — skip instead.
  if (!tier) return;

  const periodEnd = lineWithPrice?.period?.end ?? null;

  await applyTier(userId, tier, periodEnd);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription & { current_period_end?: number },
): Promise<void> {
  // Only apply entitlements for live subscriptions. Downgrades happen on deleted.
  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return;
  }

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId) return;

  const userId = await getUserIdFromCustomer(customerId);
  if (!userId) return;

  const priceId = resolvePriceId(
    subscription.items.data[0]?.price as string | { id: string } | null | undefined,
  );

  const tier = resolveTier(priceId, subscription.metadata);

  // Never downgrade to free on an unrecognised price — skip instead.
  if (!tier) return;

  await applyTier(userId, tier, subscriptionPeriodEnd(subscription));
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId) return;

  const userId = await getUserIdFromCustomer(customerId);
  if (!userId) return;

  await applyTier(userId, "free", null);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { success: false, error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature" },
      { status: 400 },
    );
  }

  // Idempotency — skip already-processed events.
  const isNew = await markEventProcessed(event.id);
  if (!isNew) {
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription & {
            current_period_end?: number;
          },
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        break;
    }
  } catch (handlerError) {
    const message =
      handlerError instanceof Error
        ? handlerError.message
        : "Webhook handler failed";

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
