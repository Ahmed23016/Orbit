import { Coordinates, HighLatitudeRule, Madhab, PolarCircleResolution, PrayerTimes } from "adhan";

import { buildCalculationParameters } from "./constants";
import type { HighLatitudeSetting, PrayerAdjustmentSettings, TimeOffsets } from "./settings";
import type { MadhabKey, MethodKey, PrayerSet } from "./types";

/**
 * The rule actually applied above ~48° latitude, where twilight can last all night in summer.
 * "auto" follows adhan's recommendation for the location (one-seventh of the night up north).
 */
export function resolveHighLatitudeRule(setting: HighLatitudeSetting, latitude: number, longitude: number) {
  return setting === "auto"
    ? HighLatitudeRule.recommended(new Coordinates(latitude, longitude))
    : setting;
}

const ORDER = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

/** Every time is a real time and they run Fajr → Isha in order. */
function isUsable(set: PrayerSet) {
  return ORDER.every((key, index) => {
    const time = set[key].getTime();
    return !Number.isNaN(time) && (index === 0 || time > set[ORDER[index - 1]].getTime());
  });
}

/**
 * Nearest latitudes to fall back to, closest first, when a day can't be computed properly
 * (polar night or midnight sun): the classic "aqrab al-bilād" — nearest place with normal days.
 */
const FALLBACK_LATITUDES = [65, 60, 55, 50, 45];

function computeAt(
  date: Date,
  latitude: number,
  longitude: number,
  method: MethodKey,
  madhab: MadhabKey,
  adjustments: PrayerAdjustmentSettings | undefined,
  highLatitude: HighLatitudeSetting,
  offsets: TimeOffsets | undefined
): PrayerSet {
  const coordinates = new Coordinates(latitude, longitude);
  const params = buildCalculationParameters(method, adjustments);
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
  params.highLatitudeRule = resolveHighLatitudeRule(highLatitude, latitude, longitude);
  // Inside the polar circles some days have no sunrise or sunset: borrow the nearest day that does.
  params.polarCircleResolution = PolarCircleResolution.AqrabYaum;
  if (offsets) {
    params.adjustments = { ...offsets };
  }
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

export function buildPrayerTimes(
  date: Date,
  latitude: number,
  longitude: number,
  method: MethodKey,
  madhab: MadhabKey,
  adjustments?: PrayerAdjustmentSettings,
  highLatitude: HighLatitudeSetting = "auto",
  offsets?: TimeOffsets
): PrayerSet {
  const times = computeAt(date, latitude, longitude, method, madhab, adjustments, highLatitude, offsets);
  if (isUsable(times)) return times;

  // Keep the longitude (so noon stays right) and move toward the equator until the day works.
  for (const fallback of FALLBACK_LATITUDES) {
    if (Math.abs(latitude) <= fallback) continue;
    const candidate = computeAt(
      date,
      Math.sign(latitude) * fallback,
      longitude,
      method,
      madhab,
      adjustments,
      highLatitude,
      offsets
    );
    if (isUsable(candidate)) return candidate;
  }
  return times;
}
