"use client";

import { PlayIcon } from "@/app/components/marketing/marketing-icons";
import {
  getMarketingHeroPosterUrl,
  getMarketingHeroVideoUrl,
} from "@/utils/marketing-assets";

type HeroParallaxOffsets = {
  phone: number;
  fan: number;
};

function SlideCard({
  className,
  headline,
  accent = false,
}: {
  className?: string;
  headline: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`marketing-slide-card ${accent ? "marketing-slide-card-accent" : ""} ${className ?? ""}`}
    >
      <div className="marketing-slide-card-shine" aria-hidden />
      <p className="relative z-10 text-[11px] font-semibold leading-snug text-foreground sm:text-xs">
        {headline}
      </p>
      <div className="relative z-10 mt-auto flex gap-1">
        <span className="h-1 w-6 rounded-full bg-primary/60" />
        <span className="h-1 w-3 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
  );
}

export default function MarketingHeroVisual({
  parallax = { phone: 0, fan: 0 },
}: {
  parallax?: HeroParallaxOffsets;
}) {
  const videoUrl = getMarketingHeroVideoUrl();
  const posterUrl = getMarketingHeroPosterUrl();

  return (
    <div className="marketing-hero-visual" aria-hidden>
      <div className="marketing-hero-glow" />

      <div
        className="marketing-hero-parallax-fan-left"
        style={{ transform: `translateY(${parallax.fan}px)` }}
      >
        <SlideCard
          className="marketing-slide-fan-left"
          headline="Stop guessing what to post"
        />
      </div>
      <div
        className="marketing-hero-parallax-fan-right"
        style={{ transform: `translateY(${parallax.fan}px)` }}
      >
        <SlideCard
          className="marketing-slide-fan-right"
          headline="Your offer, explained simply"
        />
      </div>

      <div
        className="marketing-hero-parallax-phone"
        style={{
          transform: `translate(-50%, calc(-50% + ${parallax.phone}px))`,
        }}
      >
        <div className="marketing-phone-frame marketing-phone-frame-hero">
          <div className="marketing-phone-notch" />
          <div className="marketing-phone-screen">
            {videoUrl ? (
              <video
                src={videoUrl}
                poster={posterUrl ?? undefined}
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
            ) : posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={posterUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="marketing-phone-placeholder">
                <div className="marketing-phone-placeholder-slide">
                  <p className="text-[10px] font-semibold leading-tight text-foreground">
                    3 signs you&apos;re ready to grow
                  </p>
                  <div className="mt-2 h-16 rounded-md bg-gradient-to-br from-primary/25 to-ring/10" />
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-2 py-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <PlayIcon className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    AI voiceover · Quick Reel
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
