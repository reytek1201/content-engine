import { createClient } from "@/utils/supabase/server";
import { getAppUrl, getStripe } from "@/utils/stripe";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: balance } = await supabase
      .from("usage_balances")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!balance?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: "No active subscription found" },
        { status: 404 },
      );
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: balance.stripe_customer_id,
      return_url: `${appUrl}/settings/usage`,
    });

    return NextResponse.json({ success: true, url: portalSession.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
