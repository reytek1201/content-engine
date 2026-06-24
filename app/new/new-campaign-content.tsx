"use client";

import CreateCampaignForm from "@/app/components/create-campaign-form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";

interface NewCampaignContentProps {
  user: User;
}

export default function NewCampaignContent({ user }: NewCampaignContentProps) {
  const router = useRouter();

  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (isMobile) {
      router.replace("/campaigns");
    }
  }, [router]);

  return (
    <div className="hidden min-h-full bg-background text-foreground md:block">
      <main className="page-main flex min-h-full flex-col">
        <div className="page-content">
          <header className="mb-12">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              <p className="brand-kicker">SlidePress</p>
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
              Generate your next campaign
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Paste your website for topic ideas, or enter a marketing pain
              point manually. We&apos;ll draft slide scripts with overlays,
              voiceover, and image prompts.
            </p>
          </header>

          <CreateCampaignForm user={user} idPrefix="page-" />
        </div>
      </main>
    </div>
  );
}
