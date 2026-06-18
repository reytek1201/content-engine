import { createClient } from "@/utils/supabase/server";
import { getAppUrl, getStripe, getStripePriceId } from "@/utils/stripe";
import { NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  tier: z.enum(["creator", "agency"]),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request" },
        { status: 400 },
      );
    }

    const { tier } = parsed.data;
    const stripe = getStripe();
    const appUrl = getAppUrl();

    const { data: balance } = await supabase
      .from("usage_balances")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    const existingCustomerId = balance?.stripe_customer_id ?? undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: getStripePriceId(tier),
          quantity: 1,
        },
      ],
      customer: existingCustomerId,
      customer_email: existingCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      success_url: `${appUrl}/settings/usage?checkout=success`,
      cancel_url: `${appUrl}/settings/usage?checkout=cancel`,
      metadata: {
        user_id: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier,
        },
      },
    });

    return NextResponse.json({ success: true, url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
