import MarketingLanding from "@/app/components/marketing-landing";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SlidePress — Topic to post-ready carousel slides",
  description:
    "Turn a topic into carousel slide copy, AI-generated images, and platform captions in minutes.",
};

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
