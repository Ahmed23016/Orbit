import { shiftDay } from "./schedule";
import { getHijriParts, type HijriParts } from "./time";
import type { HijriMethodKey } from "./types";

export type IslamicEventKind = "eid" | "fast" | "season";

export type IslamicEvent = {
  name: string;
  kind: IslamicEventKind;
  note?: string;
};

const EVENTS: Array<{ month: number; day: number } & IslamicEvent> = [
  { month: 1, day: 1, name: "Islamic New Year", kind: "season" },
  { month: 1, day: 10, name: "Ashura", kind: "fast", note: "Recommended to fast the 9th and 10th." },
  { month: 9, day: 1, name: "Ramadan begins", kind: "season" },
  { month: 9, day: 21, name: "Last ten nights", kind: "season", note: "Seek Laylat al-Qadr in the odd nights." },
  { month: 10, day: 1, name: "Eid al-Fitr", kind: "eid" },
  { month: 12, day: 1, name: "First ten days of Dhuʻl-Hijjah", kind: "season" },
  { month: 12, day: 9, name: "Day of Arafah", kind: "fast", note: "Recommended to fast if not on Hajj." },
  { month: 12, day: 10, name: "Eid al-Adha", kind: "eid" },
];

export function getIslamicEvents(hijri: HijriParts): IslamicEvent[] {
  return EVENTS.filter((event) => event.month === hijri.month && event.day === hijri.day);
}

/** The "white days" (13th–15th), when voluntary fasting is recommended. */
export function isWhiteDay(hijri: HijriParts) {
  return hijri.day >= 13 && hijri.day <= 15 && hijri.month !== 9 && !(hijri.month === 12 && hijri.day === 13);
}

export function isRamadan(hijri: HijriParts) {
  return hijri.month === 9;
}

export type UpcomingEvent = IslamicEvent & {
  date: Date;
  daysAway: number;
  hijri: HijriParts;
};

export function getUpcomingEvents(
  from: Date,
  hijriMethod: HijriMethodKey,
  hijriAdjustment: number,
  limit = 4,
  maxDays = 400
): UpcomingEvent[] {
  const upcoming: UpcomingEvent[] = [];

  for (let offset = 0; offset <= maxDays && upcoming.length < limit; offset += 1) {
    const date = shiftDay(from, offset);
    const hijri = getHijriParts(date, hijriMethod, hijriAdjustment);

    for (const event of getIslamicEvents(hijri)) {
      upcoming.push({ ...event, date, daysAway: offset, hijri });
    }
  }

  return upcoming.slice(0, limit);
}

export function formatDaysAway(days: number) {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}
