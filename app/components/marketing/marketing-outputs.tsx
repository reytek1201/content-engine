import {
  CarouselIcon,
  MicIcon,
  VideoIcon,
} from "@/app/components/marketing/marketing-icons";
import MarketingSectionAtmosphere from "@/app/components/marketing/marketing-section-atmosphere";
import MarketingSectionIntro from "@/app/components/marketing/marketing-section-intro";
import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";

const OUTPUTS = [
  {
    icon: CarouselIcon,
    title: "Carousel slides",
    format: "4:5 feed",
    description:
      "Download a zip of ready-to-post images with your headline on every slide. Add 9:16 later from the same campaign.",
  },
  {
    icon: MicIcon,
    title: "AI narration",
    format: "MP3 audio",
    description:
      "Hear your slides spoken aloud — preview the voice, then export per-slide or full read-through.",
  },
  {
    icon: VideoIcon,
    title: "Reel-ready video",
    format: "4:5 or 9:16",
    description:
      "One tap exports an MP4 with your slides and AI voiceover stitched in. Optional burned-in captions on Quick Reel.",
  },
] as const;

export default function MarketingOutputs() {
  return (
    <section className="relative overflow-hidden border-y border-border bg-card/20">
      <MarketingSectionAtmosphere />
      <div className="page-shell py-16 md:py-20">
        <MarketingSectionIntro
          kicker="One campaign, three ways to post"
          title="Carousel, narration, or video — you choose"
          description="Same topic, same workflow. Pick what fits the platform — or export all three without starting over."
        />

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {OUTPUTS.map((output, index) => (
            <RevealOnScroll key={output.title} delay={index * 80}>
              <div className="marketing-output-card group relative h-full">
                <span className="marketing-output-step" aria-hidden>
                  {index + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  <output.icon className="h-5 w-5" />
                </span>
                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  <h3 className="text-lg font-semibold text-foreground">
                    {output.title}
                  </h3>
                  <span className="rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {output.format}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {output.description}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
