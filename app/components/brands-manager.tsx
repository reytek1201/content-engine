"use client";

import { useActiveBrand } from "@/app/components/active-brand-provider";
import {
  createBrand,
  deleteBrand,
} from "@/utils/brands-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BrandsManager() {
  const router = useRouter();
  const { brands, activeBrand, refreshBrands, setActiveBrandId } =
    useActiveBrand();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const brand = await createBrand(name.trim());
      setName("");
      await refreshBrands();
      setActiveBrandId(brand.id);
      router.refresh();
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

  async function handleDelete(brandId: string) {
    setError(null);
    setDeletingId(brandId);

    try {
      await deleteBrand(brandId);
      await refreshBrands();
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete brand",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-6 text-muted-foreground">
        Each brand has its own reference images and campaigns. Switch brands
        from the campaigns screen or the menu above.
      </p>

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
                href={`/settings/brand?brand=${brand.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-secondary-foreground transition hover:bg-secondary/60"
              >
                Edit kit
              </Link>
              {!brand.is_default ? (
                <button
                  type="button"
                  disabled={deletingId === brand.id}
                  onClick={() => void handleDelete(brand.id)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-60"
                >
                  {deletingId === brand.id ? "Deleting…" : "Delete"}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={(event) => void handleCreate(event)} className="space-y-3">
        <label
          htmlFor="new-brand-name"
          className="block text-sm font-medium text-secondary-foreground"
        >
          Add brand
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="new-brand-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Acme Skincare"
            required
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            disabled={creating || name.trim().length === 0}
            className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create brand"}
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
