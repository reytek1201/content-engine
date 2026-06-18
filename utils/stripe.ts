import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

    _stripe = new Stripe(key, {
      apiVersion: "2023-10-16" as never,
      typescript: true,
    });
  }

  return _stripe;
}

/** Price IDs for each tier (from env). */
export function getStripePriceId(tier: "creator" | "agency"): string {
  const key =
    tier === "creator"
      ? process.env.STRIPE_PRICE_CREATOR
      : process.env.STRIPE_PRICE_AGENCY;

  if (!key) throw new Error(`STRIPE_PRICE_${tier.toUpperCase()} is not set`);
  return key;
}

/** Map a Stripe Price ID back to an app tier. */
export function tierFromPriceId(priceId: string): "creator" | "agency" | null {
  if (priceId === process.env.STRIPE_PRICE_CREATOR) return "creator";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";
  return null;
}

/** App URL — used for Checkout success/cancel redirects. */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://www.slidepress.co"
  );
}
