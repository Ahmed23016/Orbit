import { Coordinates, Madhab, PrayerTimes } from "adhan";

import { calculationMethods } from "./constants";
import { formatDateLabel, getDateInTimeZone, minuteDiff, minutesSinceMidnight } from "./time";
import type {
  MadhabKey,
  MethodKey,
  PrayerMarker,
  PrayerSet,
  YearlyPrayerExtremes,
  YearlyPrayerRow,
} from "./types";

export function buildPrayerTimes(
  date: Date,
  latitude: number,
  longitude: number,
  method: MethodKey,
  madhab: MadhabKey
): PrayerSet {
  const coordinates = new Coordinates(latitude, longitude);
  const params = calculationMethods[method].build();
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  const prayerTimes = new PrayerTimes(coordinates, date, params);

  return {
    fajr: prayerTimes.fajr,
    sunrise: prayerTimes.sunrise,
    dhuhr: prayerTimes.dhuhr,
    asr: prayerTimes.asr,
    maghrib: prayerTimes.maghrib,
    isha: prayerTimes.isha,
  };
}

export function buildPrayerMarkers(prayers: PrayerSet): PrayerMarker[] {
  return [
    { label: "Fajr", value: prayers.fajr },
    { label: "Sunrise", value: prayers.sunrise },
    { label: "Dhuhr", value: prayers.dhuhr },
    { label: "Asr", value: prayers.asr },
    { label: "Maghrib", value: prayers.maghrib },
    { label: "Isha", value: prayers.isha },
  ];
}

export function nextPrayerInfo(prayers: PrayerMarker[], now: Date) {
  const upcoming = prayers.find((p) => p.value.getTime() > now.getTime());
  if (upcoming) return upcoming;
  return { label: "Fajr", value: new Date(prayers[0].value.getTime() + 86400000) };
}

export function buildYearlyPrayerSeries(
  year: number,
  latitude: number,
  longitude: number,
  timeZone: string,
  method: MethodKey,
  madhab: MadhabKey
): YearlyPrayerRow[] {
  const rows: YearlyPrayerRow[] = [];
  const cursor = new Date(year, 0, 1);

  while (cursor.getFullYear() === year) {
    const day = getDateInTimeZone(cursor, timeZone);
    const prayers = buildPrayerTimes(day, latitude, longitude, method, madhab);

    rows.push({
      date: day,
      dayOfYear: rows.length + 1,
      label: formatDateLabel(day, timeZone),
      fajrMinutes: minutesSinceMidnight(prayers.fajr, timeZone),
      sunriseMinutes: minutesSinceMidnight(prayers.sunrise, timeZone),
      dhuhrMinutes: minutesSinceMidnight(prayers.dhuhr, timeZone),
      asrMinutes: minutesSinceMidnight(prayers.asr, timeZone),
      maghribMinutes: minutesSinceMidnight(prayers.maghrib, timeZone),
      ishaMinutes: minutesSinceMidnight(prayers.isha, timeZone),
      fastingMinutes: minuteDiff(prayers.maghrib, prayers.fajr),
      daylightMinutes: minuteDiff(prayers.maghrib, prayers.sunrise),
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return rows;
}

export function getYearlyPrayerExtremes(rows: YearlyPrayerRow[]): YearlyPrayerExtremes | null {
  const [first] = rows;

  if (!first) {
    return null;
  }

  return rows.reduce<YearlyPrayerExtremes>(
    (acc, row) => ({
      earliestFajr:
        row.fajrMinutes < acc.earliestFajr.fajrMinutes ? row : acc.earliestFajr,
      latestFajr:
        row.fajrMinutes > acc.latestFajr.fajrMinutes ? row : acc.latestFajr,
      longestFast:
        row.fastingMinutes > acc.longestFast.fastingMinutes ? row : acc.longestFast,
      shortestFast:
        row.fastingMinutes < acc.shortestFast.fastingMinutes ? row : acc.shortestFast,
    }),
    {
      earliestFajr: first,
      latestFajr: first,
      longestFast: first,
      shortestFast: first,
    }
  );
}
