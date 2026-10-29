import { useMemo } from "react";

import { getUpcomingEvents } from "@/lib/orbit/events";
import type { HijriMethodKey } from "@/lib/orbit/types";

/**
 * The next Islamic occasion after `todayKey` ("YYYY-M-D"). The search walks the calendar a
 * day at a time, so it's memoised per day rather than recomputed on every tick.
 */
export function useNextOccasion(todayKey: string, hijriMethod: HijriMethodKey, hijriAdjustment: number) {
  return useMemo(() => {
    const [year, month, date] = todayKey.split("-").map(Number);
    return getUpcomingEvents(new Date(year, month - 1, date + 1, 12), hijriMethod, hijriAdjustment, 1)[0];
  }, [todayKey, hijriMethod, hijriAdjustment]);
}
