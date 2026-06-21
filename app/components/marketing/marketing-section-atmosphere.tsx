"use client";

import {
  useIsClient,
  usePrefersReducedMotion,
} from "@/app/hooks/use-prefers-reduced-motion";
import { useEffect, useRef, useState } from "react";

export default function MarketingSectionAtmosphere() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const isClient = useIsClient();
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = isClient && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldAnimate) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -5% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldAnimate]);

  return (
    <div
      ref={ref}
      className={`marketing-section-atmosphere ${visible || !shouldAnimate ? "is-visible" : ""}`}
      aria-hidden
    />
  );
}
