"use client";

import type { Brand } from "@/types/brand";
import {
  getStoredActiveBrandId,
  setStoredActiveBrandId,
} from "@/utils/active-brand-storage";
import { fetchBrands } from "@/utils/brands-client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

interface ActiveBrandContextValue {
  brands: Brand[];
  activeBrand: Brand | null;
  loading: boolean;
  setActiveBrandId: (brandId: string) => void;
  refreshBrands: () => Promise<void>;
}

const ActiveBrandContext = createContext<ActiveBrandContextValue | null>(null);

function pickActiveBrand(
  brands: Brand[],
  preferredId: string | null,
): Brand | null {
  if (brands.length === 0) {
    return null;
  }

  if (preferredId) {
    const match = brands.find((brand) => brand.id === preferredId);

    if (match) {
      return match;
    }
  }

  return brands.find((brand) => brand.is_default) ?? brands[0] ?? null;
}

export function useActiveBrand(): ActiveBrandContextValue {
  const context = useContext(ActiveBrandContext);

  if (!context) {
    throw new Error("useActiveBrand must be used within ActiveBrandProvider");
  }

  return context;
}

export function useActiveBrandOptional(): ActiveBrandContextValue | null {
  return useContext(ActiveBrandContext);
}

export function ActiveBrandProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandId, setActiveBrandIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshBrands = useCallback(async () => {
    const nextBrands = await fetchBrands();
    setBrands(nextBrands);

    const urlBrandId = searchParams.get("brand");
    const storedBrandId = getStoredActiveBrandId();
    const preferredId = urlBrandId ?? storedBrandId ?? activeBrandId;
    const nextActive = pickActiveBrand(nextBrands, preferredId);

    if (nextActive) {
      setActiveBrandIdState(nextActive.id);
      setStoredActiveBrandId(nextActive.id);
    }

    return undefined;
  }, [activeBrandId, searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const nextBrands = await fetchBrands();

        if (cancelled) {
          return;
        }

        setBrands(nextBrands);

        const urlBrandId = searchParams.get("brand");
        const storedBrandId = getStoredActiveBrandId();
        const preferredId = urlBrandId ?? storedBrandId;
        const nextActive = pickActiveBrand(nextBrands, preferredId);

        if (nextActive) {
          setActiveBrandIdState(nextActive.id);
          setStoredActiveBrandId(nextActive.id);
        }
      } catch {
        if (!cancelled) {
          setBrands([]);
          setActiveBrandIdState(null);
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
  }, [searchParams]);

  const setActiveBrandId = useCallback(
    (brandId: string) => {
      setActiveBrandIdState(brandId);
      setStoredActiveBrandId(brandId);

      if (pathname === "/campaigns") {
        const params = new URLSearchParams(searchParams.toString());
        params.set("brand", brandId);
        router.push(`/campaigns?${params.toString()}`);
        router.refresh();
        return;
      }

      router.refresh();
    },
    [pathname, router, searchParams],
  );

  const activeBrand = useMemo(
    () => pickActiveBrand(brands, activeBrandId),
    [activeBrandId, brands],
  );

  const value = useMemo(
    () => ({
      brands,
      activeBrand,
      loading,
      setActiveBrandId,
      refreshBrands,
    }),
    [activeBrand, brands, loading, refreshBrands, setActiveBrandId],
  );

  return (
    <ActiveBrandContext.Provider value={value}>
      {children}
    </ActiveBrandContext.Provider>
  );
}
