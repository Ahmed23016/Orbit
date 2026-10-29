import { moonPosition, previousNewMoon, sunPosition } from "./celestial.ts";
import { isValidTime, shiftDay, type PrayerCalculator } from "./schedule.ts";
import { getDateInTimeZone } from "./time.ts";

export type SightingVerdict = "easy" | "likely" | "optics" | "unlikely" | "impossible";

export type CrescentForecast = {
  verdict: SightingVerdict;
  title: string;
  detail: string;
  /** Hours since the conjunction, at sunset. */
  ageHours: number;
  /** Minutes between sunset and moonset (negative: the moon sets first). */
  lagMinutes: number;
  moonAltitude: number;
  elongation: number;
  bestTime: Date | null;
};

const VERDICT_COPY: Record<SightingVerdict, { title: string; detail: string }> = {
  easy: { title: "Easily visible", detail: "The crescent should be visible to the naked eye." },
  likely: {
    title: "Possibly visible",
    detail: "Visible with binoculars; may be seen by eye in clear skies.",
  },
  optics: { title: "Binoculars needed", detail: "Only visible with optical aid in perfect conditions." },
  unlikely: { title: "Not visible", detail: "Too young or too low to be seen, even with a telescope." },
  impossible: { title: "Not possible", detail: "The moon sets before the sun or the new moon hasn't happened yet." },
};

function moonsetLagMinutes(sunset: Date, latitude: number, longitude: number) {
  if (moonPosition(sunset, latitude, longitude).altitude <= -0.3) {
    // Walk back to find when it set.
    for (let minutes = 2; minutes <= 180; minutes += 2) {
      const t = new Date(sunset.getTime() - minutes * 60000);
      if (moonPosition(t, latitude, longitude).altitude > -0.3) return -minutes;
    }
    return -180;
  }

  for (let minutes = 2; minutes <= 240; minutes += 2) {
    const t = new Date(sunset.getTime() + minutes * 60000);
    if (moonPosition(t, latitude, longitude).altitude <= -0.3) return minutes;
  }
  return 240;
}

/**
 * Crescent visibility on the evening of `sunset`, using the Odeh (2004) criterion,
 * evaluated at the "best time" (sunset + 4/9 of the moonset lag).
 */
export function forecastCrescent(sunset: Date, latitude: number, longitude: number): CrescentForecast | null {
  if (!isValidTime(sunset)) {
    return null;
  }

  const conjunction = previousNewMoon(sunset);
  const ageHours = (sunset.getTime() - conjunction.getTime()) / 3600000;
  const lagMinutes = moonsetLagMinutes(sunset, latitude, longitude);
  const base = { ageHours, lagMinutes };

  if (lagMinutes <= 0 || ageHours > 72) {
    const moon = moonPosition(sunset, latitude, longitude);
    return {
      ...base,
      verdict: "impossible",
      ...VERDICT_COPY.impossible,
      moonAltitude: moon.altitude,
      elongation: moon.elongation,
      bestTime: null,
    };
  }

  const bestTime = new Date(sunset.getTime() + (lagMinutes * 4 * 60000) / 9);
  const moon = moonPosition(bestTime, latitude, longitude);
  const sun = sunPosition(bestTime, latitude, longitude);
  const arcv = moon.altitude - sun.altitude;
  // Crescent width in arc-minutes from the moon's semi-diameter and elongation.
  const semiDiameter = 15.54 * (384400 / moon.distance);
  const width = semiDiameter * (1 - Math.cos((moon.elongation * Math.PI) / 180));
  const v = arcv - (-0.1018 * width ** 3 + 0.7319 * width ** 2 - 6.3226 * width + 7.1651);

  const verdict: SightingVerdict = v >= 5.65 ? "easy" : v >= 2 ? "likely" : v >= -0.96 ? "optics" : "unlikely";

  return {
    ...base,
    verdict,
    ...VERDICT_COPY[verdict],
    moonAltitude: moon.altitude,
    elongation: moon.elongation,
    bestTime,
  };
}

export type CrescentWatch = {
  conjunction: Date;
  evenings: Array<{ day: Date; sunset: Date; forecast: CrescentForecast }>;
};

const SYNODIC_MS = 29.530589 * 86400000;

/**
 * The three sighting evenings around the relevant new moon: the one just passed
 * (within ~2.5 days) or else the next one.
 */
export function getCrescentWatch(
  now: Date,
  calc: PrayerCalculator,
  latitude: number,
  longitude: number,
  timeZone: string
): CrescentWatch {
  const previous = previousNewMoon(now);
  const conjunction =
    now.getTime() - previous.getTime() < 2.5 * 86400000
      ? previous
      : previousNewMoon(new Date(previous.getTime() + SYNODIC_MS + 2 * 86400000));
  const firstDay = getDateInTimeZone(conjunction, timeZone);

  const evenings = [0, 1, 2].flatMap((offset) => {
    const day = shiftDay(firstDay, offset);
    const sunset = calc(day).maghrib;
    const forecast = forecastCrescent(sunset, latitude, longitude);
    return forecast ? [{ day, sunset, forecast }] : [];
  });

  return { conjunction, evenings };
}
