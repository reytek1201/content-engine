"use client";

import { useActiveBrand } from "@/app/components/active-brand-provider";
import {
  brandDetailHref,
  parseBrandsBackFrom,
} from "@/utils/brands-back-target";
import {
  createBrand,
} from "@/utils/brands-client";
import DeleteBrandButton from "@/app/components/delete-brand-button";
import type { UsageSummary } from "@/types/usage";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function BrandsManager() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = parseBrandsBackFrom(searchParams.get("from") ?? undefined);
  const returnBrandId = searchParams.get("brand");
  const { brands, activeBrand, refreshBrands, setActiveBrandId } =
    useActiveBrand();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const brandLimitReached = usage !== null && !usage.brands.canCreate;

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

        if (response.ok && data.success && data.usage && !cancelled) {
          setUsage(data.usage);
        }
      } catch {
        // Form stays enabled if usage fails to load.
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

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const brand = await createBrand(name.trim());
      setName("");
      await refreshBrands();
      setActiveBrandId(brand.id);
      setUsage((current) =>
        current
          ? {
              ...current,
              brands: {
                ...current.brands,
                count: current.brands.count + 1,
                canCreate: current.brands.count + 1 < current.brands.limit,
              },
              canCreateBrand:
                current.brands.count + 1 < current.brands.limit,
            }
          : current,
      );
      router.push(
        brandDetailHref(brand.id, from, from === "campaigns" ? brand.id : returnBrandId),
      );
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create brand",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleBrandDeleted(replacementBrandId?: string) {
    setError(null);

    if (replacementBrandId) {
      setActiveBrandId(replacementBrandId);
    }

    await refreshBrands();
    setUsage((current) =>
      current
        ? {
            ...current,
            brands: {
              ...current.brands,
              count: replacementBrandId
                ? current.brands.count
                : Math.max(0, current.brands.count - 1),
              canCreate: replacementBrandId
                ? current.brands.count < current.brands.limit
                : Math.max(0, current.brands.count - 1) < current.brands.limit,
            },
            canCreateBrand: replacementBrandId
              ? current.brands.count < current.brands.limit
              : Math.max(0, current.brands.count - 1) < current.brands.limit,
          }
        : current,
    );
    router.refresh();
  }

  const isOnlyBrand = brands.length === 1;

  return (
    <div className="space-y-6">
      {usage && (
        <p className="text-xs text-muted-foreground">
          {usage.brands.count} of {usage.brands.limit} brands on your{" "}
          {usage.planLabel} plan
        </p>
      )}

      <form onSubmit={(event) => void handleCreate(event)} className="space-y-3 rounded-xl border border-border bg-card/40 p-4">
        <label
          htmlFor="new-brand-name"
          className="block text-sm font-medium text-secondary-foreground"
        >
          Add brand
        </label>
        <p className="text-xs leading-5 text-muted-foreground">
          Each brand has its own reference images, products, and campaigns.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="new-brand-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Acme Skincare"
            required
            disabled={brandLimitReached}
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={creating || name.trim().length === 0 || brandLimitReached || usageLoading}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create & set up kit"}
          </button>
        </div>
      </form>

      {brandLimitReached && usage && (
        <div
          role="status"
          className="rounded-xl border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
        >
          You&apos;ve reached the {usage.brands.limit}-brand limit on your{" "}
          {usage.planLabel} plan.{" "}
          <Link
            href="/settings/usage"
            className="font-medium underline underline-offset-2"
          >
            View plans & usage
          </Link>{" "}
          to add more brands.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card/40 divide-y divide-border">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{brand.name}</p>
              <p className="text-xs text-muted-foreground">
                {brand.is_default ? "Default brand" : "Additional brand"}
                {activeBrand?.id === brand.id ? " · Active" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={brandDetailHref(brand.id, from, returnBrandId)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/60"
              >
                Open
              </Link>
              <DeleteBrandButton
                brandId={brand.id}
                brandName={brand.name}
                isDefault={brand.is_default}
                isOnlyBrand={isOnlyBrand}
                onDeleted={handleBrandDeleted}
                label="Delete"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
              />
            </div>
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
