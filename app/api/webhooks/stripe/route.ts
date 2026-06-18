import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe, tierFromPriceId } from "@/utils/stripe";
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
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("usage_balances")
    .update({ stripe_customer_id: customerId })
    .eq("user_id", userId);
}

async function applyTier(
  userId: string,
  tier: string,
  periodEnd: number | null,
): Promise<void> {
  const admin = createAdminClient();
  const periodEndIso = periodEnd
    ? new Date(periodEnd * 1000).toISOString()
    : null;

  const { error } = await admin.rpc("apply_tier_entitlement", {
    p_user_id: userId,
    p_tier: tier,
    p_period_end: periodEndIso,
  });

  if (error) throw new Error(`apply_tier_entitlement failed: ${error.message}`);
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

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const tier = session.metadata?.tier as string | undefined;

  if (!userId || !customerId || !tier) {
    throw new Error(
      `checkout.session.completed missing required metadata: userId=${userId}, customerId=${customerId}, tier=${tier}`,
    );
  }

  await upsertCustomer(userId, customerId);

  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(
    session.subscription as string,
  ) as Stripe.Subscription & { current_period_end?: number };

  await applyTier(userId, tier, sub.current_period_end ?? null);
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === "string" ? invoice.customer : null;
  if (!customerId) return;

  const userId = await getUserIdFromCustomer(customerId);
  if (!userId) return;

  const lineItem = invoice.lines.data[0] as {
    price?: { id?: string } | null;
    period?: { end?: number } | null;
  } | undefined;
  const priceId = lineItem?.price?.id ?? null;
  const tier = priceId ? (tierFromPriceId(priceId) ?? "free") : "free";
  const periodEnd = lineItem?.period?.end ?? null;

  await applyTier(userId, tier, periodEnd);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription & { current_period_end?: number },
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : null;
  if (!customerId) return;

  const userId = await getUserIdFromCustomer(customerId);
  if (!userId) return;

  const priceId = (subscription.items.data[0]?.price as { id?: string } | undefined)?.id ?? null;
  const tier = priceId ? (tierFromPriceId(priceId) ?? "free") : "free";

  await applyTier(userId, tier, subscription.current_period_end ?? null);
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
          event.data.object as Stripe.Subscription & { current_period_end?: number },
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        // Ignore unregistered event types.
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
