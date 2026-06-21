import Link from "next/link";
import MarketingStoreBadges from "@/app/components/marketing/marketing-store-badges";
import { PhoneIcon } from "@/app/components/marketing/marketing-icons";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";
import { hasAnyStoreLink } from "@/utils/app-store-links";

export default function MarketingApps() {
  const storesLive = hasAnyStoreLink();

  return (
    <section id="download" className="page-shell scroll-mt-20 py-16 md:py-24">
      <div className="marketing-apps-panel">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <RevealOnScroll delay={0}>
            <div>
              <p className="brand-kicker">iPhone & Android</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Create on your phone. Save straight to Photos.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                The SlidePress app is the same experience you get on the web —
                optimized for thumbs. Save every slide, share your narration, or
                export a video MP4 without plugging into a computer.
              </p>

              <ul className="mt-6 space-y-2 text-sm text-secondary-foreground">
                <li>· Sign in with Google, Apple, or email</li>
                <li>· Save all slides to your camera roll in one tap</li>
                <li>· Share video exports via the system share sheet</li>
              </ul>

              <div className="mt-8">
                <MarketingStoreBadges layout="column" />
              </div>

              {!storesLive && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Apps launch soon on the App Store and Google Play. Use the web
                  app free in the meantime — your campaigns sync everywhere.
                </p>
              )}
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={120}>
            <div className="flex justify-center">
              <div className="marketing-apps-phone-ring">
                <div className="marketing-phone-frame marketing-phone-frame-large">
                  <div className="marketing-phone-notch" />
                  <div className="marketing-phone-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
                      <PhoneIcon className="h-7 w-7" />
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      SlidePress for mobile
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {storesLive
                        ? "Download now and start your first campaign."
                        : "Launching on iOS and Android soon."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>

        <RevealOnScroll delay={200}>
          <div className="mt-10 flex flex-col items-center gap-3 border-t border-border/60 pt-8 text-center sm:flex-row sm:justify-center">
            <Link href="/login" className="btn-primary w-full sm:w-auto">
              Start on the web
            </Link>
            <p className="text-xs text-muted-foreground">
              Same account on web, iPhone, and Android
            </p>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}
