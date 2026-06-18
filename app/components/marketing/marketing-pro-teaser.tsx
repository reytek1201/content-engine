import Link from "next/link";
import { CheckIcon } from "@/app/components/marketing/marketing-icons";

const FREE_INCLUDES = [
  "Carousel slides with AI images",
  "Platform captions for social",
  "AI voice preview & narration export",
  "Video export (monthly limits apply)",
] as const;

const PRO_TEASE = [
  "Higher video & narration limits",
  "Studio-quality AI voices",
  "More brands & team features",
] as const;

export default function MarketingProTeaser() {
  return (
    <section className="border-t border-border bg-card/20">
      <div className="page-shell py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Pro — coming soon
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Start free today. Upgrade when you&apos;re ready.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            SlidePress is free to try with generous limits while we launch.
            Pro plans for power users and agencies are on the way — no surprise
            charges until you choose to upgrade.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="surface-panel p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-foreground">Free</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything you need to publish your first campaigns
            </p>
            <ul className="mt-6 space-y-3">
              {FREE_INCLUDES.map((item) => (
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
            <Link href="/login" className="btn-primary mt-8 w-full">
              Get started free
            </Link>
          </div>

          <div className="surface-panel relative overflow-hidden border-primary/20 p-6 sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
              aria-hidden
            />
            <div className="relative">
              <h3 className="text-lg font-semibold text-foreground">
                Pro
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  coming soon
                </span>
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                For creators and brands who post every week
              </p>
              <ul className="mt-6 space-y-3">
                {PRO_TEASE.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-secondary-foreground"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className="btn-secondary mt-8 w-full cursor-not-allowed opacity-60"
              >
                Notify me when Pro launches
              </button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                We&apos;ll announce pricing before anything goes live
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
