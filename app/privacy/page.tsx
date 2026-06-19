import LegalPage from "@/app/components/legal-page";
import { buildMarketingMetadata, getSiteUrl } from "@/utils/site-metadata";
import { resolveLegalBackTarget } from "@/utils/legal-back-target";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...buildMarketingMetadata("/privacy"),
  title: "Privacy Policy",
};

const LAST_UPDATED = "June 19, 2026";
const CONTACT_EMAIL = "hello@slidepress.co";

interface PrivacyPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = await searchParams;
  const back = resolveLegalBackTarget(params.from);
  const siteUrl = getSiteUrl();

  return (
    <LegalPage
      title="Privacy Policy"
      lastUpdated={LAST_UPDATED}
      backHref={back.href}
      backLabel={back.label}
    >
      <p>
        SlidePress (&quot;we&quot;, &quot;us&quot;) operates the SlidePress web
        app and native iOS/Android apps at{" "}
        <a href={siteUrl} className="text-primary underline-offset-2 hover:underline">
          {siteUrl.replace(/^https?:\/\//, "")}
        </a>
        . This policy explains what we collect, why, and your choices.
      </p>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          What we collect
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Account information</strong> —
            email address and authentication data when you sign up or sign in
            (email/password, Google, or Apple). Managed by Supabase Auth.
          </li>
          <li>
            <strong className="text-foreground">Campaign content</strong> —
            topics, slide copy, voiceover scripts, generated images, platform
            captions, and reference images you upload for campaigns or your
            brand library.
          </li>
          <li>
            <strong className="text-foreground">Narration &amp; audio exports</strong>{" "}
            — when you use voice preview or export features, voiceover text is
            sent for text-to-speech synthesis. We store related usage metadata
            (for example, character counts) to enforce plan limits.
          </li>
          <li>
            <strong className="text-foreground">Usage data</strong> — campaign
            counts, slide regeneration counts, video and narration usage, and
            credit balances to enforce your plan limits.
          </li>
          <li>
            <strong className="text-foreground">Subscription &amp; billing</strong>{" "}
            — your plan tier, subscription status, and billing period dates. On
            the web, payments are processed by Stripe; we receive a customer ID
            and subscription status, not your full card number. In the native
            app, purchases are processed by Apple (iOS) or Google (Android) via
            in-app purchase; we receive purchase and entitlement status through
            RevenueCat. We do not store payment card or bank account details.
          </li>
          <li>
            <strong className="text-foreground">Connected social accounts (optional)</strong>{" "}
            — if you connect YouTube in Settings, we store OAuth tokens and
            your channel display name so SlidePress can upload videos to your
            channel on your behalf. We also record publish status (video id,
            URL, errors) per campaign.
          </li>
          <li>
            <strong className="text-foreground">Device tokens (optional)</strong>{" "}
            — if you use the native app and allow notifications, we store a
            push token to notify you when slide images finish generating.
          </li>
          <li>
            <strong className="text-foreground">Biometric unlock (optional)</strong>{" "}
            — if you enable Face ID / fingerprint unlock in the native app, your
            session refresh token is stored in the device Keychain or Android
            Keystore. Biometric data never leaves your device; we do not receive
            it.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          How we use your data
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>Provide and secure your account.</li>
          <li>
            Generate slide copy, images, captions, and AI voice narration you
            request.
          </li>
          <li>Enforce usage limits and improve reliability.</li>
          <li>
            Process subscriptions, apply plan entitlements, and manage billing
            status across web and mobile.
          </li>
          <li>
            Post campaign videos to YouTube Shorts when you connect a channel
            and choose to publish.
          </li>
          <li>Send optional push notifications in the native app.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Service providers
        </h2>
        <p className="mt-3">
          We use trusted processors to run SlidePress, including Supabase
          (database and auth), Vercel (hosting), Google Gemini (slide text),
          Fal.ai (image generation), ElevenLabs (text-to-speech / AI voice
          narration, when you use those features), Google YouTube Data API
          (when you connect YouTube and publish Shorts), Stripe (web subscriptions),
          RevenueCat (mobile subscription status), Apple App Store and Google
          Play (in-app purchases on native apps), and Firebase Cloud Messaging
          (push delivery, when enabled). Voiceover text is sent to ElevenLabs
          only when you preview or export narration. YouTube access is used only
          to read your channel name at connect time and to upload videos you
          explicitly publish. Processors handle data only to provide the service.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          YouTube connection &amp; publishing
        </h2>
        <p className="mt-3">
          If you connect a YouTube channel, SlidePress requests read access to
          show your channel name and upload access when you publish a Short.
          We store OAuth tokens securely on our servers (not in the mobile app)
          and use them only to upload videos you choose to publish from a
          campaign. We record publish metadata (status, YouTube video id and
          URL) in your account.
        </p>
        <p className="mt-3">
          SlidePress&apos;s use of information received from Google APIs
          adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-primary underline-offset-2 hover:underline"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p className="mt-3">
          You can disconnect YouTube anytime in Settings → Connected accounts.
          Disconnecting revokes our access tokens. Deleting your SlidePress
          account also revokes YouTube access and removes connection and publish
          records from our database. Videos already uploaded to YouTube remain
          on your channel until you remove them in YouTube Studio.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">
          Data retention & deletion
        </h2>
        <p className="mt-3">
          We keep your data while your account is active. You can delete your
          account anytime in Settings → Account → Account deletion. Deletion
          removes your campaigns, brand library, connected platform accounts,
          publish history, usage history, and sign-in access.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Your rights</h2>
        <p className="mt-3">
          Depending on where you live, you may have rights to access, correct,
          or delete your personal data. Contact us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          for requests.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Children</h2>
        <p className="mt-3">
          SlidePress is not directed at children under 13. We do not knowingly
          collect data from children.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Changes</h2>
        <p className="mt-3">
          We may update this policy. We will revise the date at the top when we
          do. Continued use after changes means you accept the updated policy.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-foreground">Contact</h2>
        <p className="mt-3">
          Questions about privacy:{" "}
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
