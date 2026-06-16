import CampaignList from "@/app/campaigns/campaign-list";
import BrandSwitcher from "@/app/components/brand-switcher";
import NewCampaignButton from "@/app/components/new-campaign-button";
import { listUserBrands } from "@/utils/brands-server";
import { createClient } from "@/utils/supabase/server";
import { appRobots } from "@/utils/site-metadata";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Campaign } from "@/types/campaign";

export const metadata: Metadata = {
  title: "Campaigns",
  robots: appRobots,
};

interface CampaignWithSlides extends Campaign {
  slides: Array<{ slide_index: number; image_url: string | null }>;
}

interface CampaignsPageProps {
  searchParams: Promise<{ brand?: string }>;
}

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
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

  let campaignsQuery = supabase
    .from("campaigns")
    .select(
      "id, title, topic, aspect_ratio, slide_count, status, created_at, brand_id, slides(slide_index, image_url)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (activeBrand) {
    campaignsQuery = campaignsQuery.eq("brand_id", activeBrand.id);
  }

  const { data: campaigns, error } = await campaignsQuery;

  if (error) {
    throw new Error(error.message);
  }

  const typedCampaigns = (campaigns ?? []) as CampaignWithSlides[];

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="page-main">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {activeBrand ? activeBrand.name : "My campaigns"}
              </h1>
              <BrandSwitcher />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {typedCampaigns.length} campaign
              {typedCampaigns.length === 1 ? "" : "s"}
              {activeBrand && brands.length > 1
                ? ` in ${activeBrand.name}`
                : ""}
            </p>
          </div>

          <NewCampaignButton />
        </div>

        {typedCampaigns.length === 0 ? (
          <section className="mt-12 rounded-2xl border border-border bg-card/50 p-10 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              No campaigns yet
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create your first campaign to generate slides, copy, and images.
            </p>
            <NewCampaignButton className="mt-6" label="Create campaign" />
          </section>
        ) : (
          <CampaignList campaigns={typedCampaigns} />
        )}
      </main>
    </div>
  );
}
