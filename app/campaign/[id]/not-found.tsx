import Link from "next/link";

export default function CampaignNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background text-foreground">
      <main className="page-main text-center">
        <div className="page-content">
        <h1 className="text-2xl font-semibold">Campaign not found</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          This campaign doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link href="/campaigns" className="btn-primary mt-8">
          Back to campaigns
        </Link>
        </div>
      </main>
    </div>
  );
}
