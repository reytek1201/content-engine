import CampaignList from "@/app/campaigns/campaign-list";
import NewCampaignButton from "@/app/components/new-campaign-button";
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

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("*, slides(slide_index, image_url)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const typedCampaigns = (campaigns ?? []) as CampaignWithSlides[];

  return (
    <div className="min-h-full bg-background text-foreground">
      <main className="page-main">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              My campaigns
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {typedCampaigns.length} campaign
              {typedCampaigns.length === 1 ? "" : "s"}
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
