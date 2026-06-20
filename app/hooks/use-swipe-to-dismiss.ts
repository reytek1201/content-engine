"use client";

import { hapticImpact } from "@/utils/haptics";
import { useCallback, useRef, useState, type PointerEvent } from "react";

const DISMISS_DRAG_PX = 80;
const DISMISS_VELOCITY_PX_MS = 0.5;

interface UseSwipeToDismissOptions {
  onDismiss: () => void;
  enabled?: boolean;
}

export function useSwipeToDismiss({
  onDismiss,
  enabled = true,
}: UseSwipeToDismissOptions) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragStartTimeRef = useRef(0);
  const lastDragYRef = useRef(0);

  const resetDrag = useCallback(() => {
    setDragY(0);
    setIsDragging(false);
    lastDragYRef.current = 0;
  }, []);

  const requestDismiss = useCallback(() => {
    void hapticImpact("light");
    onDismiss();
  }, [onDismiss]);

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
      requestDismiss();
      return;
    }

    setDragY(0);
    lastDragYRef.current = 0;
  }, [isDragging, requestDismiss]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragStartYRef.current = event.clientY;
      dragStartTimeRef.current = Date.now();
      lastDragYRef.current = 0;
      setIsDragging(true);
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!isDragging) {
        return;
      }

      const delta = Math.max(0, event.clientY - dragStartYRef.current);
      lastDragYRef.current = delta;
      setDragY(delta);
    },
    [isDragging],
  );

  const onPointerEnd = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      finishDrag();
    },
    [finishDrag],
  );

  const backdropOpacity = Math.max(0.2, 0.8 - dragY / 420);
  const panelStyle = {
    transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
    transition: isDragging
      ? "none"
      : "transform 280ms cubic-bezier(0.32, 0.72, 0, 1)",
  };

  return {
    dragY,
    isDragging,
    backdropOpacity,
    panelStyle,
    resetDrag,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
    onPointerCancel: onPointerEnd,
  };
}
