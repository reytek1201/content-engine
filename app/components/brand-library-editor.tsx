"use client";

import BrandProductsSection from "@/app/components/brand-products-section";
import BrandVoiceSettings from "@/app/components/brand-voice-settings";
import ReferenceUploadSlot from "@/app/components/reference-upload-slot";
import { useActiveBrandOptional } from "@/app/components/active-brand-provider";
import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { createClient } from "@/utils/supabase/client";
import { fetchBrand, updateBrand } from "@/utils/brands-client";
import { uploadReferenceImage } from "@/utils/upload-reference";
import type { Brand } from "@/types/brand";
import { brandToReferences } from "@/types/brand";
import type { ReferenceType } from "@/types/references";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

interface BrandLibraryEditorProps {
  user: User;
  brandId?: string;
  hideBrandName?: boolean;
}

export default function BrandLibraryEditor({
  user,
  brandId: brandIdProp,
  hideBrandName = false,
}: BrandLibraryEditorProps) {
  const supabase = createClient();
  const router = useRouter();
  const isNativeApp = useIsNativeApp();
  const activeBrandContext = useActiveBrandOptional();
  const resolvedBrandId =
    brandIdProp ?? activeBrandContext?.activeBrand?.id ?? null;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [productFile, setProductFile] = useState<File | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [clearedSlots, setClearedSlots] = useState<Set<ReferenceType>>(
    new Set(),
  );

  const savedReferences = brandToReferences(brand);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!resolvedBrandId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await fetchBrand(resolvedBrandId);

        if (cancelled) {
          return;
        }

        setBrand(data);
        setBrandName(data?.name ?? "");
        const refs = brandToReferences(data);
        setProductPreview(refs.product ?? null);
        setStylePreview(refs.style ?? null);
        setLogoPreview(refs.logo ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load brand kit",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [resolvedBrandId]);

  function handleReferenceSelect(type: ReferenceType, file: File | null) {
    const setFile =
      type === "product"
        ? setProductFile
        : type === "style"
          ? setStyleFile
          : setLogoFile;
    const setPreview =
      type === "product"
        ? setProductPreview
        : type === "style"
          ? setStylePreview
          : setLogoPreview;

    setSuccessMessage(null);
    setFile(file);

    if (file) {
      setClearedSlots((current) => {
        const next = new Set(current);
        next.delete(type);
        return next;
      });

      setPreview((current) => {
        if (current?.startsWith("blob:")) {
          URL.revokeObjectURL(current);
        }

        return URL.createObjectURL(file);
      });

      return;
    }

    setClearedSlots((current) => {
      const next = new Set(current);
      next.add(type);
      return next;
    });

    setPreview((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return null;
    });
  }

  function getSlotPreview(type: ReferenceType): string | null {
    const localPreview =
      type === "product"
        ? productPreview
        : type === "style"
          ? stylePreview
          : logoPreview;

    if (localPreview) {
      return localPreview;
    }

    if (savedReferences[type] && !clearedSlots.has(type)) {
      return savedReferences[type] ?? null;
    }

    return null;
  }

  async function resolveSlot(
    type: ReferenceType,
    file: File | null,
  ): Promise<string | null> {
    if (clearedSlots.has(type)) {
      return null;
    }

    if (file) {
      return uploadReferenceImage(supabase, file, user.id, type);
    }

    return savedReferences[type] ?? null;
  }

  async function persistBrand(
    product: string | null,
    style: string | null,
    logo: string | null,
    name?: string,
  ) {
    if (!resolvedBrandId) {
      throw new Error("No brand selected");
    }

    const payload: {
      product?: string | null;
      style?: string | null;
      logo?: string | null;
      name?: string;
    } = {
      product,
      style,
      logo,
    };

    const trimmedName = name?.trim();

    if (trimmedName && trimmedName.length > 0) {
      payload.name = trimmedName;
    }

    return updateBrand(resolvedBrandId, payload);
  }

  async function handleSave() {
    setError(null);
    setSuccessMessage(null);
    setSaving(true);

    try {
      const product = await resolveSlot("product", productFile);
      const style = await resolveSlot("style", styleFile);
      const logo = await resolveSlot("logo", logoFile);

      const trimmedName = brandName.trim();

      if (!trimmedName) {
        throw new Error("Brand name is required");
      }

      const saved = await persistBrand(
        product,
        style,
        logo,
        trimmedName !== brand?.name ? trimmedName : undefined,
      );
      setBrand(saved);
      setBrandName(saved.name);
      setProductFile(null);
      setStyleFile(null);
      setLogoFile(null);
      setClearedSlots(new Set());

      const refs = brandToReferences(saved);
      setProductPreview(refs.product ?? null);
      setStylePreview(refs.style ?? null);
      setLogoPreview(refs.logo ?? null);
      setSuccessMessage("Brand kit saved.");
      void activeBrandContext?.refreshBrands();
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save brand kit",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleClearAll() {
    setError(null);
    setSuccessMessage(null);
    setClearing(true);

    try {
      const saved = await persistBrand(null, null, null);
      setBrand(saved);
      setProductFile(null);
      setStyleFile(null);
      setLogoFile(null);
      setProductPreview(null);
      setStylePreview(null);
      setLogoPreview(null);
      setClearedSlots(new Set());
      setSuccessMessage("Brand kit cleared.");
      void activeBrandContext?.refreshBrands();
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Failed to clear brand kit",
      );
    } finally {
      setClearing(false);
    }
  }

  if (!resolvedBrandId) {
    return (
      <p className="text-sm text-muted-foreground">
        Select a brand from campaigns or create one in Settings → Brands.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading brand kit…
      </div>
    );
  }

  const hasAnyPreview =
    Boolean(getSlotPreview("product")) ||
    Boolean(getSlotPreview("style")) ||
    Boolean(getSlotPreview("logo"));
  const trimmedBrandName = brandName.trim();
  const nameChanged = Boolean(brand && trimmedBrandName !== brand.name);
  const canSave =
    trimmedBrandName.length > 0 && (hasAnyPreview || nameChanged);

  return (
    <div>
      <div className="space-y-2">
        <label
          htmlFor="brand-name"
          className="block text-sm font-medium text-secondary-foreground"
        >
          Brand name
        </label>
        <input
          id="brand-name"
          type="text"
          value={brandName}
          onChange={(event) => {
            setSuccessMessage(null);
            setBrandName(event.target.value);
          }}
          placeholder="e.g. Acme Skincare"
          disabled={saving || clearing}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Save product, style, and logo references for this brand — they&apos;ll
        pre-fill when you create new campaigns.
        {isNativeApp ? (
          <span>
            {" "}
            Tap <strong className="text-foreground">Camera</strong> to photograph
            your product or logo right now.
          </span>
        ) : null}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <ReferenceUploadSlot
          id="settings-product-reference"
          label="Product"
          description="Your product, app, or offer to feature."
          hint="Centre on a plain background, good light."
          slotType="product"
          previewUrl={getSlotPreview("product")}
          disabled={saving || clearing}
          onFileSelect={(file) => handleReferenceSelect("product", file)}
        />
        <ReferenceUploadSlot
          id="settings-style-reference"
          label="Style"
          description="Mood board or carousel style to match."
          hint="A feed post, printed ad, or anything with the vibe you want."
          slotType="style"
          previewUrl={getSlotPreview("style")}
          disabled={saving || clearing}
          onFileSelect={(file) => handleReferenceSelect("style", file)}
        />
        <ReferenceUploadSlot
          id="settings-logo-reference"
          label="Logo"
          description="Brand mark for consistent placement."
          hint="Try photographing your packaging or a business card corner."
          slotType="logo"
          previewUrl={getSlotPreview("logo")}
          disabled={saving || clearing}
          onFileSelect={(file) => handleReferenceSelect("logo", file)}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || clearing || !canSave}
          onClick={() => void handleSave()}
          className="btn-primary inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        {brand ? (
          <button
            type="button"
            disabled={saving || clearing}
            onClick={() => void handleClearAll()}
            className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
          >
            {clearing ? "Clearing…" : "Clear all"}
          </button>
        ) : null}
      </div>

      {successMessage ? (
        <p className="mt-4 text-sm text-primary">{successMessage}</p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      {brand ? (
        <BrandVoiceSettings
          brand={brand}
          onUpdated={(updated) => {
            setBrand(updated);
            void activeBrandContext?.refreshBrands();
          }}
        />
      ) : null}

      <BrandProductsSection brandId={resolvedBrandId} user={user} />
    </div>
  );
}
