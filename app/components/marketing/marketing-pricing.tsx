import Link from "next/link";
import { CheckIcon } from "@/app/components/marketing/marketing-icons";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";
import {
  formatPlanPriceLabel,
  getPlanFeatureBullets,
  getPlanHighlight,
  getPlanLabel,
  type PaidTier,
  type Tier,
} from "@/utils/plan-limits";

interface PricingTierConfig {
  tier: Tier;
  tagline: string;
  highlighted?: boolean;
  extraBullets?: string[];
}

const PRICING_TIERS: PricingTierConfig[] = [
  {
    tier: "free",
    tagline: "Prove the workflow — export slides and captions anywhere",
    extraBullets: ["Carousel zip + platform captions", "Direct post to 1 connected platform"],
  },
  {
    tier: "creator",
    tagline: "Post every week with video export and all platforms",
    highlighted: true,
    extraBullets: ["Schedule posts for later"],
  },
  {
    tier: "agency",
    tagline: "Multiple client brands at volume",
    extraBullets: ["Schedule posts for later"],
  },
];

function PricingCard({ tier, tagline, highlighted, extraBullets }: PricingTierConfig) {
  const label = getPlanLabel(tier);
  const isPaid = tier !== "free";
  const price =
    tier === "free"
      ? "$0"
      : formatPlanPriceLabel(tier as PaidTier, "web");
  const highlight = isPaid ? getPlanHighlight(tier as PaidTier) : null;
  const features = [...getPlanFeatureBullets(tier), ...(extraBullets ?? [])];

  return (
    <div
      className={`surface-panel relative flex h-full flex-col p-6 sm:p-8 ${
        highlighted ? "overflow-hidden border-primary/20" : ""
      }`}
    >
      {highlighted && (
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
          aria-hidden
        />
      )}
      <div className="relative flex h-full flex-col">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-lg font-semibold text-foreground">{label}</h3>
          {highlight && (
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {highlight}
            </span>
          )}
        </div>
        <p className="mt-3 text-2xl font-semibold text-foreground">{price}</p>
        <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
        <ul className="mt-6 flex-1 space-y-3">
          {features.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm text-secondary-foreground"
            >
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <CheckIcon className="h-3 w-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <Link
          href="/login"
          className={`mt-8 w-full ${highlighted ? "btn-primary" : "btn-secondary"}`}
        >
          {tier === "free" ? "Get started free" : "See plans in app"}
        </Link>
      </div>
    </div>
  );
}

export default function MarketingPricing() {
  return (
    <section className="border-t border-border bg-card/20">
      <div className="page-shell py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <RevealOnScroll delay={0}>
            <p className="brand-kicker">Simple pricing</p>
          </RevealOnScroll>
          <RevealOnScroll delay={80}>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Start free. Upgrade when you post every week.
            </h2>
          </RevealOnScroll>
          <RevealOnScroll delay={160}>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Same workflow on web, iPhone, and Android. Paid plans add video
              export, narration downloads, all platform connections, and
              scheduled publishing.
            </p>
          </RevealOnScroll>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PRICING_TIERS.map((config, index) => (
            <RevealOnScroll key={config.tier} delay={index * 80}>
              <PricingCard {...config} />
            </RevealOnScroll>
          ))}
        </div>

        <RevealOnScroll delay={240}>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            iOS and Android subscriptions via App Store / Google Play at{" "}
            {formatPlanPriceLabel("creator", "iap")} and{" "}
            {formatPlanPriceLabel("agency", "iap")}. Upgrade anytime in Settings
            → Usage after you sign in.
          </p>
        </RevealOnScroll>
      </div>
    </section>
  );
}
