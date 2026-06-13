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
    <div className="min-h-full bg-zinc-950 text-zinc-50">
      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-zinc-400 transition hover:text-zinc-50"
            >
              ← New campaign
            </Link>
            <p className="mt-6 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
              Content Engine
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              My campaigns
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {typedCampaigns.length} campaign
              {typedCampaigns.length === 1 ? "" : "s"}
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
          >
            New campaign
          </Link>
        </div>

        {typedCampaigns.length === 0 ? (
          <section className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
            <h2 className="text-xl font-semibold text-zinc-50">
              No campaigns yet
            </h2>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Create your first campaign to generate slides, copy, and images.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
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
