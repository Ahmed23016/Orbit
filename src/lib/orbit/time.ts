import type { HijriMethodKey } from "./types";

const formatterCache = new Map<string, Intl.DateTimeFormat>();

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

export function formatTime(date: Date, timeZone?: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
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
    return "islamic-umalqura";
  }

  return "islamic";
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isSameDayInTimeZone(a: Date, b: Date, timeZone: string) {
  const aParts = getTimeZoneParts(a, timeZone);
  const bParts = getTimeZoneParts(b, timeZone);

  return (
    aParts.year === bParts.year &&
    aParts.month === bParts.month &&
    aParts.day === bParts.day
  );
}

export function formatIslamicDate(
  date: Date,
  timeZone: string | undefined,
  method: HijriMethodKey,
  adjustmentDays = 0
) {
  const adjustedDate = addDays(date, adjustmentDays);
  const locale = `en-TN-u-ca-${hijriCalendarForMethod(method)}`;
  const cacheKey = `${locale}|${timeZone ?? "local"}|hijri-long`;
  let formatter = formatterCache.get(cacheKey);

  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    formatterCache.set(cacheKey, formatter);
  }

  return formatter.format(adjustedDate);
}

export function formatDateLabel(date: Date, timeZone?: string) {
  return getFormatter(timeZone, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateInputValue(date: Date, timeZone?: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function parseDateInputValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 12, 0, 0);
}

export function formatTimeZoneLabel(timeZone: string) {
  return timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone;
}

export function formatMinutesAsClock(totalMinutes: number) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${pad(hours)}:${pad(minutes)}`;
}

export function minutesSinceMidnight(date: Date, timeZone?: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return parts.hour * 60 + parts.minute + parts.second / 60;
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function hourValue(date: Date, timeZone?: string) {
  const parts = getTimeZoneParts(date, timeZone);
  return parts.hour + parts.minute / 60 + parts.second / 3600;
}

export function minuteDiff(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

export function formatDuration(totalMinutes: number) {
  const abs = Math.abs(totalMinutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function countdown(target: Date, now: Date) {
  const diff = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function formatCoordinate(value: number, type: "lat" | "lng") {
  const absolute = Math.abs(value).toFixed(4);
  const suffix =
    type === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${absolute} deg ${suffix}`;
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
