"use client";

import BrandLibraryPanel from "@/app/components/brand-library-panel";
import ReferenceUploadSlot from "@/app/components/reference-upload-slot";
import { createClient } from "@/utils/supabase/client";
import {
  fetchBrandLibrary,
  saveBrandLibrary,
} from "@/utils/brand-library-client";
import { uploadReferenceImage } from "@/utils/upload-reference";
import type { BrandLibrary } from "@/types/brand-library";
import {
  brandLibraryToReferences,
  hasBrandLibrary,
  referencesToBrandLibraryPayload,
} from "@/types/brand-library";
import type { ReferenceType } from "@/types/references";
import type { UsageSummary } from "@/types/usage";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import {
  DEFAULT_SLIDE_COUNT,
  getAllowedSlideCounts,
  type SlideCount,
} from "@/types/slides";

type AspectRatio = "4:5" | "9:16";

const SLIDE_COUNT_LABELS: Record<SlideCount, string> = {
  3: "Quick post",
  5: "Standard carousel",
  7: "Deep carousel",
};

interface GenerateTextSuccess {
  success: true;
  campaignId: string;
}

interface GenerateTextFailure {
  success: false;
  error: string;
  details?: unknown;
}

type GenerateTextResponse = GenerateTextSuccess | GenerateTextFailure;

interface CreateCampaignFormProps {
  user: User;
  idPrefix?: string;
  compact?: boolean;
  onSuccess?: (campaignId: string) => void;
}

function formatSubmitError(data: GenerateTextFailure): string {
  if (typeof data.details === "object" && data.details !== null) {
    return `${data.error}. Check your inputs and try again.`;
  }

  return data.error ?? "Generation failed";
}

