"use client";

import ReferenceUploadSlot from "@/app/components/reference-upload-slot";
import type { Brand, BrandProduct } from "@/types/brand";
import type { CampaignReferences, ReferenceType } from "@/types/references";
import { hasReferences } from "@/types/references";
import {
  brandDetailHref,
  brandsListHref,
} from "@/utils/brands-back-target";
import Link from "next/link";

const REFERENCE_SLOTS: {
  type: ReferenceType;
  label: string;
  description: string;
}[] = [
  {
    type: "product",
    label: "Product",
    description: "Your product, app, or offer to feature.",
  },
  {
    type: "style",
    label: "Style",
    description: "Mood board or carousel style to match.",
  },
  {
    type: "logo",
    label: "Logo",
    description: "Brand mark for consistent placement.",
  },
];

interface CampaignReferencesSectionProps {
  idPrefix: string;
  brand: Brand | null;
  brandProducts: BrandProduct[];
  selectedProductId: string;
  onSelectedProductIdChange: (productId: string) => void;
  savedReferences: CampaignReferences;
  useSavedBrand: boolean;
  onUseSavedBrandChange: (value: boolean) => void;
  getSlotPreview: (type: ReferenceType) => string | null;
  onReferenceSelect: (type: ReferenceType, file: File | null) => void;
  isSavingBrand: boolean;
  onSaveBrandKit: () => void;
  hasAnyReferencePreview: boolean;
  hasReferenceOverrides: boolean;
}

export default function CampaignReferencesSection({
  idPrefix,
  brand,
  brandProducts,
  selectedProductId,
  onSelectedProductIdChange,
  savedReferences,
  useSavedBrand,
  onUseSavedBrandChange,
  getSlotPreview,
  onReferenceSelect,
  isSavingBrand,
  onSaveBrandKit,
  hasAnyReferencePreview,
  hasReferenceOverrides,
}: CampaignReferencesSectionProps) {
  const hasSavedKit = hasReferences(savedReferences);
  const showKitMode = hasSavedKit && useSavedBrand;

  const productPicker =
    brandProducts.length > 0 ? (
      <div className={showKitMode ? "mt-4" : "mt-3"}>
        <label
          htmlFor={`${idPrefix}brand-product`}
          className="block text-sm font-medium text-secondary-foreground"
        >
          Product (optional)
        </label>
        <select
          id={`${idPrefix}brand-product`}
          value={selectedProductId}
          onChange={(event) => onSelectedProductIdChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        >
          <option value="">Default brand product image</option>
          {brandProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>
    ) : null;

  const referenceSlots = (
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      {REFERENCE_SLOTS.map((slot) => (
        <ReferenceUploadSlot
          key={slot.type}
          id={`${idPrefix}${slot.type}-reference`}
          label={slot.label}
          description={slot.description}
          slotType={slot.type}
          previewUrl={getSlotPreview(slot.type)}
          onFileSelect={(file) => onReferenceSelect(slot.type, file)}
        />
      ))}
    </div>
  );

  const saveToKitButton =
    hasAnyReferencePreview && (hasReferenceOverrides || !showKitMode) ? (
      <button
        type="button"
        disabled={isSavingBrand}
        onClick={onSaveBrandKit}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSavingBrand ? "Saving…" : "Save to brand kit"}
      </button>
    ) : null;

  if (showKitMode) {
    return (
      <div className="rounded-xl border border-border bg-card/40 px-4 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-secondary-foreground">
              {brand ? `${brand.name} references` : "Brand references"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              From your brand kit. Replace any slot to customize this campaign
              only.
            </p>
          </div>
          <Link
            href={
              brand
                ? brandDetailHref(brand.id, "campaigns", brand.id)
                : brandsListHref("campaigns")
            }
            className="text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            Edit kit
          </Link>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background px-3 py-3">
          <input
            type="checkbox"
            checked={useSavedBrand}
            onChange={(event) => onUseSavedBrandChange(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-secondary-foreground">
            Use saved brand references for this campaign
          </span>
        </label>

        {productPicker}
        {referenceSlots}
        {saveToKitButton}

        <button
          type="button"
          onClick={() => onUseSavedBrandChange(false)}
          className="mt-4 text-xs font-medium text-muted-foreground underline-offset-2 transition hover:text-foreground hover:underline"
        >
          Upload different images instead
        </button>

        {isSavingBrand ? (
          <p className="mt-2 text-xs text-muted-foreground">Saving brand kit…</p>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      {hasSavedKit ? (
        <div className="rounded-xl border border-border bg-card/40 px-4 py-4">
          <p className="text-sm font-medium text-secondary-foreground">
            {brand ? `${brand.name} kit` : "Brand kit"} available
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Reuse your saved product, style, and logo references.
          </p>
          <button
            type="button"
            onClick={() => onUseSavedBrandChange(true)}
            className="btn-primary mt-4 w-full py-2.5 text-sm sm:w-auto sm:px-6"
          >
            Use brand kit
          </button>
        </div>
      ) : null}

      <div className={hasSavedKit ? "mt-4" : ""}>
        <p className="text-sm font-medium text-secondary-foreground">
          References (optional)
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {hasSavedKit
            ? "Or upload images for this campaign only."
            : "Product, style, and logo images guide slide generation."}
        </p>

        {productPicker}
        {referenceSlots}
        {saveToKitButton}
      </div>

      {isSavingBrand ? (
        <p className="mt-2 text-xs text-muted-foreground">Saving brand kit…</p>
      ) : null}
    </div>
  );
}
