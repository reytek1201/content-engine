export interface UsageLimits {
  campaignsPerMonth: number;
  slideRegenerationsPerMonth: number;
}

export interface UsageRemaining {
  campaigns: number;
  slideRegenerations: number;
}

export interface UsageSummary {
  campaignsThisMonth: number;
  totalCampaigns: number;
  slideRegenerationsThisMonth: number;
  limits: UsageLimits;
  remaining: UsageRemaining;
  canCreateCampaign: boolean;
  canRegenerateSlide: boolean;
  planLabel: string;
  resetsAt: string;
}
