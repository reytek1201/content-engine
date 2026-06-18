import type { Brand, BrandProduct } from "@/types/brand";

export async function fetchBrands(): Promise<Brand[]> {
  const response = await fetch("/api/brands");
  const data = (await response.json()) as {
    success: boolean;
    brands?: Brand[];
    error?: string;
  };

  if (!response.ok || !data.success || !data.brands) {
    throw new Error(data.error ?? "Failed to load brands");
  }

  return data.brands;
}

export async function createBrand(name: string): Promise<Brand> {
  const response = await fetch("/api/brands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const data = (await response.json()) as {
    success: boolean;
    brand?: Brand;
    error?: string;
    code?: string;
  };

  if (!response.ok || !data.success || !data.brand) {
    throw new Error(data.error ?? "Failed to create brand");
  }

  return data.brand;
}

export async function fetchBrand(brandId: string): Promise<Brand | null> {
  const response = await fetch(`/api/brands/${brandId}`);
  const data = (await response.json()) as {
    success: boolean;
    brand?: Brand | null;
    error?: string;
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Failed to load brand");
  }

  return data.brand ?? null;
}

export async function updateBrand(
  brandId: string,
  payload: {
    name?: string;
    product?: string | null;
    style?: string | null;
    logo?: string | null;
    voice_notes?: string | null;
  },
): Promise<Brand> {
  const response = await fetch(`/api/brands/${brandId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    success: boolean;
    brand?: Brand;
    error?: string;
  };

  if (!response.ok || !data.success || !data.brand) {
    throw new Error(data.error ?? "Failed to update brand");
  }

  return data.brand;
}

export async function deleteBrand(brandId: string): Promise<void> {
  const response = await fetch(`/api/brands/${brandId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Failed to delete brand");
  }
}

export async function fetchBrandProducts(
  brandId: string,
): Promise<BrandProduct[]> {
  const response = await fetch(`/api/brands/${brandId}/products`);
  const data = (await response.json()) as {
    success: boolean;
    products?: BrandProduct[];
    error?: string;
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Failed to load products");
  }

  return data.products ?? [];
}

export async function createBrandProduct(
  brandId: string,
  payload: {
    name: string;
    product_reference_url?: string | null;
    description?: string | null;
  },
): Promise<BrandProduct> {
  const response = await fetch(`/api/brands/${brandId}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    success: boolean;
    product?: BrandProduct;
    error?: string;
  };

  if (!response.ok || !data.success || !data.product) {
    throw new Error(data.error ?? "Failed to create product");
  }

  return data.product;
}

export async function updateBrandProduct(
  brandId: string,
  productId: string,
  payload: {
    name?: string;
    product_reference_url?: string | null;
    description?: string | null;
  },
): Promise<BrandProduct> {
  const response = await fetch(
    `/api/brands/${brandId}/products/${productId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const data = (await response.json()) as {
    success: boolean;
    product?: BrandProduct;
    error?: string;
  };

  if (!response.ok || !data.success || !data.product) {
    throw new Error(data.error ?? "Failed to update product");
  }

  return data.product;
}

export async function deleteBrandProduct(
  brandId: string,
  productId: string,
): Promise<void> {
  const response = await fetch(
    `/api/brands/${brandId}/products/${productId}`,
    { method: "DELETE" },
  );

  if (!response.ok) {
    const data = (await response.json()) as { error?: string };
    throw new Error(data.error ?? "Failed to delete product");
  }
}
