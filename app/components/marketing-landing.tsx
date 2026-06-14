import Link from "next/link";

const FEATURES = [
  {
    title: "Slide copy",
    description:
      "Gemini drafts headlines, voiceover, and image prompts from your topic.",
  },
  {
    title: "AI visuals",
    description:
      "Fal generates on-brand carousel images with text baked into each slide.",
  },
  {
    title: "Platform captions",
    description:
      "TikTok, Instagram, and YouTube Shorts copy — hooks, hashtags, and titles.",
  },
  {
    title: "Export ready",
    description:
      "Download a zip of slides plus captions.txt, or grab images one at a time.",
  },
] as const;

const STEPS = [
  "Enter a topic",
  "Generate slides & images",
  "Copy captions or download zip",
  "Post to social",
] as const;

export default function MarketingLanding() {
  return (
    <div className="min-h-full bg-background text-foreground">
      <header className="page-shell flex items-center justify-between py-5 md:py-6">
        <Link
          href="/"
          className="flex items-center gap-2 transition hover:opacity-90"
        >
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          <span className="text-sm font-semibold tracking-tight">SlidePress</span>
        </Link>
        <Link
          href="/login"
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <main>
        <section className="page-shell pb-16 pt-8 md:pb-24 md:pt-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="brand-kicker">Carousel content in minutes</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Turn a topic into post-ready slides
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              SlidePress writes your carousel copy, generates AI slide images with
              headlines, and drafts platform captions — so you can ship organic
              social content without juggling five tools.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/login" className="btn-primary w-full sm:w-auto">
                Get started free
              </Link>
              <Link
                href="/login"
                className="btn-secondary w-full sm:w-auto"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/20">
          <div className="page-shell py-14 md:py-16">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              What you get
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-card/40 p-5 sm:p-6"
                >
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-shell py-14 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Idea to publish in four steps
            </h2>
            <ol className="mt-8 space-y-4 text-left">
              {STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex items-start gap-4 rounded-xl border border-border bg-card/30 px-4 py-3 sm:px-5 sm:py-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span className="pt-1 text-sm font-medium text-secondary-foreground sm:text-base">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <Link href="/login" className="btn-primary mt-10 inline-flex">
              Start your first campaign
            </Link>
          </div>
        </section>

        <footer className="border-t border-border">
          <div className="page-shell py-8 text-center text-xs text-muted-foreground">
            <p>SlidePress — slidepress.co</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
