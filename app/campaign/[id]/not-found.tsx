import Link from "next/link";

export default function CampaignNotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-950 px-6 text-center text-zinc-50">
      <h1 className="text-2xl font-semibold">Campaign not found</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        This campaign doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-xl bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200"
      >
        Back to home
      </Link>
    </div>
  );
}
