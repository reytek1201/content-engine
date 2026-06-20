"use client";

import { useIsNativeApp } from "@/app/hooks/use-is-native-app";
import { hapticImpact } from "@/utils/haptics";
import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 120;

interface PullToRefreshProps {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
  className?: string;
}

export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
}: PullToRefreshProps) {
  const isNativeApp = useIsNativeApp();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const scrollParentRef = useRef<HTMLElement | null>(null);

  const enabled = isNativeApp === true;

  const findScrollParent = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return null;
    }

    let node: HTMLElement | null = target;
    while (node) {
      const style = window.getComputedStyle(node);
      const canScrollY =
        (style.overflowY === "auto" || style.overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight;

      if (canScrollY) {
        return node;
      }

      node = node.parentElement;
    }

    return document.scrollingElement instanceof HTMLElement
      ? document.scrollingElement
      : null;
  }, []);

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!enabled || isRefreshing) {
        return;
      }

      scrollParentRef.current = findScrollParent(event.target);
      const scrollTop = scrollParentRef.current?.scrollTop ?? window.scrollY;

      if (scrollTop > 0) {
        startYRef.current = null;
        return;
      }

      startYRef.current = event.touches[0]?.clientY ?? null;
    },
    [enabled, findScrollParent, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!enabled || startYRef.current === null || isRefreshing) {
        return;
      }

      const currentY = event.touches[0]?.clientY ?? startYRef.current;
      const delta = Math.max(0, currentY - startYRef.current);

      if (delta <= 0) {
        return;
      }

      setPullDistance(Math.min(delta, MAX_PULL_PX));
    },
    [enabled, isRefreshing],
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled || startYRef.current === null) {
      return;
    }

    const shouldRefresh = pullDistance >= PULL_THRESHOLD_PX;
    startYRef.current = null;
    setPullDistance(0);

    if (!shouldRefresh || isRefreshing) {
      return;
    }

    void hapticImpact("medium");
    setIsRefreshing(true);

    void (async () => {
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    })();
  }, [enabled, isRefreshing, onRefresh, pullDistance]);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  const progress = Math.min(pullDistance / PULL_THRESHOLD_PX, 1);

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: isRefreshing ? 44 : pullDistance * 0.6 }}
        aria-hidden
      >
        <span
          className={`text-xs font-medium text-muted-foreground transition ${
            isRefreshing ? "animate-pulse" : ""
          }`}
          style={{ opacity: isRefreshing ? 1 : progress }}
        >
          {isRefreshing ? "Refreshing…" : progress >= 1 ? "Release to refresh" : "Pull to refresh"}
        </span>
      </div>
      {children}
    </div>
  );
}