export default function CreateCampaignForm({
  user,
  idPrefix = "",
  compact = false,
  onSuccess,
}: CreateCampaignFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [slideCount, setSlideCount] = useState<SlideCount>(DEFAULT_SLIDE_COUNT);
  const allowedSlideCounts = getAllowedSlideCounts(user.id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const campaignLimitReached = usage !== null && !usage.canCreateCampaign;

  const [brandLibrary, setBrandLibrary] = useState<BrandLibrary | null>(null);
  const [useSavedBrand, setUseSavedBrand] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [clearedLibrarySlots, setClearedLibrarySlots] = useState<
    Set<ReferenceType>
  >(new Set());

  const [productFile, setProductFile] = useState<File | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const savedReferences = brandLibraryToReferences(brandLibrary);

  useEffect(() => {
    let cancelled = false;

    async function loadBrandLibrary() {
      try {
        const data = await fetchBrandLibrary();

        if (cancelled) {
          return;
        }

        setBrandLibrary(data);

        if (data && hasBrandLibrary(data)) {
          setUseSavedBrand(true);
        }
      } catch {
        // Brand library is optional on create
      }
    }

    void loadBrandLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadUsage() {
      setUsageLoading(true);

      try {
        const response = await fetch("/api/usage");
        const data = (await response.json()) as {
          success: boolean;
          usage?: UsageSummary;
        };

        if (cancelled || !response.ok || !data.success || !data.usage) {
          return;
        }

        setUsage(data.usage);
      } catch {
        // Usage is optional for display; server still enforces limits
      } finally {
        if (!cancelled) {
          setUsageLoading(false);
        }
      }
    }

    void loadUsage();

    return () => {
      cancelled = true;
    };
  }, []);

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

    setFile(file);

    if (file) {
      setClearedLibrarySlots((current) => {
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

    setClearedLibrarySlots((current) => {
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

    if (
      useSavedBrand &&
      savedReferences[type] &&
      !clearedLibrarySlots.has(type)
    ) {
      return savedReferences[type] ?? null;
    }

    return null;
  }

  function handleUseSavedBrandChange(value: boolean) {
    setUseSavedBrand(value);

    if (!value) {
      return;
    }

    setClearedLibrarySlots(new Set());

    if (!productFile && savedReferences.product) {
      setProductPreview(savedReferences.product);
    }

    if (!styleFile && savedReferences.style) {
      setStylePreview(savedReferences.style);
    }

    if (!logoFile && savedReferences.logo) {
      setLogoPreview(savedReferences.logo);
    }
  }

  async function resolveReferencesForSubmit(): Promise<{
    product?: string;
    style?: string;
    logo?: string;
  }> {
    const references: {
      product?: string;
      style?: string;
      logo?: string;
    } = {};

    async function resolveSlot(type: ReferenceType, file: File | null) {
      if (file) {
        return uploadReferenceImage(supabase, file, user.id, type);
      }

      if (
        useSavedBrand &&
        savedReferences[type] &&
        !clearedLibrarySlots.has(type)
      ) {
        return savedReferences[type] ?? undefined;
      }

      return undefined;
    }

    const product = await resolveSlot("product", productFile);
    const style = await resolveSlot("style", styleFile);
    const logo = await resolveSlot("logo", logoFile);

    if (product) {
      references.product = product;
    }

    if (style) {
      references.style = style;
    }

    if (logo) {
      references.logo = logo;
    }

    return references;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsLoading(true);

    try {
      const references = await resolveReferencesForSubmit();

      const response = await fetch("/api/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          aspect_ratio: aspectRatio,
          slide_count: slideCount,
          references:
            Object.keys(references).length > 0 ? references : undefined,
        }),
      });

      const data = (await response.json()) as GenerateTextResponse;

      if (!response.ok || !data.success) {
        if (response.status === 429) {
          setUsage((current) =>
            current ? { ...current, canCreateCampaign: false, remaining: { ...current.remaining, campaigns: 0 } } : current
          );
        }

        throw new Error(formatSubmitError(data as GenerateTextFailure));
      }

      if (Object.keys(references).length > 0) {
        setIsSavingBrand(true);
        try {
          const saved = await saveBrandLibrary(references);

          if (saved) {
            setBrandLibrary(saved);
            setUseSavedBrand(true);
          }
        } catch {
          // Campaign was created; brand save is best-effort
        } finally {
          setIsSavingBrand(false);
        }
      }

      if (onSuccess) {
        onSuccess(data.campaignId);
      } else {
        router.push(`/campaign/${data.campaignId}`);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong"
      );
    } finally {
      setIsLoading(false);
      setIsSavingBrand(false);
    }
  }

  async function handleSaveBrandLibraryOnly() {
    setError(null);
    setIsSavingBrand(true);

    try {
      const references = await resolveReferencesForSubmit();
      const payload = referencesToBrandLibraryPayload(references);

      if (Object.keys(payload).length === 0) {
        throw new Error("Upload or enable saved references before saving");
      }

      const saved = await saveBrandLibrary(payload);

      if (!saved) {
        throw new Error("Failed to save brand library");
      }

      setBrandLibrary(saved);
      setUseSavedBrand(true);
      setClearedLibrarySlots(new Set());
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save brand library"
      );
    } finally {
      setIsSavingBrand(false);
    }
  }

  const topicId = `${idPrefix}topic`;
  const hasAnyReferencePreview =
    Boolean(getSlotPreview("product")) ||
    Boolean(getSlotPreview("style")) ||
    Boolean(getSlotPreview("logo"));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/40 px-6 py-16 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-6 text-sm font-medium text-foreground">
          Creating your campaign…
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;ll land in the workspace while slides are written.
        </p>
      </div>
    );
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={
          compact
            ? "space-y-6"
            : "rounded-2xl border border-border bg-card/60 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8"
        }
      >
        <label
          htmlFor={topicId}
          className="block text-sm font-medium text-secondary-foreground"
        >
          Topic / pain point
        </label>
        <input
          id={topicId}
          type="text"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="e.g. Founders wasting hours on manual social posting"
          required
          className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
        />

        <div className={compact ? "space-y-3" : "mt-8"}>
          <p className="text-sm font-medium text-secondary-foreground">
            Aspect ratio
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAspectRatio("4:5")}
              className={`option-toggle ${
                aspectRatio === "4:5"
                  ? "option-toggle-selected"
                  : "option-toggle-default"
              }`}
            >
              <span className="block text-sm font-semibold">4:5 Portrait</span>
              <span className="mt-1 block text-xs opacity-70">
                Carousel / feed creative
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAspectRatio("9:16")}
              className={`option-toggle ${
                aspectRatio === "9:16"
                  ? "option-toggle-selected"
                  : "option-toggle-default"
              }`}
            >
              <span className="block text-sm font-semibold">9:16 Vertical</span>
              <span className="mt-1 block text-xs opacity-70">
                Reels / Shorts / TikTok
              </span>
            </button>
          </div>
        </div>

        <div className={compact ? "space-y-3" : "mt-8"}>
          <p className="text-sm font-medium text-secondary-foreground">
            Slide count
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {allowedSlideCounts.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => setSlideCount(count)}
                className={`option-toggle ${
                  slideCount === count
                    ? "option-toggle-selected"
                    : "option-toggle-default"
                }`}
              >
                <span className="block text-sm font-semibold">
                  {count} slides
                </span>
                <span className="mt-1 block text-xs opacity-70">
                  {SLIDE_COUNT_LABELS[count]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className={compact ? "space-y-3" : "mt-8"}>
          <BrandLibraryPanel
            library={brandLibrary}
            useSavedBrand={useSavedBrand}
            onUseSavedBrandChange={handleUseSavedBrandChange}
            isSaving={isSavingBrand}
          />

          <p className="mt-4 text-sm font-medium text-secondary-foreground">
            References (optional)
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Upload new assets or use saved brand references above. New uploads
            override saved images for this campaign only.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <ReferenceUploadSlot
              id={`${idPrefix}product-reference`}
              label="Product"
              description="Your product, app, or offer to feature."
              previewUrl={getSlotPreview("product")}
              onFileSelect={(file) => handleReferenceSelect("product", file)}
            />
            <ReferenceUploadSlot
              id={`${idPrefix}style-reference`}
              label="Style"
              description="Mood board or carousel style to match."
              previewUrl={getSlotPreview("style")}
              onFileSelect={(file) => handleReferenceSelect("style", file)}
            />
            <ReferenceUploadSlot
              id={`${idPrefix}logo-reference`}
              label="Logo"
              description="Brand mark for consistent placement."
              previewUrl={getSlotPreview("logo")}
              onFileSelect={(file) => handleReferenceSelect("logo", file)}
            />
          </div>

          {hasAnyReferencePreview && (
            <button
              type="button"
              disabled={isSavingBrand}
              onClick={() => void handleSaveBrandLibraryOnly()}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingBrand ? "Saving…" : "Save to brand library"}
            </button>
          )}
        </div>

        {campaignLimitReached && usage && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          >
            You&apos;ve used all {usage.limits.campaignsPerMonth} beta campaigns
            this month. Limits reset on the 1st — see{" "}
            <Link href="/settings" className="font-medium underline underline-offset-2">
              Settings
            </Link>{" "}
            for usage.
          </div>
        )}

        <button
          type="submit"
          disabled={
            topic.trim().length === 0 ||
            campaignLimitReached ||
            usageLoading
          }
          className="btn-primary-full mt-8"
        >
          Generate campaign
        </button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}
    </>
  );
}
