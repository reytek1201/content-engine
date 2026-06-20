"use client";

import { hapticImpact } from "@/utils/haptics";
import { useCallback, useRef, type TouchEvent } from "react";

const DEFAULT_THRESHOLD_PX = 48;
const AXIS_LOCK_PX = 12;

interface UseHorizontalSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onBlockedLeft?: () => void;
  onBlockedRight?: () => void;
  thresholdPx?: number;
  enabled?: boolean;
}

export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  onBlockedLeft,
  onBlockedRight,
  thresholdPx = DEFAULT_THRESHOLD_PX,
  enabled = true,
}: UseHorizontalSwipeOptions) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const axisRef = useRef<"horizontal" | "vertical" | null>(null);
  const swipeOccurredRef = useRef(false);

  const resetTouch = useCallback(() => {
    touchStartRef.current = null;
    axisRef.current = null;
  }, []);

  const onTouchStart = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!enabled) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      swipeOccurredRef.current = false;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      axisRef.current = null;
    },
    [enabled],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!enabled || !touchStartRef.current) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      if (
        axisRef.current === null &&
        (Math.abs(deltaX) >= AXIS_LOCK_PX || Math.abs(deltaY) >= AXIS_LOCK_PX)
      ) {
        axisRef.current =
          Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      }
    },
    [enabled],
  );

  const onTouchEnd = useCallback(
    (event: TouchEvent<HTMLElement>) => {
      if (!enabled || !touchStartRef.current) {
        resetTouch();
        return;
      }

      if (axisRef.current === "vertical") {
        resetTouch();
        return;
      }

      const touch = event.changedTouches[0];
      const endX = touch?.clientX ?? touchStartRef.current.x;
      const deltaX = endX - touchStartRef.current.x;
      resetTouch();

      if (Math.abs(deltaX) < thresholdPx) {
        return;
      }

      swipeOccurredRef.current = true;

      if (deltaX < 0) {
        if (onSwipeLeft) {
          onSwipeLeft();
        } else {
          void hapticImpact("light");
          onBlockedLeft?.();
        }
        return;
      }

      if (onSwipeRight) {
        onSwipeRight();
      } else {
        void hapticImpact("light");
        onBlockedRight?.();
      }
    },
    [
      enabled,
      onBlockedLeft,
      onBlockedRight,
      onSwipeLeft,
      onSwipeRight,
      resetTouch,
      thresholdPx,
    ],
  );

  const consumeSwipeTap = useCallback(() => {
    if (!swipeOccurredRef.current) {
      return false;
    }

    swipeOccurredRef.current = false;
    return true;
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    consumeSwipeTap,
  };
}
