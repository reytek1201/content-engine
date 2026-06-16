import {
  brandsListHref,
  type BrandsBackFrom,
} from "@/utils/brands-back-target";
import Link from "next/link";

interface AddBrandLinkProps {
  label?: string;
  variant?: "inline" | "button";
  className?: string;
  from?: BrandsBackFrom;
  brandId?: string | null;
}

export function addBrandHref(
  from?: BrandsBackFrom,
  brandId?: string | null,
): string {
  return brandsListHref(from, brandId);
}

export default function AddBrandLink({
  label = "Add a brand",
  variant = "inline",
  className = "",
  from,
  brandId,
}: AddBrandLinkProps) {
  const href = brandsListHref(from, brandId);

  if (variant === "button") {
    return (
      <Link
        href={href}
        className={`inline-flex items-center justify-center rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground ${className}`}
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`font-medium text-primary underline-offset-2 hover:underline ${className}`}
    >
      {label}
    </Link>
  );
}

export function AddBrandBanner({
  label = "Add another brand",
  from,
  brandId,
}: {
  label?: string;
  from?: BrandsBackFrom;
  brandId?: string | null;
}) {
  return (
    <p className="mb-6 rounded-xl border border-border bg-card/40 px-4 py-3 text-sm text-muted-foreground">
      Working on more than one business or client?{" "}
      <AddBrandLink label={label} from={from} brandId={brandId} />
    </p>
  );
}
