"use client";

import { useActiveBrandOptional } from "@/app/components/active-brand-provider";
import Link from "next/link";

export default function BrandSwitcher({ compact = false }: { compact?: boolean }) {
  const context = useActiveBrandOptional();

  if (!context || context.loading || context.brands.length <= 1) {
    return null;
  }

  const { brands, activeBrand, setActiveBrandId } = context;

  return (
    <div
      className={
        compact
          ? "flex min-w-0 items-center gap-2"
          : "flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background/60 px-2 py-1"
      }
    >
      <label htmlFor="brand-switcher" className="sr-only">
        Active brand
      </label>
      <select
        id="brand-switcher"
        value={activeBrand?.id ?? ""}
        onChange={(event) => setActiveBrandId(event.target.value)}
        className="max-w-[10rem] truncate rounded-md border-0 bg-transparent py-1 pl-1 pr-6 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring/30 sm:max-w-[12rem]"
      >
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
            {brand.is_default ? " (default)" : ""}
          </option>
        ))}
      </select>
      {!compact ? (
        <Link
          href="/settings/brands"
          className="shrink-0 text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Manage
        </Link>
      ) : null}
    </div>
  );
}
