import BrandLogo from "@/app/components/brand-logo";
import MarketingApps from "@/app/components/marketing/marketing-apps";
import MarketingFeatures from "@/app/components/marketing/marketing-features";
import MarketingHeader from "@/app/components/marketing/marketing-header";
import MarketingHero from "@/app/components/marketing/marketing-hero";
import MarketingOutputs from "@/app/components/marketing/marketing-outputs";
import MarketingPricing from "@/app/components/marketing/marketing-pricing";
import MarketingPublish from "@/app/components/marketing/marketing-publish";
import MarketingSteps from "@/app/components/marketing/marketing-steps";
import Link from "next/link";
import {
  defaultDescription,
  getSiteUrl,
  siteName,
} from "@/utils/site-metadata";
import {
  getAppStoreUrl,
  getPlayStoreUrl,
} from "@/utils/app-store-links";

function buildLandingJsonLd() {
  const siteUrl = getSiteUrl();
  const appStoreUrl = getAppStoreUrl();
  const playStoreUrl = getPlayStoreUrl();

  const applications: Record<string, unknown>[] = [
    {
      "@type": "SoftwareApplication",
      name: siteName,
      description: defaultDescription,
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ];

  if (appStoreUrl) {
    applications.push({
      "@type": "SoftwareApplication",
      name: `${siteName} for iOS`,
      operatingSystem: "iOS",
      downloadUrl: appStoreUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
  }

  if (playStoreUrl) {
    applications.push({
      "@type": "SoftwareApplication",
      name: `${siteName} for Android`,
      operatingSystem: "Android",
      downloadUrl: playStoreUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteName,
        url: siteUrl,
        description: defaultDescription,
      },
      ...applications,
    ],
  };
}

export default function MarketingLanding() {
  const landingJsonLd = buildLandingJsonLd();

  return (
    <div className="min-h-full bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd) }}
      />

      <MarketingHeader />

      <main>
        <MarketingHero />
        <MarketingOutputs />
        <MarketingPublish />
        <MarketingFeatures />
        <MarketingSteps />
        <MarketingApps />
        <MarketingPricing />
      </main>

      <footer className="border-t border-border">
        <div className="page-shell py-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <BrandLogo href="/" />
            <p className="text-center text-xs text-muted-foreground sm:text-right">
              From URL to carousel, narration &amp; video — post where your
              audience is
              <br />
              <a
                href="mailto:hello@slidepress.co"
                className="underline-offset-2 hover:underline"
              >
                hello@slidepress.co
              </a>
            </p>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link
              href="/privacy"
              className="underline-offset-2 hover:underline"
            >
              Privacy
            </Link>
            {" · "}
            <Link href="/terms" className="underline-offset-2 hover:underline">
              Terms
            </Link>
            {" · "}
            <span>© {new Date().getFullYear()} SlidePress</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
