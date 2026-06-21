"use client";

import {
  getMarketingFanSlideLeftUrl,
  getMarketingFanSlideRightUrl,
  getMarketingHeroPosterUrl,
  getMarketingHeroVideoUrl,
} from "@/utils/marketing-assets";

type HeroParallaxOffsets = {
  phone: number;
  fan: number;
};

function FanSlideImage({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <div
      className={`marketing-slide-card marketing-slide-card-image ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover" />
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
  const fanLeftUrl = getMarketingFanSlideLeftUrl();
  const fanRightUrl = getMarketingFanSlideRightUrl();

  return (
    <div className="marketing-hero-visual" aria-hidden>
      <div className="marketing-hero-glow" />

      <div
        className="marketing-hero-parallax-fan-left"
        style={{ transform: `translateY(${parallax.fan}px)` }}
      >
        <FanSlideImage
          src={fanLeftUrl}
          className="marketing-slide-fan-left"
        />
      </div>
      <div
        className="marketing-hero-parallax-fan-right"
        style={{ transform: `translateY(${parallax.fan}px)` }}
      >
        <FanSlideImage
          src={fanRightUrl}
          className="marketing-slide-fan-right"
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
            <video
              src={videoUrl}
              poster={posterUrl}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
