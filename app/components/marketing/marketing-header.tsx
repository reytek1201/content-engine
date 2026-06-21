"use client";

import BrandLogo from "@/app/components/brand-logo";
import Link from "next/link";
import { useEffect, useState } from "react";

const SCROLL_THRESHOLD_PX = 40;

export default function MarketingHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD_PX);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,border-color,padding,backdrop-filter] duration-300 ${
        scrolled
          ? "border-border/60 bg-background/80 py-4 backdrop-blur-md md:py-5"
          : "border-transparent bg-transparent py-5 md:py-6"
      }`}
    >
      <div className="page-shell flex items-center justify-between">
        <BrandLogo href="/" />
        <nav className="flex items-center gap-1 sm:gap-2">
          <a
            href="#download"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground sm:inline"
          >
            Download app
          </a>
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
          >
            Sign in
          </Link>
          <Link href="/login" className="btn-primary hidden py-2 sm:inline-flex">
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}
