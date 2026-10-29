import { degToRad, normalizeDegrees, radToDeg, shortestAngleDelta } from "./math.ts";

const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

/** Great-circle bearing from true north to the Kaaba, in degrees (not rounded). */
export function qiblaDirection(latitude: number, longitude: number) {
  const lat = degToRad(latitude);
  const dLon = degToRad(KAABA_LNG - longitude);
  const y = Math.sin(dLon);
  const x = Math.cos(lat) * Math.tan(degToRad(KAABA_LAT)) - Math.sin(lat) * Math.cos(dLon);
  return normalizeDegrees(radToDeg(Math.atan2(y, x)));
}

/** Great-circle (haversine) distance in kilometres. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a1 = degToRad(lat1);
  const a2 = degToRad(lat2);
  const dLat = a2 - a1;
  const dLon = degToRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a1) * Math.cos(a2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function distanceToMakkahKm(latitude: number, longitude: number) {
  return Math.round(distanceKm(latitude, longitude, KAABA_LAT, KAABA_LNG));
}

const COMPASS_POINTS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

export function bearingToCompassPoint(bearing: number) {
  return COMPASS_POINTS[Math.round(normalizeDegrees(bearing) / 22.5) % COMPASS_POINTS.length];
}

/** e.g. "36° south of east" — how to find a bearing from the nearest cardinal direction. */
export function describeBearingFromCardinal(bearing: number) {
  const references = [
    { label: "north", bearing: 0, positive: "east", negative: "west" },
    { label: "east", bearing: 90, positive: "south", negative: "north" },
    { label: "south", bearing: 180, positive: "west", negative: "east" },
    { label: "west", bearing: 270, positive: "north", negative: "south" },
  ] as const;

  const nearest = references
    .map((reference) => ({ ...reference, delta: shortestAngleDelta(reference.bearing, bearing) }))
    .reduce((best, candidate) => (Math.abs(candidate.delta) < Math.abs(best.delta) ? candidate : best));

  const amount = Math.round(Math.abs(nearest.delta));
  if (amount < 3) {
    return `due ${nearest.label}`;
  }

  return `${amount}° ${nearest.delta > 0 ? nearest.positive : nearest.negative} of ${nearest.label}`;
}
