import Link from "next/link";
import MarketingHeroVisual from "@/app/components/marketing/marketing-hero-visual";
import MarketingStoreBadges from "@/app/components/marketing/marketing-store-badges";

export default function MarketingHero() {
  return (
    <section className="marketing-hero-section page-shell pb-12 pt-8 md:pb-20 md:pt-14">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <p className="brand-kicker text-primary">Social content made simple</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
            Turn your idea into slides and video — no editing skills needed
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0">
            Describe what you want to talk about. SlidePress writes your slides,
            creates the images, adds a natural AI voice, and gives you captions
            for TikTok, Instagram, and YouTube — all in one place.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/login" className="btn-primary w-full sm:w-auto">
              Start free
            </Link>
            <a
              href="#download"
              className="btn-secondary w-full sm:w-auto"
            >
              Get the app
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Free to start · No credit card · Pro plans coming soon
          </p>

          <div className="mt-8 hidden lg:block">
            <MarketingStoreBadges />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
          <MarketingHeroVisual />
        </div>
      </div>

      <div className="mt-10 flex justify-center lg:hidden">
        <MarketingStoreBadges />
      </div>
    </section>
  );
}
