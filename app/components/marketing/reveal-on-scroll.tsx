"use client";

import {
  useIsClient,
  usePrefersReducedMotion,
} from "@/app/hooks/use-prefers-reduced-motion";
import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";

type RevealOnScrollProps = {
  children: ReactNode;
  className?: string;
  /** Stagger delay in ms */
  delay?: number;
  /** Animate on mount (hero) vs when scrolled into view */
  when?: "scroll" | "mount";
  /** Slight scale-up for hero phone */
  scale?: boolean;
  /** Subtle scale emphasis for feature mocks */
  emphasize?: boolean;
  as?: ElementType;
};

export default function RevealOnScroll({
  children,
  className = "",
  delay = 0,
  when = "scroll",
  scale = false,
  emphasize = false,
  as: Component = "div",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const isClient = useIsClient();
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = isClient && !prefersReducedMotion;

  useEffect(() => {
    if (!shouldAnimate) return;

    if (when === "mount") {
      const timeoutId = window.setTimeout(() => setVisible(true), delay);
      return () => window.clearTimeout(timeoutId);
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          window.setTimeout(() => setVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [delay, shouldAnimate, when]);

  if (!shouldAnimate) {
    return <Component className={className}>{children}</Component>;
  }

  const revealClass = scale
    ? "marketing-reveal-scale"
    : emphasize
      ? "marketing-reveal-emphasize"
      : "marketing-reveal";

  return (
    <Component
      ref={ref}
      className={`${revealClass} ${visible ? "is-visible" : ""} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}
