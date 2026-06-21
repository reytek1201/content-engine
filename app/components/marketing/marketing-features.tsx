import { SparklesIcon } from "@/app/components/marketing/marketing-icons";
import MarketingSectionIntro from "@/app/components/marketing/marketing-section-intro";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";

const FEATURES = [
  {
    kicker: "Step 1",
    title: "Tell us your topic",
    description:
      "Type a pain point, product, or idea — like you would explain it to a friend. Pick 4:5 for feed carousels or 9:16 for Reels and Shorts.",
    bullets: [
      "3, 5, or 7 slides",
      "Optional product & style photos",
      "Separate workspaces per brand or client",
    ],
    visual: "topic",
  },
  {
    kicker: "Step 2",
    title: "Slides & images appear",
    description:
      "AI writes each slide’s headline and voiceover script, then generates on-brand images with your text already on the creative.",
    bullets: [
      "Edit any headline in one tap",
      "Regenerate a single slide if needed",
      "Preview the full carousel before you publish",
    ],
    visual: "slides",
  },
  {
    kicker: "Step 3",
    title: "Voice, captions & export",
    description:
      "Preview how your slides sound, copy captions for each platform, then download your zip, narration, or finished video.",
    bullets: [
      "Natural AI voices — warm, energetic, or professional",
      "TikTok, Instagram & YouTube copy included",
      "Save to Photos or share from the mobile app",
    ],
    visual: "export",
  },
] as const;

function FeatureVisual({ type }: { type: (typeof FEATURES)[number]["visual"] }) {
  if (type === "topic") {
    return (
      <div className="marketing-feature-mock p-5">
        <p className="text-xs font-medium text-muted-foreground">Your topic</p>
        <p className="mt-2 text-sm font-semibold text-foreground">
          Why most small businesses waste money on ads
        </p>
        <div className="mt-4 flex gap-2">
          <span className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            4:5 Carousel
          </span>
          <span className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
            5 slides
          </span>
        </div>
      </div>
    );
  }

  if (type === "slides") {
    return (
      <div className="marketing-feature-mock p-4">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`aspect-[4/5] rounded-lg border ${n === 2 ? "border-primary/50 bg-primary/10" : "border-border bg-card/80"}`}
            >
              <div className="flex h-full flex-col justify-end p-2">
                <span className="text-[8px] font-semibold text-foreground">
                  Slide {n}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          2 of 5 images ready
        </p>
      </div>
    );
  }

  return (
    <div className="marketing-feature-mock p-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
          <span className="text-xs font-medium text-foreground">
            Quick Reel
          </span>
          <span className="text-[10px] text-primary">Export video</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
          <span className="text-xs font-medium text-foreground">
            Narration ZIP
          </span>
          <span className="text-[10px] text-muted-foreground">Download</span>
        </div>
        <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
          <p className="text-[10px] text-muted-foreground">Instagram caption</p>
          <p className="mt-1 text-xs text-secondary-foreground line-clamp-2">
            Here&apos;s the truth about organic reach in 2026…
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MarketingFeatures() {
  return (
    <section className="page-shell py-16 md:py-24">
      <MarketingSectionIntro
        kicker="Built for creators, not designers"
        title="Everything happens in one simple flow"
        description="No timelines, layers, or five different apps. If you can type a sentence, you can publish."
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
              <FeatureVisual type={feature.visual} />
            </RevealOnScroll>
          </div>
        ))}
      </div>
    </section>
  );
}
