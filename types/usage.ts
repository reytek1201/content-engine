import type { Tier } from "@/utils/plan-limits";

export type { Tier };

export interface UsageRemaining {
  campaigns: number;
  regenerations: number;
  videos: number;
  ttsPreviews: number;
  audioExports: number;
}

export interface UsageLimits {
  campaigns: number;
  regenerations: number;
  videos: number;
  ttsPreviews: number;
  audioExports: number;
  brands: number;
}

export interface UsageBrands {
  count: number;
  limit: number;
  canCreate: boolean;
}

export interface UsageSummary {
  tier: Tier;
  planLabel: string;
  /** Credits remaining — source of truth from usage_balances. */
  remaining: UsageRemaining;
  /** Tier caps from plan-limits.ts — used for display (X of Y). */
  limits: UsageLimits;
  /** Boolean guards used by API routes and UI. */
  canCreateCampaign: boolean;
  canRegenerateSlide: boolean;
  canExportVideo: boolean;
  canPreviewTts: boolean;
  canExportAudio: boolean;
  canCreateBrand: boolean;
  brands: UsageBrands;
  /** ISO date — next reset for paid tiers; null for free (credits never refill). */
  resetsAt: string | null;
  /** True for free tier (lifetime credits, no monthly reset). */
  isLifetimeTier: boolean;
  totalCampaigns: number;
}
