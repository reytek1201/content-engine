import BrandsManager from "@/app/components/brands-manager";
import SettingsSubpageShell from "@/app/settings/settings-subpage-shell";
import { resolveBrandsListBackTarget } from "@/utils/brands-back-target";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brands",
  robots: appRobots,
};

interface BrandsSettingsPageProps {
  searchParams: Promise<{ from?: string; brand?: string }>;
}

export default async function BrandsSettingsPage({
  searchParams,
}: BrandsSettingsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const back = resolveBrandsListBackTarget(params.from, params.brand);

  return (
    <SettingsSubpageShell
      title="Brands"
      description="Each brand has its own reference images, products, and campaigns."
      backHref={back.href}
      backLabel={back.label}
    >
      <BrandsManager />
    </SettingsSubpageShell>
  );
}
