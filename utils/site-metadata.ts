import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://www.slidepress.co";

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_SITE_URL;
  return configured.replace(/\/$/, "");
}

export const siteName = "SlidePress";

export const brandLogoSrc = "/brand/logo.png";

export const brandLogoPath = "public/brand/logo.png";

export const defaultDescription =
  "Turn a topic into carousel slide copy, AI-generated images, and platform captions in minutes.";

export const defaultTitle =
  "SlidePress — Topic to post-ready carousel slides";

/** App routes — keep out of search indexes. */
export const appRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
};

export function buildOpenGraphMetadata(options: {
  title: string;
  description: string;
  path?: string;
}): Metadata["openGraph"] {
  const siteUrl = getSiteUrl();
  const url = options.path ? `${siteUrl}${options.path}` : siteUrl;

  return {
    type: "website",
    locale: "en_US",
    url,
    siteName,
    title: options.title,
    description: options.description,
  };
}

export function buildTwitterMetadata(options: {
  title: string;
  description: string;
}): Metadata["twitter"] {
  return {
    card: "summary_large_image",
    title: options.title,
    description: options.description,
  };
}

export function buildMarketingMetadata(path = "/"): Metadata {
  const title = defaultTitle;
  const description = defaultDescription;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: buildOpenGraphMetadata({ title, description, path }),
    twitter: buildTwitterMetadata({ title, description }),
  };
}
