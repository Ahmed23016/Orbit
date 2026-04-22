import { useMemo } from "react";

import { buildPrayerMarkers, buildPrayerTimes, nextPrayerInfo } from "@/lib/orbit/prayer";
import { getTimeZoneParts } from "@/lib/orbit/time";
import type { MadhabKey, MethodKey } from "@/lib/orbit/types";

import { useNow } from "./useNow";

export function useLivePrayerStatus(
  latitude: number,
  longitude: number,
  timeZone: string,
  method: MethodKey,
  madhab: MadhabKey,
  intervalMs = 1000
) {
  const now = useNow(intervalMs);
  const nowParts = useMemo(() => getTimeZoneParts(now, timeZone), [now, timeZone]);
  const { year, month, day } = nowParts;

  const currentDay = useMemo(
    () => new Date(year, month - 1, day, 12, 0, 0),
    [year, month, day]
  );

  const prayers = useMemo(
    () => buildPrayerTimes(currentDay, latitude, longitude, method, madhab),
    [currentDay, latitude, longitude, method, madhab]
  );

  const prayerMarkers = useMemo(() => buildPrayerMarkers(prayers), [prayers]);
  const nextPrayer = useMemo(() => nextPrayerInfo(prayerMarkers, now), [prayerMarkers, now]);

  return {
    now,
    currentDay,
    prayers,
    prayerMarkers,
    nextPrayer,
  };
}
