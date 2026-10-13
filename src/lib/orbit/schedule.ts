import { buildPrayerTimes } from "./prayer";
import type { PrayerAdjustmentSettings } from "./settings";
import type { MadhabKey, MethodKey, PrayerSet } from "./types";

export const PRAYER_KEYS = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export const PRAYER_LABELS: Record<PrayerKey, string> = {
  fajr: "Fajr",
  sunrise: "Sunrise",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
};

export const FARD_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type FardKey = (typeof FARD_KEYS)[number];

/** Dhuhr is Jumuʿah on Fridays. */
export function prayerLabel(key: PrayerKey, day?: Date) {
  return key === "dhuhr" && day?.getDay() === 5 ? "Jumuʿah" : PRAYER_LABELS[key];
}

export function isValidTime(date: Date) {
  return !Number.isNaN(date.getTime());
}

export type PrayerCalculator = (day: Date) => PrayerSet;

export type PrayerMoment = {
  key: PrayerKey;
  time: Date;
};

export type PrayerTimeline = {
  /** Calendar day whose times are listed (tomorrow once Isha has started). */
  day: Date;
  times: PrayerSet;
  rolledOver: boolean;
  current: PrayerMoment;
  next: PrayerMoment;
};

/** Day objects are local-noon dates whose Y/M/D components are the calendar date at the location. */
export function dayKey(day: Date) {
  return `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
}

export function shiftDay(day: Date, days: number) {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + days, 12, 0, 0);
}

export function isSameDay(a: Date, b: Date) {
  return dayKey(a) === dayKey(b);
}

export function createPrayerCalculator(
  latitude: number,
  longitude: number,
  method: MethodKey,
  madhab: MadhabKey,
  adjustments?: PrayerAdjustmentSettings
): PrayerCalculator {
  const cache = new Map<string, PrayerSet>();

  return (day) => {
    const key = dayKey(day);
    const cached = cache.get(key);

    if (cached) {
      return cached;
    }

    const times = buildPrayerTimes(
      shiftDay(day, 0),
      latitude,
      longitude,
      method,
      madhab,
      adjustments
    );
    cache.set(key, times);
    return times;
  };
}

export function getPrayerTimeline(
  now: Date,
  today: Date,
  calc: PrayerCalculator
): PrayerTimeline {
  const todayTimes = calc(today);
  const nowMs = now.getTime();

  const nextIndex = PRAYER_KEYS.findIndex(
    (key) => isValidTime(todayTimes[key]) && todayTimes[key].getTime() > nowMs
  );

  // Once Isha starts, the day is effectively over: show tomorrow so the next Fajr is visible.
  // (Also the fallback when no time is left today, e.g. invalid times at high latitudes.)
  if (nowMs >= todayTimes.isha.getTime() || nextIndex === -1) {
    const tomorrow = shiftDay(today, 1);
    const tomorrowTimes = calc(tomorrow);
    const nextKey = PRAYER_KEYS.find((key) => isValidTime(tomorrowTimes[key])) ?? "dhuhr";
    const currentKey =
      [...PRAYER_KEYS].reverse().find((key) => isValidTime(todayTimes[key])) ?? "isha";

    return {
      day: tomorrow,
      times: tomorrowTimes,
      rolledOver: true,
      current: { key: currentKey, time: todayTimes[currentKey] },
      next: { key: nextKey, time: tomorrowTimes[nextKey] },
    };
  }

  const nextKey = PRAYER_KEYS[nextIndex];
  const previousKey = PRAYER_KEYS.slice(0, nextIndex)
    .reverse()
    .find((key) => isValidTime(todayTimes[key]));
  const current: PrayerMoment = previousKey
    ? { key: previousKey, time: todayTimes[previousKey] }
    : { key: "isha", time: calc(shiftDay(today, -1)).isha };

  return {
    day: today,
    times: todayTimes,
    rolledOver: false,
    current,
    next: { key: nextKey, time: todayTimes[nextKey] },
  };
}

/** The day a prayer "belongs" to: before today's Fajr, it is still last night's Isha. */
export function getPrayerDay(now: Date, today: Date, calc: PrayerCalculator) {
  return now.getTime() < calc(today).fajr.getTime() ? shiftDay(today, -1) : today;
}

/** Islamic midnight and last third, measured from Maghrib to the following Fajr. */
export function getNightTimes(day: Date, calc: PrayerCalculator) {
  const maghrib = calc(day).maghrib.getTime();
  const nextFajr = calc(shiftDay(day, 1)).fajr.getTime();
  const night = nextFajr - maghrib;

  return {
    midnight: new Date(maghrib + night / 2),
    lastThird: new Date(maghrib + (night * 2) / 3),
  };
}

export function getMonthDays(monthStart: Date) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const count = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: count }, (_, index) => new Date(year, month, index + 1, 12, 0, 0));
}
