import BrandLibraryEditor from "@/app/components/brand-library-editor";
import SettingsSubpageShell from "@/app/settings/settings-subpage-shell";
import { listUserBrands } from "@/utils/brands-server";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand kit",
  robots: appRobots,
};

interface BrandSettingsPageProps {
  searchParams: Promise<{ brand?: string }>;
}

export default async function BrandSettingsPage({
  searchParams,
}: BrandSettingsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { brand: brandParam } = await searchParams;
  const brands = await listUserBrands(supabase, user.id);
  const activeBrand =
    brands.find((brand) => brand.id === brandParam) ??
    brands.find((brand) => brand.is_default) ??
    brands[0] ??
    null;

  return (
    <SettingsSubpageShell
      title="Brand kit"
      description="Reference images used across your campaigns."
    >
      <BrandLibraryEditor user={user} brandId={activeBrand?.id} />
    </SettingsSubpageShell>
  );
}
