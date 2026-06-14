import MarketingLanding from "@/app/components/marketing-landing";
import { createClient } from "@/utils/supabase/server";
import { buildMarketingMetadata } from "@/utils/site-metadata";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = buildMarketingMetadata("/");

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/campaigns");
  }

  return <MarketingLanding />;
}
