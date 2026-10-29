import { magvar } from "../../../node_modules/magvar/src/magvar.js";

import { normalizeDegrees, shortestAngleDelta } from "./math.ts";

/**
 * Magnetic declination (degrees, east positive) from the World Magnetic Model 2025.
 * Phone compasses report magnetic north; adding this gives true north, which the Qibla
 * bearing is measured from.
 */
export function magneticDeclination(latitude: number, longitude: number, when = new Date()) {
  try {
    const value = magvar(latitude, longitude, 0, when);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/** Where something sits on a clock face when you face the Qibla (12 o'clock = straight ahead). */
export function clockPosition(bearing: number, qibla: number) {
  const hour = Math.round(normalizeDegrees(bearing - qibla) / 30) % 12;
  return hour === 0 ? 12 : hour;
}

/** "ahead", "ahead-right", … in plain words, for a bearing relative to the Qibla. */
export function relativeWords(bearing: number, qibla: number) {
  const delta = shortestAngleDelta(qibla, bearing);
  const abs = Math.abs(delta);
  const side = delta > 0 ? "right" : "left";
  if (abs < 10) return "straight ahead";
  if (abs < 60) return `ahead to your ${side}`;
  if (abs < 120) return `to your ${side}`;
  if (abs < 170) return `behind you to the ${side}`;
  return "directly behind you";
}

/** "a quarter turn", "half a turn", … for an angle in degrees. */
export function turnFraction(degrees: number) {
  const abs = Math.abs(degrees);
  if (abs < 20) return "a small turn";
  if (abs < 35) return "a bit less than an eighth of a turn";
  if (abs < 55) return "about an eighth of a turn";
  if (abs < 75) return "a bit less than a quarter turn";
  if (abs < 105) return "about a quarter turn";
  if (abs < 125) return "a bit more than a quarter turn";
  if (abs < 150) return "about three-eighths of a turn";
  if (abs < 170) return "almost half a turn";
  return "half a turn — turn around";
}
