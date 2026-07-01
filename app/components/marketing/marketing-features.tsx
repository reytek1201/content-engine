import { SparklesIcon } from "@/app/components/marketing/marketing-icons";
import MarketingSectionIntro from "@/app/components/marketing/marketing-section-intro";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";
import { getMarketingFeatureImageUrl } from "@/utils/marketing-assets";

const FEATURES = [
  {
    kicker: "Step 1",
    title: "Tell us your topic — or paste your site",
    description:
      "Type a pain point, product, or idea — or paste your website URL for AI campaign suggestions. Pick 4:5 for feed carousels or 9:16 for Reels and Shorts.",
    bullets: [
      "Website URL → topic cards or full draft in one action",
      "3, 5, or 7 slides",
      "Optional product & style photos",
      "Separate workspaces per brand or client",
    ],
    visual: "topic",
    imageAlt: "SlidePress new campaign screen with topic and format options",
  },
  {
    kicker: "Step 2",
    title: "Slides & images appear",
    description:
      "AI writes each slide’s headline and voiceover script, then generates on-brand images with your text already on the creative.",
    bullets: [
      "Edit any headline in one tap",
      "Rewrite voiceover with AI",
      "Regenerate a single slide if needed",
      "Add the other format when primary images are ready",
    ],
    visual: "slides",
    imageAlt: "SlidePress slides workspace showing generated carousel images",
  },
  {
    kicker: "Step 3",
    title: "Voice, captions & export",
    description:
      "Preview how your slides sound, copy captions for each platform, then download your zip, narration, or finished video — or post directly.",
    bullets: [
      "Natural AI voices — warm, confident, energetic, or professional",
      "TikTok, Instagram & YouTube copy included",
      "Save to Photos or share from the mobile app",
      "Schedule posts on Creator & Agency plans",
    ],
    visual: "export",
    imageAlt: "SlidePress publish screen with captions and export options",
  },
] as const;

function FeatureScreenshot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="marketing-feature-shot">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="marketing-feature-shot-image" />
    </div>
  );
}

export default function MarketingFeatures() {
  return (
    <section className="page-shell py-16 md:py-24">
      <MarketingSectionIntro
        kicker="Built for creators, not designers"
        title="Everything happens in one simple flow"
        description="No timelines, layers, or five different apps. Start from a URL or a sentence — publish when you're ready."
      />

      <div className="mt-14 space-y-20">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.title}
            className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${index % 2 === 1 ? "lg:[&>div:first-child]:order-2" : ""}`}
          >
            <RevealOnScroll
              delay={0}
              className={index % 2 === 1 ? "lg:order-2" : ""}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {feature.kicker}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                  {feature.title}
                </h3>
                <p className="mt-3 text-base leading-7 text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="mt-5 space-y-2">
                  {feature.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-sm text-secondary-foreground"
                    >
                      <SparklesIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            </RevealOnScroll>
            <RevealOnScroll
              delay={100}
              emphasize
              className={index % 2 === 1 ? "lg:order-1" : ""}
            >
              <FeatureScreenshot
                src={getMarketingFeatureImageUrl(feature.visual)}
                alt={feature.imageAlt}
              />
            </RevealOnScroll>
          </div>
        ))}
      </div>
    </section>
  );
}
