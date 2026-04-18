import { useMemo } from "react";

import { solarAltitude, qiblaDirection } from "@/lib/orbit/astronomy";
import { computeMoonData } from "@/lib/orbit/moon";
import {
  buildPrayerMarkers,
  buildPrayerTimes,
  nextPrayerInfo,
} from "@/lib/orbit/prayer";
import { formatTime, getDateInTimeZone, minuteDiff } from "@/lib/orbit/time";
import type { MadhabKey, MethodKey } from "@/lib/orbit/types";

export function useOrbitData(
  now: Date,
  selectedDate: Date,
  latitude: number,
  longitude: number,
  timeZone: string,
  method: MethodKey,
  madhab: MadhabKey
) {
  const todayInLocation = useMemo(() => getDateInTimeZone(now, timeZone), [now, timeZone]);
  const currentDay = useMemo(() => selectedDate, [selectedDate]);

  const prayers = useMemo(
    () => buildPrayerTimes(currentDay, latitude, longitude, method, madhab),
    [currentDay, latitude, longitude, method, madhab]
  );

  const todaysPrayers = useMemo(
    () => buildPrayerTimes(todayInLocation, latitude, longitude, method, madhab),
    [todayInLocation, latitude, longitude, method, madhab]
  );

  const moon = useMemo(() => computeMoonData(currentDay), [currentDay]);

  const prayerMarkers = useMemo(() => buildPrayerMarkers(prayers), [prayers]);
  const nextPrayer = useMemo(
    () => nextPrayerInfo(buildPrayerMarkers(todaysPrayers), now),
    [todaysPrayers, now]
  );

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
    todayInLocation,
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
