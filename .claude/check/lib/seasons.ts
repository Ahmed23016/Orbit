import type { HijriParts } from "./time.ts";

export type Season = {
  kind: "ramadan" | "qadr" | "eid" | "dhulhijjah" | "arafah";
  label: string;
};

/**
 * The special period a Hijri day falls in, if any.
 * `isEvening` matters for Laylat al-Qadr, which is a night (the evening before the odd day).
 */
export function getSeason(hijri: HijriParts, isEvening: boolean): Season | null {
  const { month, day } = hijri;

  if (month === 9) {
    // After Maghrib on the 20th, 22nd, … the next (odd) night has begun.
    const night = isEvening ? day + 1 : day;
    if (night >= 21 && night <= 29 && night % 2 === 1) {
      return { kind: "qadr", label: `Night ${night} · seek Laylat al-Qadr` };
    }
    return { kind: "ramadan", label: `Ramadan · day ${day}` };
  }
  if (month === 10 && day <= 3) return { kind: "eid", label: "Eid al-Fitr Mubarak" };
  if (month === 12 && day === 9) return { kind: "arafah", label: "Day of Arafah" };
  if (month === 12 && day >= 10 && day <= 13) return { kind: "eid", label: "Eid al-Adha Mubarak" };
  if (month === 12 && day < 9) return { kind: "dhulhijjah", label: `Dhuʻl-Hijjah · day ${day}` };

  return null;
}
