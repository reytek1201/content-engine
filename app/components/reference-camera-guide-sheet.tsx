"use client";

import BottomSheet from "@/app/components/bottom-sheet";
import type { ReferenceType } from "@/types/references";

const GUIDE_CONTENT: Record<
  ReferenceType,
  { title: string; tips: string[]; showFrame: boolean }
> = {
  product: {
    title: "Product photo tips",
    showFrame: true,
    tips: [
      "Centre your product in the frame",
      "Use a plain background and good light",
      "Keep labels readable and in focus",
    ],
  },
  style: {
    title: "Style reference tips",
    showFrame: false,
    tips: [
      "Photograph a feed post, ad, or mood board you like",
      "Match the energy you want for your slides",
    ],
  },
  logo: {
    title: "Logo photo tips",
    showFrame: false,
    tips: [
      "Try your packaging, signage, or a business card",
      "Get close so the mark stays sharp",
    ],
  },
};

interface ReferenceCameraGuideSheetProps {
  slotType: ReferenceType;
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export default function ReferenceCameraGuideSheet({
  slotType,
  open,
  onClose,
  onContinue,
}: ReferenceCameraGuideSheetProps) {
  const guide = GUIDE_CONTENT[slotType];

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={guide.title}
      titleId="reference-camera-guide-title"
      zIndexClass="z-[70]"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition hover:border-ring/60 active:scale-[0.97]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="btn-primary min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Open camera
          </button>
        </div>
      }
    >
      {guide.showFrame && (
        <div
          className="relative mx-auto aspect-square w-full max-w-[220px] rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5"
          aria-hidden
        >
          <div className="absolute inset-4 rounded-xl border border-primary/25" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-lg border border-primary/30 bg-primary/10" />
          </div>
          <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] font-medium uppercase tracking-wide text-primary/80">
            Centre product here
          </p>
        </div>
      )}

      <ul className={`space-y-2 ${guide.showFrame ? "mt-5" : ""}`}>
        {guide.tips.map((tip) => (
          <li
            key={tip}
            className="flex gap-2 text-sm leading-6 text-muted-foreground"
          >
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}
