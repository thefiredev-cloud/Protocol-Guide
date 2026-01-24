/**
 * React Hooks for Analytics
 *
 * Convenience hooks for tracking screens, time, and scroll depth.
 */

import { useEffect, useRef } from "react";
import { analytics } from "./index";

/**
 * Hook for tracking screen views automatically
 */
export function useScreenTracking(screenName: string): void {
  useEffect(() => {
    analytics.screen(screenName);
  }, [screenName]);
}

/**
 * Hook for tracking time spent on a screen/protocol
 */
export function useTimeTracking(
  protocolId: number | null,
  onComplete?: (timeSeconds: number) => void
): void {
  const startTime = useRef<number>(Date.now());

  useEffect(() => {
    startTime.current = Date.now();

    return () => {
      if (protocolId) {
        const timeSpent = Math.floor((Date.now() - startTime.current) / 1000);
        if (timeSpent > 1 && onComplete) {
          onComplete(timeSpent);
        }
      }
    };
  }, [protocolId, onComplete]);
}

/**
 * Hook for tracking scroll depth
 */
export function useScrollTracking(protocolId: number | null): {
  onScroll: (scrollY: number, contentHeight: number, viewportHeight: number) => void;
  getMaxScrollDepth: () => number;
} {
  const maxScrollDepth = useRef<number>(0);

  const onScroll = (scrollY: number, contentHeight: number, viewportHeight: number): void => {
    if (contentHeight <= viewportHeight) {
      maxScrollDepth.current = 1;
      return;
    }

    const depth = scrollY / (contentHeight - viewportHeight);
    maxScrollDepth.current = Math.max(maxScrollDepth.current, Math.min(1, depth));
  };

  const getMaxScrollDepth = (): number => maxScrollDepth.current;

  return { onScroll, getMaxScrollDepth };
}
