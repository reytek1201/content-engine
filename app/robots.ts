import { getSiteUrl } from "@/utils/site-metadata";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/login",
        "/campaigns",
        "/new",
        "/settings",
        "/campaign/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
