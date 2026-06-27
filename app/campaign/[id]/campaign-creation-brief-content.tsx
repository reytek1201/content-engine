"use client";

import { hasReferences } from "@/types/references";

interface CampaignCreationBriefContentProps {
  topic: string;
  sourceUrl?: string | null;
  productReferenceUrl?: string | null;
  styleReferenceUrl?: string | null;
  logoReferenceUrl?: string | null;
}

function ReferenceImage({
  label,
  url,
  alt,
}: {
  label: string;
  url: string;
  alt: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
        {label}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="mt-3 max-h-36 w-full rounded-md object-contain"
      />
    </div>
  );
}

export default function CampaignCreationBriefContent({
  topic,
  sourceUrl,
  productReferenceUrl,
  styleReferenceUrl,
  logoReferenceUrl,
}: CampaignCreationBriefContentProps) {
  const references = {
    product: productReferenceUrl,
    style: styleReferenceUrl,
    logo: logoReferenceUrl,
  };

  const showReferences = hasReferences(references);

  return (
    <div className="space-y-4">
      {sourceUrl ? (
        <div className="rounded-lg border border-border bg-card/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Source website
          </p>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block break-all text-sm leading-6 text-primary hover:underline"
          >
            {sourceUrl}
          </a>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card/40 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Topic
        </p>
        <p className="mt-2 text-sm leading-6 text-secondary-foreground">
          {topic}
        </p>
      </div>

      {showReferences ? (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reference images
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {productReferenceUrl ? (
              <ReferenceImage
                label="Product"
                url={productReferenceUrl}
                alt="Product reference"
              />
            ) : null}
            {styleReferenceUrl ? (
              <ReferenceImage
                label="Style"
                url={styleReferenceUrl}
                alt="Style reference"
              />
            ) : null}
            {logoReferenceUrl ? (
              <ReferenceImage
                label="Logo"
                url={logoReferenceUrl}
                alt="Logo reference"
              />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">
          No reference images were uploaded for this campaign.
        </p>
      )}
    </div>
  );
}
