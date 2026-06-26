import { applyTierEntitlement } from "@/utils/apply-tier-entitlement";
import { getFreeTierPeriodEndIso } from "@/utils/free-tier-period";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const BATCH_SIZE = 200;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const periodEndIso = getFreeTierPeriodEndIso();

  const { data: rows, error } = await admin
    .from("usage_balances")
    .select("user_id")
    .eq("tier", "free")
    .not("current_period_end", "is", null)
    .lte("current_period_end", nowIso)
    .limit(BATCH_SIZE);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }

  let refilled = 0;
  const failures: { userId: string; error: string }[] = [];

  for (const row of rows ?? []) {
    try {
      await applyTierEntitlement(row.user_id, "free", periodEndIso);
      refilled += 1;
    } catch (err) {
      failures.push({
        userId: row.user_id,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  if (failures.length > 0) {
    console.error("[cron/refill-free-credits] partial failure", failures);
  }

  return NextResponse.json({
    success: failures.length === 0,
    refilled,
    checked: rows?.length ?? 0,
    failures: failures.length > 0 ? failures : undefined,
  });
}
