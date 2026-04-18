import { useMemo } from "react";
import type { MadhabKey, MethodKey } from "@/lib/orbit/types";
import { computeMoonData } from "@/lib/orbit/moon";
import { solarAltitude, qiblaDirection } from "@/lib/orbit/astronomy";
import { buildPrayerMarkers, buildPrayerTimes, nextPrayerInfo } from "@/lib/orbit/prayer";
import { formatTime, minuteDiff, startOfDay } from "@/lib/orbit/time";

export function useOrbitData(
  now: Date,
  latitude: number,
  longitude: number,
  method: MethodKey,
  madhab: MadhabKey
) {
  const currentDay = useMemo(() => startOfDay(now), [now]);

  const prayers = useMemo(
    () => buildPrayerTimes(currentDay, latitude, longitude, method, madhab),
    [currentDay, latitude, longitude, method, madhab]
  );

  const moon = useMemo(() => computeMoonData(currentDay), [currentDay]);

  const prayerMarkers = useMemo(() => buildPrayerMarkers(prayers), [prayers]);

  const nextPrayer = useMemo(() => nextPrayerInfo(prayerMarkers, now), [prayerMarkers, now]);

  const chartData = useMemo(() => {
    const rows: { time: number; altitude: number; daylight: number }[] = [];
    for (let m = 0; m <= 1440; m += 10) {
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
    const solarNoon = formatTime(prayers.dhuhr);

    return {
      daylightMinutes,
      fastingMinutes,
      nightMinutes,
      qibla,
      solarNoon,
    };
  }, [prayers, latitude, longitude]);

  const spacingData = useMemo(
    () => [
      { name: "Fajr → Sunrise", minutes: minuteDiff(prayers.sunrise, prayers.fajr) },
      { name: "Sunrise → Dhuhr", minutes: minuteDiff(prayers.dhuhr, prayers.sunrise) },
      { name: "Dhuhr → Asr", minutes: minuteDiff(prayers.asr, prayers.dhuhr) },
      { name: "Asr → Maghrib", minutes: minuteDiff(prayers.maghrib, prayers.asr) },
      { name: "Maghrib → Isha", minutes: minuteDiff(prayers.isha, prayers.maghrib) },
    ],
    [prayers]
  );

  return {
    currentDay,
    prayers,
    moon,
    prayerMarkers,
    nextPrayer,
    chartData,
    stats,
    spacingData,
  };
}