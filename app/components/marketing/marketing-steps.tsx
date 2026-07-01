import Link from "next/link";
import { CheckIcon } from "@/app/components/marketing/marketing-icons";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";
import MarketingSectionAtmosphere from "@/app/components/marketing/marketing-section-atmosphere";

const STEPS = [
  "Enter your topic or paste your website",
  "Slides & images generate",
  "Preview voice & edit copy",
  "Export carousel, audio, or video",
  "Post or schedule to connected platforms",
] as const;

const PLATFORMS = ["TikTok", "Instagram", "YouTube Shorts"] as const;

const FORMAT_TAGS = [
  "4:5 carousel",
  "9:16 Reels",
  "AI voiceover",
  "Direct post",
  "Schedule (paid)",
] as const;

export default function MarketingSteps() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-card/20">
      <MarketingSectionAtmosphere />
      <div className="page-shell py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <RevealOnScroll delay={0}>
              <p className="brand-kicker">How it works</p>
            </RevealOnScroll>
            <RevealOnScroll delay={80}>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Five steps from idea to post
              </h2>
            </RevealOnScroll>
            <RevealOnScroll delay={160}>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Most campaigns are ready in under five minutes. You stay in control
                — edit headlines, retry a slide, or re-export anytime.
              </p>
            </RevealOnScroll>

            <ol className="mt-8 space-y-3">
              {STEPS.map((step, index) => (
                <RevealOnScroll
                  key={step}
                  as="li"
                  delay={index * 60}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card/30 px-4 py-3.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-secondary-foreground sm:text-base">
                    {step}
                  </span>
                </RevealOnScroll>
              ))}
            </ol>

            <RevealOnScroll delay={380}>
              <Link href="/login" className="btn-primary mt-8 inline-flex">
                Try it free
              </Link>
            </RevealOnScroll>
          </div>

          <RevealOnScroll delay={120}>
            <div className="surface-panel p-6 sm:p-8">
              <h3 className="text-lg font-semibold text-foreground">
                Works where you post
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Captions are written for the platforms creators use every day.
                Export 4:5 for feed carousels or 9:16 for vertical video — then
                post directly from SlidePress.
              </p>
              <ul className="mt-6 space-y-3">
                {PLATFORMS.map((platform) => (
                  <li
                    key={platform}
                    className="flex items-center gap-3 text-sm font-medium text-secondary-foreground"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {platform}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm leading-6 text-muted-foreground">
                Connect YouTube, TikTok, or Instagram in Settings and publish from
                your campaign. Free includes one platform connection; paid plans
                unlock all three.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {FORMAT_TAGS.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </section>
  );
}
