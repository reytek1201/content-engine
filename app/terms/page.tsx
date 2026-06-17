import LegalPage from "@/app/components/legal-page";
import { buildMarketingMetadata, getSiteUrl } from "@/utils/site-metadata";
import { resolveLegalBackTarget } from "@/utils/legal-back-target";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...buildMarketingMetadata("/terms"),
  title: "Terms of Service",
};

const LAST_UPDATED = "June 17, 2026";
const CONTACT_EMAIL = "hello@slidepress.co";

interface TermsPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function TermsPage({ searchParams }: TermsPageProps) {
  const params = await searchParams;
  const back = resolveLegalBackTarget(params.from);
  const siteUrl = getSiteUrl();

  return (
    <LegalPage
      title="Terms of Service"
      lastUpdated={LAST_UPDATED}
      backHref={back.href}
      backLabel={back.label}
    >
      <p>
        These terms govern your use of SlidePress at{" "}
        <a href={siteUrl} className="text-primary underline-offset-2 hover:underline">
          {siteUrl.replace(/^https?:\/\//, "")}
        </a>{" "}
        and our iOS/Android apps. By using SlidePress, you agree to these terms.
      </p>

      <section>
        <h2 className="text-base font-semibold text-foreground">The service</h2>
        <p className="mt-3">
          SlidePress helps you create carousel campaigns with AI-generated slide
          copy, images, platform captions, and AI voice narration and video
          export where available. Features and limits may change during beta.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Your account</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>You are responsible for activity under your account.</li>
          <li>Keep your sign-in credentials secure.</li>
          <li>You must provide accurate account information.</li>
          <li>You may delete your account at any time in Settings.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Acceptable use
        </h2>
        <p className="mt-3">You agree not to:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Use SlidePress for illegal, harmful, or abusive content.</li>
          <li>Attempt to bypass usage limits or access others&apos; data.</li>
          <li>Reverse engineer or disrupt the service.</li>
          <li>Upload content you do not have rights to use.</li>
          <li>
            Use AI narration to impersonate real people without consent or to
            create deceptive synthetic media.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          AI-generated content
        </h2>
        <p className="mt-3">
          SlidePress uses third-party AI services to generate text, images, and
          synthetic voice audio. AI voices are not human recordings. You are
          responsible for reviewing all outputs before publishing, including any
          platform or legal disclosure required for AI-generated or synthetic
          content. We do not guarantee accuracy, originality, or fitness for a
          particular purpose.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Beta & availability
        </h2>
        <p className="mt-3">
          SlidePress is in beta. The service may be unavailable, change without
          notice, or include bugs. We provide the service &quot;as is&quot; to
          the extent permitted by law.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Limitation of liability
        </h2>
        <p className="mt-3">
          To the maximum extent permitted by law, SlidePress is not liable for
          indirect, incidental, or consequential damages arising from your use of
          the service.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p className="mt-3">
          Questions about these terms:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </section>
    </LegalPage>
  );
}
