"use client";

import Link from "next/link";
import MarketingHeroVisual from "@/app/components/marketing/marketing-hero-visual";
import MarketingStoreBadges from "@/app/components/marketing/marketing-store-badges";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";
import { useMarketingHeroParallax } from "@/app/hooks/use-marketing-hero-parallax";
import { usePrefersReducedMotion } from "@/app/hooks/use-prefers-reduced-motion";

export default function MarketingHero() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { sectionRef, offsets } = useMarketingHeroParallax(!prefersReducedMotion);

  return (
    <section
      ref={sectionRef}
      className="marketing-hero-section page-shell pb-12 pt-8 md:pb-20 md:pt-14"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="text-center lg:text-left">
          <RevealOnScroll when="mount" delay={0}>
            <p className="brand-kicker text-primary">
              From topic or website to published post
            </p>
          </RevealOnScroll>
          <RevealOnScroll when="mount" delay={80}>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Turn your idea — or your website — into slides and video
            </h1>
          </RevealOnScroll>
          <RevealOnScroll when="mount" delay={160}>
            <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0">
              Paste a URL or describe what you want to talk about. SlidePress
              writes your slides, creates on-brand images, adds a natural AI
              voice, generates platform captions, and lets you export or post to
              TikTok, Instagram, and YouTube — all in one workspace.
            </p>
          </RevealOnScroll>

          <RevealOnScroll when="mount" delay={240}>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Link href="/login" className="btn-primary w-full sm:w-auto">
                Start free
              </Link>
              <a href="#download" className="btn-secondary w-full sm:w-auto">
                Get the app
              </a>
            </div>
          </RevealOnScroll>

          <RevealOnScroll when="mount" delay={300}>
            <p className="mt-4 text-xs text-muted-foreground">
              Free to start · No credit card · Upgrade when you need video &amp;
              direct posting
            </p>
          </RevealOnScroll>

          <RevealOnScroll when="mount" delay={360}>
            <div className="mt-8 hidden lg:block">
              <MarketingStoreBadges />
            </div>
          </RevealOnScroll>
        </div>

        <RevealOnScroll
          when="mount"
          delay={120}
          scale
          className="relative mx-auto w-full max-w-sm lg:max-w-none"
        >
          <MarketingHeroVisual parallax={offsets} />
        </RevealOnScroll>
      </div>

      <RevealOnScroll when="mount" delay={400}>
        <div className="mt-10 flex justify-center lg:hidden">
          <MarketingStoreBadges />
        </div>
      </RevealOnScroll>
    </section>
  );
}
