"use client";

import { useEffect, useRef, useState } from "react";

type HeroParallaxOffsets = {
  phone: number;
  fan: number;
};

const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";
const PHONE_PARALLAX_MAX_PX = 12;
const FAN_PARALLAX_MAX_PX = 4;

export function useMarketingHeroParallax(enabled: boolean) {
  const sectionRef = useRef<HTMLElement>(null);
  const [offsets, setOffsets] = useState<HeroParallaxOffsets>({
    phone: 0,
    fan: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    let frameId = 0;

    function updateOffsets() {
      if (!mediaQuery.matches) {
        setOffsets({ phone: 0, fan: 0 });
        return;
      }

      const section = sectionRef.current;
      if (!section) return;

      const rect = section.getBoundingClientRect();
      const height = section.offsetHeight || 1;
      const progress = Math.min(Math.max(-rect.top / height, 0), 1);

      setOffsets({
        phone: progress * PHONE_PARALLAX_MAX_PX,
        fan: progress * FAN_PARALLAX_MAX_PX,
      });
    }

    function handleScroll() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateOffsets);
    }

    updateOffsets();
    window.addEventListener("scroll", handleScroll, { passive: true });
    mediaQuery.addEventListener("change", handleScroll);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", handleScroll);
      mediaQuery.removeEventListener("change", handleScroll);
    };
  }, [enabled]);

  return { sectionRef, offsets };
}
