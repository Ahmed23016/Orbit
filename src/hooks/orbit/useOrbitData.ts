import { useMemo } from "react";

import { solarAltitude, qiblaDirection } from "@/lib/orbit/astronomy";
import { computeMoonData } from "@/lib/orbit/moon";
import { buildPrayerMarkers, buildPrayerTimes } from "@/lib/orbit/prayer";
import type { PrayerAdjustmentSettings } from "@/lib/orbit/settings";
import { formatTime, minuteDiff } from "@/lib/orbit/time";
import type { MadhabKey, MethodKey } from "@/lib/orbit/types";

export function useOrbitData(
  selectedDate: Date,
  latitude: number,
  longitude: number,
  timeZone: string,
  method: MethodKey,
  madhab: MadhabKey,
  adjustments?: PrayerAdjustmentSettings
) {
  const currentDay = useMemo(() => selectedDate, [selectedDate]);

  const prayers = useMemo(
    () => buildPrayerTimes(currentDay, latitude, longitude, method, madhab, adjustments),
    [currentDay, latitude, longitude, method, madhab, adjustments]
  );

  const moon = useMemo(() => computeMoonData(currentDay), [currentDay]);

  const prayerMarkers = useMemo(() => buildPrayerMarkers(prayers), [prayers]);

  const chartData = useMemo(() => {
    const rows: { time: number; altitude: number; daylight: number }[] = [];
    for (let m = 0; m <= 1440; m += 20) {
      const altitude = solarAltitude(currentDay, latitude, longitude, m);
      rows.push({
        time: m / 60,
        altitude,
        daylight: Math.max(altitude, 0),
      });
    }
    return rows;
  }, [currentDay, latitude, longitude]);

  const stats = useMemo(() => {
    const daylightMinutes = minuteDiff(prayers.maghrib, prayers.sunrise);
    const fastingMinutes = minuteDiff(prayers.maghrib, prayers.fajr);
    const nightMinutes = 1440 - daylightMinutes;
    const qibla = qiblaDirection(latitude, longitude);
    const solarNoon = formatTime(prayers.dhuhr, timeZone);

    return {
      daylightMinutes,
      fastingMinutes,
      nightMinutes,
      qibla,
      solarNoon,
    };
  }, [prayers, latitude, longitude, timeZone]);

  const spacingData = useMemo(
    () => [
      { name: "Fajr to Sunrise", minutes: minuteDiff(prayers.sunrise, prayers.fajr) },
      { name: "Sunrise to Dhuhr", minutes: minuteDiff(prayers.dhuhr, prayers.sunrise) },
      { name: "Dhuhr to Asr", minutes: minuteDiff(prayers.asr, prayers.dhuhr) },
      { name: "Asr to Maghrib", minutes: minuteDiff(prayers.maghrib, prayers.asr) },
      { name: "Maghrib to Isha", minutes: minuteDiff(prayers.isha, prayers.maghrib) },
    ],
    [prayers]
  );

  return {
    currentDay,
    prayers,
    moon,
    prayerMarkers,
    chartData,
    stats,
    spacingData,
  };
}
