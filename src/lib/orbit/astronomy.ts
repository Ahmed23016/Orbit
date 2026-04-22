import { clamp, degToRad, normalizeDegrees, radToDeg, shortestAngleDelta } from "./math";

export function dayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

export function solarDeclination(n: number) {
  return 23.44 * Math.sin(degToRad((360 / 365) * (n - 81)));
}

export function equationOfTime(n: number) {
  const B = degToRad((360 / 365) * (n - 81));
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

export function solarNoonMinutes(date: Date, longitude: number, timezoneOffsetMinutes: number) {
  const n = dayOfYear(date);
  const eot = equationOfTime(n);
  return 720 - 4 * longitude - eot - timezoneOffsetMinutes;
}

export function solarAltitude(
  date: Date,
  latitude: number,
  longitude: number,
  minuteOfDay: number,
  timezoneOffsetMinutes = -date.getTimezoneOffset()
) {
  const n = dayOfYear(date);
  const decl = degToRad(solarDeclination(n));
  const lat = degToRad(latitude);
  const noon = solarNoonMinutes(date, longitude, timezoneOffsetMinutes);
  const hourAngle = degToRad((minuteOfDay - noon) / 4);

  const sinAlt =
    Math.sin(lat) * Math.sin(decl) +
    Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);

  return radToDeg(Math.asin(clamp(sinAlt, -1, 1)));
}

export function solarAzimuth(
  date: Date,
  latitude: number,
  longitude: number,
  minuteOfDay: number,
  timezoneOffsetMinutes = -date.getTimezoneOffset()
) {
  const n = dayOfYear(date);
  const decl = degToRad(solarDeclination(n));
  const lat = degToRad(latitude);
  const noon = solarNoonMinutes(date, longitude, timezoneOffsetMinutes);
  const hourAngle = degToRad((minuteOfDay - noon) / 4);

  const azimuth =
    radToDeg(
      Math.atan2(
        Math.sin(hourAngle),
        Math.cos(hourAngle) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)
      )
    ) + 180;

  return normalizeDegrees(azimuth);
}

export function qiblaDirection(latitude: number, longitude: number) {
  const makkahLat = degToRad(21.4225);
  const makkahLon = degToRad(39.8262);
  const lat = degToRad(latitude);
  const lon = degToRad(longitude);
  const dLon = makkahLon - lon;
  const y = Math.sin(dLon);
  const x = Math.cos(lat) * Math.tan(makkahLat) - Math.sin(lat) * Math.cos(dLon);
  const brng = (radToDeg(Math.atan2(y, x)) + 360) % 360;
  return Math.round(brng);
}

export function bearingToCompassPoint(bearing: number) {
  const points = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ] as const;

  const index = Math.round(normalizeDegrees(bearing) / 22.5) % points.length;
  return points[index];
}

export function relativeDirectionLabel(delta: number) {
  const abs = Math.abs(delta);

  if (abs < 12) return "straight ahead";
  if (abs < 40) return delta > 0 ? "ahead-right" : "ahead-left";
  if (abs < 70) return delta > 0 ? "to your right" : "to your left";
  if (abs < 110) return delta > 0 ? "to your right" : "to your left";
  if (abs < 145) return delta > 0 ? "behind-right" : "behind-left";
  return "behind you";
}

export function describeBearingFromCardinal(bearing: number) {
  const references = [
    { label: "north", bearing: 0, positive: "east", negative: "west" },
    { label: "east", bearing: 90, positive: "south", negative: "north" },
    { label: "south", bearing: 180, positive: "west", negative: "east" },
    { label: "west", bearing: 270, positive: "north", negative: "south" },
  ] as const;

  const nearest = references.reduce((best, reference) => {
    const delta = shortestAngleDelta(reference.bearing, bearing);
    if (!best || Math.abs(delta) < Math.abs(best.delta)) {
      return { ...reference, delta };
    }
    return best;
  }, null as (typeof references)[number] & { delta: number } | null);

  if (!nearest) {
    return `${Math.round(normalizeDegrees(bearing))} deg`;
  }

  const amount = Math.round(Math.abs(nearest.delta));
  if (amount < 8) {
    return `almost due ${nearest.label}`;
  }

  return `${amount} deg ${nearest.delta > 0 ? nearest.positive : nearest.negative} of ${nearest.label}`;
}
