"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import { useActiveBrandOptional } from "@/app/components/active-brand-provider";
import type { Brand } from "@/types/brand";
import { hapticSelection } from "@/utils/haptics";
import { useState } from "react";

function ChevronDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-muted-foreground"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-primary"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

interface BrandPickerSheetProps {
  open: boolean;
  brands: Brand[];
  activeBrandId: string | null;
  onClose: () => void;
  onSelect: (brandId: string) => void;
}

function BrandPickerSheet({
  open,
  brands,
  activeBrandId,
  onClose,
  onSelect,
}: BrandPickerSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Switch brand"
      titleId="brand-picker-title"
      description="Campaigns and references are scoped to the brand you choose."
      zIndexClass="z-[70]"
      maxHeightClass="max-h-[min(70vh,28rem)]"
    >
      <ul className="space-y-2">
        {brands.map((brand) => {
          const isActive = brand.id === activeBrandId;

          return (
            <li key={brand.id}>
              <button
                type="button"
                onClick={() => {
                  if (!isActive) {
                    void hapticSelection();
                  }
                  onSelect(brand.id);
                  onClose();
                }}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                  isActive
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-background hover:border-ring/60"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {brand.name}
                  </span>
                  {brand.is_default ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Primary brand
                    </span>
                  ) : null}
                </span>
                {isActive ? <CheckIcon /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}

export default function BrandSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const context = useActiveBrandOptional();
  const [open, setOpen] = useState(false);

  if (!context || context.loading || context.brands.length <= 1) {
    return null;
  }

  const { brands, activeBrand, setActiveBrandId } = context;

  return (
    <>
      <div className={className}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Brand
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="mt-2 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-left transition hover:border-ring/60 active:scale-[0.98]"
        >
          <span className="min-w-0 truncate text-sm font-medium text-foreground">
            {activeBrand?.name ?? "Select brand"}
          </span>
          <ChevronDownIcon />
        </button>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Tap to switch which brand you&apos;re working in.
        </p>
      </div>

      <BrandPickerSheet
        open={open}
        brands={brands}
        activeBrandId={activeBrand?.id ?? null}
        onClose={() => setOpen(false)}
        onSelect={setActiveBrandId}
      />
    </>
  );
}
