"use client";

import BrandLibraryPanel from "@/app/components/brand-library-panel";
import CampaignTopicSuggester from "@/app/components/campaign-topic-suggester";
import ReferenceUploadSlot from "@/app/components/reference-upload-slot";
import { useActiveBrandOptional } from "@/app/components/active-brand-provider";
import { brandDetailHref } from "@/utils/brands-back-target";
import { createClient } from "@/utils/supabase/client";
import {
  fetchBrandProducts,
  updateBrand,
} from "@/utils/brands-client";
import { uploadReferenceImage } from "@/utils/upload-reference";
import type { BrandProduct } from "@/types/brand";
import {
  brandProductToReferences,
  hasBrandAssets,
} from "@/types/brand";
import type { ReferenceType } from "@/types/references";
import type { UsageSummary } from "@/types/usage";
import type {
  TopicSelectionOptions,
  WebsiteIngestCompletePayload,
} from "@/types/website-ingest";
import {
  buildCampaignWorkspaceHref,
  getAutoGenerateImagesPreference,
  setAutoGenerateImagesPreference,
} from "@/utils/campaign-auto-images-preference";
import {
  getCachedWebsiteIngest,
  updateCachedWebsiteIngestSelection,
} from "@/utils/website-ingest-cache";
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
  onSuccess?: (
    campaignId: string,
    options?: { autoImages?: boolean },
  ) => void;
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
  const activeBrandContext = useActiveBrandOptional();
  const activeBrand = activeBrandContext?.activeBrand ?? null;

  const [topic, setTopic] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("4:5");
  const [slideCount, setSlideCount] = useState<SlideCount>(DEFAULT_SLIDE_COUNT);
  const allowedSlideCounts = getAllowedSlideCounts(user.id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const campaignLimitReached = usage !== null && !usage.canCreateCampaign;

  const [brandProducts, setBrandProducts] = useState<BrandProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [useSavedBrand, setUseSavedBrand] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [autoGenerateImages, setAutoGenerateImages] = useState(false);
  const [clearedLibrarySlots, setClearedLibrarySlots] = useState<
    Set<ReferenceType>
  >(new Set());

  const [productFile, setProductFile] = useState<File | null>(null);
  const [styleFile, setStyleFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [ingestedProductUrl, setIngestedProductUrl] = useState<string | null>(
    null,
  );
  const [ingestedLogoUrl, setIngestedLogoUrl] = useState<string | null>(null);
  const [productPreview, setProductPreview] = useState<string | null>(null);
  const [stylePreview, setStylePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const selectedProduct =
    brandProducts.find((product) => product.id === selectedProductId) ?? null;
  const savedReferences = brandProductToReferences(
    selectedProduct,
    activeBrand,
  );

  useEffect(() => {
    setAutoGenerateImages(getAutoGenerateImagesPreference());

    const cache = getCachedWebsiteIngest();

    if (!cache) {
      return;
    }

    if (cache.selectedTopic) {
      setTopic(cache.selectedTopic);
    }

    if (cache.selectedFormat) {
      setAspectRatio(cache.selectedFormat);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBrandData() {
      if (!activeBrand) {
        return;
      }

      try {
        const products = await fetchBrandProducts(activeBrand.id);

        if (cancelled) {
          return;
        }

        setBrandProducts(products);

        if (hasBrandAssets(activeBrand) || products.length > 0) {
          setUseSavedBrand(true);
        }
      } catch {
        // Brand kit is optional on create
      }
    }

    void loadBrandData();

    return () => {
      cancelled = true;
    };
  }, [activeBrand]);

  useEffect(() => {
    if (!useSavedBrand || productFile) {
      return;
    }

    if (savedReferences.product) {
      setProductPreview(savedReferences.product);
    }
  }, [productFile, savedReferences.product, useSavedBrand]);

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

    if (type === "product" && !file) {
      setIngestedProductUrl(null);
    }

    if (type === "logo" && !file) {
      setIngestedLogoUrl(null);
    }

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
      type === "product" &&
      ingestedProductUrl &&
      !clearedLibrarySlots.has("product")
    ) {
      return ingestedProductUrl;
    }

    if (
      type === "logo" &&
      ingestedLogoUrl &&
      !clearedLibrarySlots.has("logo")
    ) {
      return ingestedLogoUrl;
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
        type === "product" &&
        ingestedProductUrl &&
        !clearedLibrarySlots.has("product")
      ) {
        return ingestedProductUrl;
      }

      if (
        type === "logo" &&
        ingestedLogoUrl &&
        !clearedLibrarySlots.has("logo")
      ) {
        return ingestedLogoUrl;
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

  async function createCampaign(options?: { autoImages?: boolean }) {
    setError(null);
    setIsLoading(true);

    const shouldAutoGenerateImages =
      options?.autoImages ?? autoGenerateImages;

    try {
      const references = await resolveReferencesForSubmit();

      const response = await fetch("/api/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          aspect_ratio: aspectRatio,
          slide_count: slideCount,
          brand_id: activeBrand?.id,
          brand_product_id: selectedProductId || undefined,
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

      if (Object.keys(references).length > 0 && activeBrand) {
        setIsSavingBrand(true);
        try {
          const saved = await updateBrand(activeBrand.id, references);
          void activeBrandContext?.refreshBrands();

          if (saved) {
            setUseSavedBrand(true);
          }
        } catch {
          // Campaign was created; brand save is best-effort
        } finally {
          setIsSavingBrand(false);
        }
      }

      const destinationOptions = { autoImages: shouldAutoGenerateImages };

      if (onSuccess) {
        onSuccess(data.campaignId, destinationOptions);
      } else {
        router.push(buildCampaignWorkspaceHref(data.campaignId, destinationOptions));
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createCampaign();
  }

  async function handleUseTopicAndGenerate(
    nextTopic: string,
    options?: TopicSelectionOptions,
  ) {
    setTopic(nextTopic);

    if (options?.recommendedFormat) {
      setAspectRatio(options.recommendedFormat);
    }

    updateCachedWebsiteIngestSelection(
      nextTopic,
      options?.recommendedFormat,
    );

    await createCampaign({ autoImages: true });
  }

  function handleSelectTopic(
    nextTopic: string,
    options?: TopicSelectionOptions,
  ) {
    setTopic(nextTopic);

    if (options?.recommendedFormat) {
      setAspectRatio(options.recommendedFormat);
    }

    updateCachedWebsiteIngestSelection(
      nextTopic,
      options?.recommendedFormat,
    );
  }

  async function handleSaveIngestBrandKit(
    payload: WebsiteIngestCompletePayload,
  ): Promise<void> {
    if (!activeBrand) {
      throw new Error("Select a brand before saving to brand kit");
    }

    const update: {
      product?: string;
      logo?: string;
    } = {};

    if (payload.productImageUrl) {
      update.product = payload.productImageUrl;
    }

    if (payload.logoImageUrl) {
      update.logo = payload.logoImageUrl;
    }

    if (!update.product && !update.logo) {
      throw new Error("No site references to save");
    }

    await updateBrand(activeBrand.id, update);
    void activeBrandContext?.refreshBrands();
    setUseSavedBrand(true);
    setClearedLibrarySlots(new Set());

    if (payload.productImageUrl) {
      setIngestedProductUrl(payload.productImageUrl);
      setProductPreview(payload.productImageUrl);
    }

    if (payload.logoImageUrl) {
      setIngestedLogoUrl(payload.logoImageUrl);
      setLogoPreview(payload.logoImageUrl);
    }
  }

  async function handleSaveBrandKitOnly() {
    if (!activeBrand) {
      setError("Select a brand before saving references.");
      return;
    }

    setError(null);
    setIsSavingBrand(true);

    try {
      const references = await resolveReferencesForSubmit();

      if (Object.keys(references).length === 0) {
        throw new Error("Upload or enable saved references before saving");
      }

      await updateBrand(activeBrand.id, references);
      void activeBrandContext?.refreshBrands();
      setUseSavedBrand(true);
      setClearedLibrarySlots(new Set());
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save brand kit",
      );
    } finally {
      setIsSavingBrand(false);
    }
  }

  const topicId = `${idPrefix}topic`;
  const isFirstCampaign = usage !== null && usage.totalCampaigns === 0;
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
        {activeBrand ? (
          <p className="text-sm text-muted-foreground">
            Creating for{" "}
            <span className="font-medium text-foreground">
              {activeBrand.name}
            </span>
            {(activeBrandContext?.brands.length ?? 0) > 1 ? (
              <>
                {" "}
                ·{" "}
                <Link
                  href={brandDetailHref(
                    activeBrand.id,
                    "campaigns",
                    activeBrand.id,
                  )}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Manage brand kit
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <div className="mb-4">
          {isFirstCampaign ? (
            <p className="mb-3 text-sm leading-6 text-muted-foreground">
              New here? Paste your website to get campaign ideas in seconds.
            </p>
          ) : null}
          <CampaignTopicSuggester
            inputId={`${idPrefix}website-url`}
            defaultExpanded={isFirstCampaign}
            selectedTopic={topic}
            brandId={activeBrand?.id ?? null}
            onSelectTopic={handleSelectTopic}
            onUseTopicAndGenerate={(nextTopic, options) => {
              void handleUseTopicAndGenerate(nextTopic, options);
            }}
            onIngestComplete={(payload) => {
              if (
                payload.productImageUrl &&
                !productFile &&
                !clearedLibrarySlots.has("product")
              ) {
                setIngestedProductUrl(payload.productImageUrl);
                setProductPreview(payload.productImageUrl);
              }

              if (
                payload.logoImageUrl &&
                !logoFile &&
                !clearedLibrarySlots.has("logo")
              ) {
                setIngestedLogoUrl(payload.logoImageUrl);
                setLogoPreview(payload.logoImageUrl);
              }
            }}
            onSaveBrandKit={handleSaveIngestBrandKit}
            disabled={isLoading}
          />
        </div>

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
            brand={activeBrand}
            useSavedBrand={useSavedBrand}
            onUseSavedBrandChange={handleUseSavedBrandChange}
            isSaving={isSavingBrand}
          />

          {brandProducts.length > 0 ? (
            <div className="mt-4">
              <label
                htmlFor={`${idPrefix}brand-product`}
                className="block text-sm font-medium text-secondary-foreground"
              >
                Product (optional)
              </label>
              <select
                id={`${idPrefix}brand-product`}
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
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
          ) : null}

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
              slotType="product"
              previewUrl={getSlotPreview("product")}
              onFileSelect={(file) => handleReferenceSelect("product", file)}
            />
            <ReferenceUploadSlot
              id={`${idPrefix}style-reference`}
              label="Style"
              description="Mood board or carousel style to match."
              slotType="style"
              previewUrl={getSlotPreview("style")}
              onFileSelect={(file) => handleReferenceSelect("style", file)}
            />
            <ReferenceUploadSlot
              id={`${idPrefix}logo-reference`}
              label="Logo"
              description="Brand mark for consistent placement."
              slotType="logo"
              previewUrl={getSlotPreview("logo")}
              onFileSelect={(file) => handleReferenceSelect("logo", file)}
            />
          </div>

          {hasAnyReferencePreview && (
            <button
              type="button"
              disabled={isSavingBrand}
              onClick={() => void handleSaveBrandKitOnly()}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingBrand ? "Saving…" : "Save to brand kit"}
            </button>
          )}
        </div>

        {campaignLimitReached && usage && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          >
            You&apos;ve used all {usage.limits.campaigns} campaigns on your{" "}
            {usage.planLabel} plan.{" "}
            <Link href="/settings" className="font-medium underline underline-offset-2">
              View usage
            </Link>{" "}
            or upgrade to get more.
          </div>
        )}

        <label className="mt-6 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
          <input
            type="checkbox"
            checked={autoGenerateImages}
            onChange={(event) => {
              const enabled = event.target.checked;
              setAutoGenerateImages(enabled);
              setAutoGenerateImagesPreference(enabled);
            }}
            className="mt-1 h-4 w-4 rounded border-border"
          />
          <span>
            Generate images and captions automatically when slide copy is ready.
          </span>
        </label>

        <button
          type="submit"
          disabled={
            topic.trim().length === 0 ||
            campaignLimitReached ||
            usageLoading
          }
          className="btn-primary-full mt-6"
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
