import BrandLibraryEditor from "@/app/components/brand-library-editor";
import { AddBrandBanner } from "@/app/components/add-brand-link";
import SettingsSubpageShell from "@/app/settings/settings-subpage-shell";
import {
  parseBrandsBackFrom,
  resolveBrandDetailBackTarget,
} from "@/utils/brands-back-target";
import { listUserBrands } from "@/utils/brands-server";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand",
  robots: appRobots,
};

interface BrandDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; brand?: string }>;
}

export default async function BrandDetailPage({
  params,
  searchParams,
}: BrandDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const brands = await listUserBrands(supabase, user.id);
  const brand = brands.find((entry) => entry.id === id);

  if (!brand) {
    notFound();
  }

  const from = parseBrandsBackFrom(query.from);
  const back = resolveBrandDetailBackTarget(query.from, query.brand ?? id);

  return (
    <SettingsSubpageShell
      title={brand.name}
      description="Reference images and products for this brand."
      backHref={back.href}
      backLabel={back.label}
    >
      <AddBrandBanner from={from} brandId={query.brand ?? id} />
      <BrandLibraryEditor user={user} brandId={brand.id} hideBrandName />
    </SettingsSubpageShell>
  );
}
