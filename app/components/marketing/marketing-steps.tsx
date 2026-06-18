import Link from "next/link";
import { CheckIcon } from "@/app/components/marketing/marketing-icons";

const STEPS = [
  "Enter your topic",
  "Wait for slides & images",
  "Preview voice & copy captions",
  "Download carousel, audio, or video",
] as const;

const PLATFORMS = ["TikTok", "Instagram", "YouTube Shorts"] as const;

export default function MarketingSteps() {
  return (
    <section className="border-y border-border bg-card/20">
      <div className="page-shell py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="brand-kicker">How it works</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Four steps from idea to post
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Most campaigns are ready in under five minutes. You stay in control —
              edit headlines, retry a slide, or re-export anytime.
            </p>

            <ol className="mt-8 space-y-3">
              {STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card/30 px-4 py-3.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-secondary-foreground sm:text-base">
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            <Link href="/login" className="btn-primary mt-8 inline-flex">
              Try it free
            </Link>
          </div>

          <div className="surface-panel p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-foreground">
              Works where you post
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Captions are written for the platforms creators use every day.
              Export 4:5 for feed carousels or 9:16 for vertical video.
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
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                4:5 carousel
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                9:16 Reels
              </span>
              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground">
                AI voiceover
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
