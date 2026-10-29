import {
  CalendarDate,
  IslamicCivilCalendar,
  IslamicUmalquraCalendar,
  toCalendar,
} from "@internationalized/date";

import type { HijriMethodKey } from "./types.ts";

const formatterCache = new Map<string, Intl.DateTimeFormat>();
const islamicCivilCalendar = new IslamicCivilCalendar();
const islamicUmalquraCalendar = new IslamicUmalquraCalendar();
const hijriMonthNames = [
  "Muharram",
  "Safar",
  "Rabiʻ al-Awwal",
  "Rabiʻ al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Shaʻban",
  "Ramadan",
  "Shawwal",
  "Dhuʻl-Qiʻdah",
  "Dhuʻl-Hijjah",
] as const;

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getFormatter(
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions
) {
  const cacheKey = `en-CA|${timeZone ?? "local"}|${JSON.stringify(options)}`;
  const cached = formatterCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    ...options,
  });
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

export function getTimeZoneParts(date: Date, timeZone?: string) {
  const formatter = getFormatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const partValue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: partValue("year"),
    month: partValue("month"),
    day: partValue("day"),
    hour: partValue("hour"),
    minute: partValue("minute"),
    second: partValue("second"),
  };
}

export function getDateInTimeZone(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0);
}

export function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return Math.round((utcTimestamp - date.getTime()) / 60000);
}

export function formatClock(date: Date, timeZone?: string, hour12 = false) {
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  const { hour, minute } = getTimeZoneParts(date, timeZone);

  if (!hour12) {
    return `${pad(hour)}:${pad(minute)}`;
  }

  return `${hour % 12 || 12}:${pad(minute)} ${hour < 12 ? "AM" : "PM"}`;
}

const dayFormatterCache = new Map<string, Intl.DateTimeFormat>();

/** Formats a local-noon day object by its own calendar components (no time zone shift). */
export function formatDay(day: Date, options: Intl.DateTimeFormatOptions) {
  const cacheKey = JSON.stringify(options);
  let formatter = dayFormatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-GB", options);
    dayFormatterCache.set(cacheKey, formatter);
  }

  return formatter.format(day);
}

export function formatCountdown(target: Date, now: Date) {
  if (Number.isNaN(target.getTime())) {
    return "--";
  }

  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}h ${pad(m)}m`;
  }

  return `${m}m ${pad(s)}s`;
}

export function formatDate(date: Date, timeZone?: string) {
  return getFormatter(timeZone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function hijriCalendarForMethod(method: HijriMethodKey) {
  if (method === "ummalqura") {
    return islamicUmalquraCalendar;
  }

  return islamicCivilCalendar;
}

export type HijriParts = {
  day: number;
  month: number;
  year: number;
  monthName: string;
};

/** Hijri date for a local-noon day object, using its own calendar components. */
export function getHijriParts(
  day: Date,
  method: HijriMethodKey,
  adjustmentDays = 0
): HijriParts {
  const shifted = new Date(day.getFullYear(), day.getMonth(), day.getDate() + adjustmentDays, 12);
  const hijri = toCalendar(
    new CalendarDate(shifted.getFullYear(), shifted.getMonth() + 1, shifted.getDate()),
    hijriCalendarForMethod(method)
  );

  return {
    day: hijri.day,
    month: hijri.month,
    year: hijri.year,
    monthName: hijriMonthNames[hijri.month - 1] ?? `Month ${hijri.month}`,
  };
}

export function formatHijri(parts: HijriParts) {
  return `${parts.day} ${parts.monthName} ${parts.year} AH`;
}

export function formatTimeZoneLabel(timeZone: string) {
  return timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone;
}

export function minuteDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

export function formatDuration(totalMinutes: number) {
  if (!Number.isFinite(totalMinutes)) return "--";
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatCoordinate(value: number, type: "lat" | "lng") {
  const absolute = Math.abs(value).toFixed(2);
  const suffix =
    type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${absolute}° ${suffix}`;
}

export function formatLocationUpdatedAt(value: string | null, now = new Date()) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "";
  }

  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "Updated just now";
  }

  if (diffMinutes < 60) {
    return `Updated ${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Updated ${diffHours} hr ago`;
  }

  return `Updated ${formatDate(timestamp)}`;
}
