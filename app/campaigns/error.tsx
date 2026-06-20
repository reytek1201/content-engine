"use client";

import { useEffect } from "react";

export default function CampaignsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm text-center">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Couldn&apos;t load your campaigns
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Something went wrong on our end. Try refreshing — your data is safe.
        </p>
        <button
          type="button"
          onClick={reset}
          className="btn-primary mt-6 px-8"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
