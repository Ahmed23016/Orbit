import { nextMoonPhase } from "./celestial.ts";
import { computeMoonData } from "./moon.ts";
import { getNightTimes, shiftDay, type PrayerCalculator, type PrayerKey } from "./schedule.ts";
import { minuteDiff } from "./time.ts";

const MINUTE = 60000;

function offset(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * MINUTE);
}

export type TimeRange = { start: Date; end: Date };

/** When each prayer's time ends (Isha's preferred end is Islamic midnight). */
export function getPrayerWindows(day: Date, calc: PrayerCalculator): Record<PrayerKey, Date> {
  const times = calc(day);
  const { midnight } = getNightTimes(day, calc);

  return {
    fajr: times.sunrise,
    sunrise: offset(times.sunrise, 15),
    dhuhr: times.asr,
    asr: times.maghrib,
    maghrib: times.isha,
    isha: midnight,
  };
}

/**
 * Voluntary prayer windows and the three times prayer is disliked,
 * using the common 15-minute (sunrise/sunset) and 10-minute (zenith) margins.
 */
export function getSunnahTimes(day: Date, calc: PrayerCalculator) {
  const times = calc(day);
  const { lastThird } = getNightTimes(day, calc);
  const nextFajr = calc(shiftDay(day, 1)).fajr;
  const duhaStart = offset(times.sunrise, 15);
  const duhaEnd = offset(times.dhuhr, -10);

  return {
    duha: { start: duhaStart, end: duhaEnd } satisfies TimeRange,
    // The best part of Duha is when the day has warmed: roughly the second half of the window.
    duhaBest: new Date((duhaStart.getTime() + duhaEnd.getTime()) / 2),
    tahajjud: { start: lastThird, end: nextFajr } satisfies TimeRange,
    forbidden: [
      { label: "Sunrise", start: times.sunrise, end: duhaStart },
      { label: "Zenith", start: duhaEnd, end: times.dhuhr },
      { label: "Sunset", start: offset(times.maghrib, -15), end: times.maghrib },
    ],
  };
}

export function getDayLength(day: Date, calc: PrayerCalculator) {
  const today = calc(day);
  const yesterday = calc(shiftDay(day, -1));
  const minutes = minuteDiff(today.maghrib, today.sunrise);

  return {
    minutes,
    change: minutes - minuteDiff(yesterday.maghrib, yesterday.sunrise),
  };
}

export function getMoonInsights(day: Date) {
  const moon = computeMoonData(day);
  const nextFull = nextMoonPhase(day, 180);
  const nextNew = nextMoonPhase(day, 0);
  const daysUntil = (date: Date) => Math.max(0, Math.round((date.getTime() - day.getTime()) / 86400000));

  return {
    ...moon,
    nextFull,
    nextNew,
    daysToFull: daysUntil(nextFull),
    daysToNew: daysUntil(nextNew),
  };
}
