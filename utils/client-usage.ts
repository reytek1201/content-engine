import type { UsageSummary } from "@/types/usage";
import type { Tier } from "@/utils/plan-limits";

const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_POLL_TIMEOUT_MS = 45_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function fetchUsageSummary(): Promise<UsageSummary | null> {
  const response = await fetch("/api/usage", { cache: "no-store" });
  const data = (await response.json()) as {
    success: boolean;
    usage?: UsageSummary;
    error?: string;
  };

  if (!response.ok || !data.success || !data.usage) {
    return null;
  }

  return data.usage;
}

/** Poll until usage_balances reflects a new tier (RevenueCat webhook landed). */
export async function waitForUsageTierChange(
  previousTier: Tier,
  options?: {
    expectedTier?: Tier;
    intervalMs?: number;
    timeoutMs?: number;
  },
): Promise<UsageSummary | null> {
  const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_POLL_TIMEOUT_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const usage = await fetchUsageSummary();

    if (usage && usage.tier !== previousTier) {
      if (!options?.expectedTier || usage.tier === options.expectedTier) {
        return usage;
      }
    }

    await sleep(intervalMs);
  }

  return fetchUsageSummary();
}
