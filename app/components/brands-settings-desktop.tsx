"use client";

import BrandLibraryEditor from "@/app/components/brand-library-editor";
import BrandsManager from "@/app/components/brands-manager";
import { AddBrandBanner } from "@/app/components/add-brand-link";
import { brandsListHref } from "@/utils/brands-back-target";
import { fetchBrands } from "@/utils/brands-client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Brand } from "@/types/brand";

interface BrandsSettingsDesktopProps {
  user: User;
}

export default function BrandsSettingsDesktop({
  user,
}: BrandsSettingsDesktopProps) {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchBrands();

        if (!cancelled) {
          setBrands(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load brands",
          );
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!brands) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Loading brands…
      </div>
    );
  }

  if (brands.length === 1) {
    return (
      <div className="space-y-4">
        <AddBrandBanner from="settings" />
        <BrandLibraryEditor user={user} brandId={brands[0].id} hideBrandName />
        <p className="text-sm text-muted-foreground">
          <Link
            href={brandsListHref("settings")}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            View all brands
          </Link>
        </p>
      </div>
    );
  }

  return <BrandsManager />;
}
