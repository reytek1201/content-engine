import { CheckIcon } from "@/app/components/marketing/marketing-icons";
import MarketingSectionIntro from "@/app/components/marketing/marketing-section-intro";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";
import { getMarketingFeatureImageUrl } from "@/utils/marketing-assets";

const PUBLISH_FEATURES = [
  "YouTube Shorts from your 9:16 video export",
  "TikTok with compliant pre-publish controls",
  "Instagram Reels (9:16) and carousel (4:5)",
  "Platform captions auto-generate when images finish",
] as const;

export default function MarketingPublish() {
  const publishImageUrl = getMarketingFeatureImageUrl("export");

  return (
    <section className="page-shell py-16 md:py-24">
      <MarketingSectionIntro
        kicker="Publish without switching apps"
        title="Post to YouTube, TikTok, and Instagram from your campaign"
        description="Connect your accounts once in Settings. When your video or carousel is ready, post directly from the Publish tab — or schedule for later on paid plans."
      />

      <div className="mt-14 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <RevealOnScroll delay={0}>
          <ul className="space-y-3">
            {PUBLISH_FEATURES.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/30 px-4 py-3.5 text-sm font-medium text-secondary-foreground"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs leading-5 text-muted-foreground">
            Platform connections required. Some platforms may require developer
            review approval during beta.
          </p>
        </RevealOnScroll>

        <RevealOnScroll delay={120} emphasize>
          <div className="marketing-feature-shot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publishImageUrl}
              alt="SlidePress publish screen with platform posting and captions"
              className="marketing-feature-shot-image"
            />
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
