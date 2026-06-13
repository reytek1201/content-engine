import CampaignList from "@/app/campaigns/campaign-list";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Campaign } from "@/types/campaign";

interface CampaignWithSlides extends Campaign {
  slides: Array<{ slide_index: number; image_url: string | null }>;
}

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
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
      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              ← New campaign
            </Link>
            <div className="mt-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <p className="brand-kicker">SlidePress</p>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              My campaigns
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {typedCampaigns.length} campaign
              {typedCampaigns.length === 1 ? "" : "s"}
            </p>
          </div>

          <Link
            href="/"
            className="btn-primary"
          >
            New campaign
          </Link>
        </div>

        {typedCampaigns.length === 0 ? (
          <section className="mt-12 rounded-2xl border border-border bg-card/50 p-10 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              No campaigns yet
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Create your first campaign to generate slides, copy, and images.
            </p>
            <Link
              href="/"
              className="btn-primary mt-6"
            >
              Create campaign
            </Link>
          </section>
        ) : (
          <CampaignList campaigns={typedCampaigns} />
        )}
      </main>
    </div>
  );
}
