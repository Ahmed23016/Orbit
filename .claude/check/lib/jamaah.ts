import type { FardKey } from "./schedule.ts";
import type { JamaahKey, JamaahSettings } from "./settings.ts";
import { getTimeZoneOffsetMinutes } from "./time.ts";

export const JAMAAH_LABELS: Record<JamaahKey, string> = {
  fajr: "Fajr",
  dhuhr: "Dhuhr",
  asr: "Asr",
  maghrib: "Maghrib",
  isha: "Isha",
  jumuah: "Jumuʿah",
};

/** A wall-clock time ("HH:MM") on a calendar day, at the location's time zone. */
export function zonedTime(day: Date, hhmm: string, timeZone: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  const wallClockAsUtc = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
  // Use the offset at that moment (close enough across DST changes, which happen at night).
  const offset = getTimeZoneOffsetMinutes(new Date(wallClockAsUtc), timeZone);
  return new Date(wallClockAsUtc - offset * 60000);
}

/** The congregation time for a prayer, or null when none is set. */
export function getJamaahTime(
  key: FardKey,
  day: Date,
  adhan: Date,
  settings: JamaahSettings,
  timeZone: string
): Date | null {
  if (!settings.enabled || Number.isNaN(adhan.getTime())) {
    return null;
  }

  const entryKey: JamaahKey =
    key === "dhuhr" && day.getDay() === 5 && settings.prayers.jumuah.mode !== "off" ? "jumuah" : key;
  const entry = settings.prayers[entryKey];

  if (entry.mode === "offset") {
    return new Date(adhan.getTime() + Math.max(0, entry.offset) * 60000);
  }

  if (entry.mode === "fixed") {
    const time = zonedTime(day, entry.time, timeZone);
    // A fixed time before the adhan would be a typo; fall back to the adhan.
    return time && time.getTime() >= adhan.getTime() ? time : null;
  }

  return null;
}
