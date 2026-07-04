"use client";

import { useMemo } from "react";
import { DeviceInfo } from "./useTelegram";

export type PerformanceClass = "high" | "medium" | "low";

export interface PerformanceFlags {
  /** The resolved performance tier (null → treated as medium) */
  performanceClass: PerformanceClass;
  /** Whether framer-motion animations should run */
  enableAnimations: boolean;
  /** Whether shimmer skeleton loading animations should run */
  enableShimmer: boolean;
  /** Whether the dark-mode mesh background gradient should render */
  enableBackgroundGradient: boolean;
  /** Whether CSS will-change: transform should be applied to cards */
  enableWillChange: boolean;
  /** How many jobs to load per page */
  pageSize: number;
}

/**
 * Derives concrete UI feature flags from Telegram's device performanceClass.
 *
 * | Flag                    | high | medium | low |
 * |-------------------------|------|--------|-----|
 * | enableAnimations        |  ✅  |   ✅   |  ❌  |
 * | enableShimmer           |  ✅  |   ✅   |  ❌  |
 * | enableBackgroundGradient|  ✅  |   ❌   |  ❌  |
 * | enableWillChange        |  ✅  |   ✅   |  ❌  |
 * | pageSize                |  20  |   15   |  10 |
 */
export function usePerformance(deviceInfo: DeviceInfo): PerformanceFlags {
  return useMemo(() => {
    // null means older SDK — fall back to medium to be safe
    const pc: PerformanceClass = deviceInfo.performanceClass ?? "medium";

    return {
      performanceClass: pc,
      enableAnimations: pc !== "low",
      enableShimmer: pc !== "low",
      enableBackgroundGradient: pc === "high",
      enableWillChange: pc !== "low",
      pageSize: pc === "high" ? 20 : pc === "medium" ? 15 : 10,
    };
  }, [deviceInfo.performanceClass]);
}
