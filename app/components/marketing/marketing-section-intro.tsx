import RevealOnScroll from "@/app/components/marketing/reveal-on-scroll";

type MarketingSectionIntroProps = {
  kicker: string;
  title: string;
  description: string;
  className?: string;
};

export default function MarketingSectionIntro({
  kicker,
  title,
  description,
  className = "mx-auto max-w-2xl text-center",
}: MarketingSectionIntroProps) {
  return (
    <div className={className}>
      <RevealOnScroll delay={0}>
        <p className="brand-kicker">{kicker}</p>
      </RevealOnScroll>
      <RevealOnScroll delay={80}>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
      </RevealOnScroll>
      <RevealOnScroll delay={160}>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </RevealOnScroll>
    </div>
  );
}
