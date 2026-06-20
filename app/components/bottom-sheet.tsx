"use client";

import { useNativeOverlay } from "@/app/contexts/native-overlay-context";
import { useKeyboardInset } from "@/app/hooks/use-keyboard-inset";
import { hapticImpact } from "@/utils/haptics";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

const DISMISS_DRAG_PX = 80;
const DISMISS_VELOCITY_PX_MS = 0.5;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  titleId: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  dismissDisabled?: boolean;
  /** Tailwind z-index utility, e.g. z-[60] */
  zIndexClass?: string;
  maxHeightClass?: string;
  /** Hide entirely on md+ breakpoints */
  mobileOnly?: boolean;
  /** Center as a modal on md+ instead of a bottom sheet */
  desktopModal?: boolean;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  titleId,
  description,
  children,
  footer,
  dismissDisabled = false,
  zIndexClass = "z-[60]",
  maxHeightClass = "max-h-[92vh]",
  mobileOnly = false,
  desktopModal = false,
}: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const lastDragYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset(open);

  const resetDrag = useCallback(() => {
    setDragY(0);
    setIsDragging(false);
    lastDragYRef.current = 0;
  }, []);

  const requestClose = useCallback(() => {
    if (dismissDisabled) {
      return;
    }
    void hapticImpact("light");
    onClose();
  }, [dismissDisabled, onClose]);

  useNativeOverlay(requestClose, open);

  useEffect(() => {
    if (!open) {
      resetDrag();
      return;
    }

    void hapticImpact("light");
  }, [open, resetDrag]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !dismissDisabled) {
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, dismissDisabled, requestClose]);

  const finishDrag = useCallback(() => {
    if (!isDragging) {
      return;
    }

    setIsDragging(false);
    const elapsedMs = Math.max(Date.now() - dragStartTimeRef.current, 1);
    const velocity = lastDragYRef.current / elapsedMs;

    if (
      lastDragYRef.current > DISMISS_DRAG_PX ||
      velocity > DISMISS_VELOCITY_PX_MS
    ) {
      requestClose();
      return;
    }

    setDragY(0);
    lastDragYRef.current = 0;
  }, [isDragging, requestClose]);

  function handleDragPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (dismissDisabled || event.button !== 0) {
      return;
    }

    // Desktop modal: swipe dismiss is mobile-only.
    if (desktopModal && window.matchMedia("(min-width: 768px)").matches) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartYRef.current = event.clientY;
    dragStartTimeRef.current = Date.now();
    lastDragYRef.current = 0;
    setIsDragging(true);
  }

  function handleDragPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isDragging) {
      return;
    }

    const delta = Math.max(0, event.clientY - dragStartYRef.current);
    lastDragYRef.current = delta;
    setDragY(delta);
  }

  function handleDragPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrag();
  }

  if (!open) {
    return null;
  }

  const backdropOpacity = Math.max(0.15, 0.6 - dragY / 420);
  const sheetTransform = dragY > 0 ? `translateY(${dragY}px)` : undefined;
  const sheetTransition = isDragging
    ? "none"
    : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)";

  const rootClass = [
    "fixed inset-0",
    zIndexClass,
    mobileOnly ? "md:hidden" : "",
    desktopModal ? "md:flex md:items-center md:justify-center md:p-8" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const backdropClass = desktopModal
    ? "absolute inset-0 transition-opacity duration-200"
    : "absolute inset-0 transition-opacity duration-200";

  const panelClass = [
    "absolute inset-x-0 bottom-0 flex flex-col rounded-t-2xl border-t border-border bg-card shadow-2xl",
    maxHeightClass,
    desktopModal
      ? "md:relative md:max-h-[min(85vh,600px)] md:w-full md:max-w-md md:rounded-2xl md:border"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="presentation">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={requestClose}
        disabled={dismissDisabled}
        className={backdropClass}
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={panelClass}
        style={{
          transform: sheetTransform,
          transition: sheetTransition,
          paddingBottom:
            keyboardInset > 0
              ? keyboardInset
              : footer
                ? undefined
                : "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          className={`flex shrink-0 flex-col border-b border-border px-4 pb-3 pt-3 md:px-6 md:pt-5 ${
            desktopModal ? "md:border-b" : ""
          }`}
          onPointerDown={handleDragPointerDown}
          onPointerMove={handleDragPointerMove}
          onPointerUp={handleDragPointerEnd}
          onPointerCancel={handleDragPointerEnd}
          style={{ touchAction: "none" }}
        >
          <div
            className={`mb-3 h-1 w-10 self-center rounded-full bg-border ${
              desktopModal ? "md:hidden" : ""
            }`}
            aria-hidden
          />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-base font-semibold text-foreground md:text-lg"
              >
                {title}
              </h2>
              {description ? (
                <p className="mt-1 text-xs leading-5 text-muted-foreground md:mt-0.5 md:text-sm">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={requestClose}
              onPointerDown={(event) => event.stopPropagation()}
              disabled={dismissDisabled}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground active:bg-secondary/60 disabled:opacity-60 md:px-3 md:py-2 md:text-sm"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6">
          {children}
        </div>

        {footer ? (
          <div
            className="shrink-0 border-t border-border px-4 py-4 md:px-6 md:pb-5"
            style={{
              paddingBottom:
                keyboardInset > 0
                  ? `calc(1rem + ${keyboardInset}px)`
                  : "calc(1rem + env(safe-area-inset-bottom, 0px))",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
