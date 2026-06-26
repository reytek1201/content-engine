import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatCampaignCreditConfirmLine } from "./format-campaign-credit-confirm.ts";
import type { UsageSummary } from "../types/usage.ts";

function baseUsage(overrides: Partial<UsageSummary> = {}): UsageSummary {
  return {
    tier: "free",
    planLabel: "Free",
    remaining: {
      campaigns: 2,
      regenerations: 4,
      videos: 0,
      ttsPreviews: 4,
      audioExports: 0,
      ...overrides.remaining,
    },
    limits: {
      campaigns: 2,
      regenerations: 4,
      videos: 0,
      ttsPreviews: 4,
      audioExports: 0,
      brands: 1,
      ...overrides.limits,
    },
    canCreateCampaign: true,
    canRegenerateSlide: true,
    canExportVideo: false,
    canPreviewTts: true,
    canExportAudio: false,
    canCreateBrand: true,
    brands: { count: 0, limit: 1, canCreate: true },
    platformConnections: {
      count: 0,
      limit: 1,
      canConnectMore: true,
      canConnect: { youtube: true, tiktok: true, instagram: true },
      canPublish: { youtube: true, tiktok: true, instagram: true },
      grace: {
        until: null,
        inGracePeriod: false,
        expiredPendingEnforcement: false,
        primaryPlatform: null,
      },
    },
    resetsAt: "2026-07-01T00:00:00.000Z",
    billingSource: null,
    totalCampaigns: 0,
    ...overrides,
  };
}

describe("formatCampaignCreditConfirmLine", () => {
  it("uses monthly copy for free tier", () => {
    const usage = baseUsage();

    assert.equal(
      formatCampaignCreditConfirmLine(usage),
      "Uses 1 of your 2 campaigns this month — 1 remaining",
    );
  });

  it("uses monthly copy for paid tiers", () => {
    const usage = baseUsage({
      tier: "creator",
      planLabel: "Creator",
      remaining: {
        campaigns: 10,
        regenerations: 20,
        videos: 10,
        ttsPreviews: 30,
        audioExports: 5,
      },
      limits: {
        campaigns: 10,
        regenerations: 20,
        videos: 10,
        ttsPreviews: 30,
        audioExports: 5,
        brands: 3,
      },
      billingSource: "stripe",
    });

    assert.equal(
      formatCampaignCreditConfirmLine(usage),
      "Uses 1 of your 10 campaigns this month — 9 remaining",
    );
  });
});
