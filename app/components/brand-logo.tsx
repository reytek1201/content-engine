"use client";

import { brandLogoSrc, siteName } from "@/utils/site-metadata";
import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  showWordmark?: boolean;
  className?: string;
  imageClassName?: string;
}

export default function BrandLogo({
  href = "/",
  showWordmark = true,
  className = "flex items-center gap-2 transition hover:opacity-90",
  imageClassName = "h-7 w-7 object-contain",
}: BrandLogoProps) {
  return (
    <Link href={href} className={className}>
      <Image
        src={brandLogoSrc}
        alt={siteName}
        width={28}
        height={28}
        className={imageClassName}
        priority
      />
      {showWordmark ? (
        <span className="text-xl font-semibold leading-none tracking-tight text-foreground">
          {siteName}
        </span>
      ) : null}
    </Link>
  );
}
