/**
 * Sun and moon positions for the sky view and crescent-visibility estimates.
 *
 * Low-precision series (after Meeus, "Astronomical Algorithms", and the SunCalc
 * formulation): the sun to ~0.01°, the moon to ~0.3°. Good for visuals and
 * visibility *estimates*, not for official moon-sighting decisions.
 */

const RAD = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = RAD * 23.4397;
const EARTH_RADIUS_KM = 6378.14;

function toDays(date: Date) {
  return date.getTime() / DAY_MS - 0.5 + J1970 - J2000;
}

function rightAscension(lon: number, lat: number) {
  return Math.atan2(
    Math.sin(lon) * Math.cos(OBLIQUITY) - Math.tan(lat) * Math.sin(OBLIQUITY),
    Math.cos(lon)
  );
}

function declination(lon: number, lat: number) {
  return Math.asin(
    Math.sin(lat) * Math.cos(OBLIQUITY) + Math.cos(lat) * Math.sin(OBLIQUITY) * Math.sin(lon)
  );
}

function siderealTime(days: number, westLongitude: number) {
  return RAD * (280.16 + 360.9856235 * days) - westLongitude;
}

function horizontal(ra: number, dec: number, date: Date, latitude: number, longitude: number) {
  const phi = RAD * latitude;
  const hourAngle = siderealTime(toDays(date), RAD * -longitude) - ra;
  const altitude = Math.asin(
    Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle)
  );
  // Azimuth measured from north, clockwise.
  const azimuthFromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)
  );

  return {
    altitude: altitude / RAD,
    azimuth: ((azimuthFromSouth / RAD + 180) % 360 + 360) % 360,
  };
}

function sunEcliptic(days: number) {
  const M = RAD * (357.5291 + 0.98560028 * days);
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  return M + C + RAD * 102.9372 + Math.PI;
}

function moonEcliptic(days: number) {
  const L = RAD * (218.316 + 13.176396 * days); // mean longitude
  const Mm = RAD * (134.963 + 13.064993 * days); // moon mean anomaly
  const Ms = RAD * (357.529 + 0.98560028 * days); // sun mean anomaly
  const F = RAD * (93.272 + 13.22935 * days); // argument of latitude
  const D = RAD * (297.85 + 12.190749 * days); // mean elongation

  const lon =
    L +
    RAD *
      (6.289 * Math.sin(Mm) +
        1.274 * Math.sin(2 * D - Mm) +
        0.658 * Math.sin(2 * D) +
        0.214 * Math.sin(2 * Mm) -
        0.186 * Math.sin(Ms) -
        0.114 * Math.sin(2 * F) +
        0.059 * Math.sin(2 * D - 2 * Mm) +
        0.057 * Math.sin(2 * D - Ms - Mm) +
        0.053 * Math.sin(2 * D + Mm) +
        0.046 * Math.sin(2 * D - Ms) +
        0.041 * Math.sin(Mm - Ms) -
        0.035 * Math.sin(D) -
        0.031 * Math.sin(Ms + Mm));
  const lat =
    RAD *
    (5.128 * Math.sin(F) +
      0.281 * Math.sin(Mm + F) +
      0.278 * Math.sin(Mm - F) +
      0.173 * Math.sin(2 * D - F));
  const distance = 385001 - 20905 * Math.cos(Mm) - 3699 * Math.cos(2 * D - Mm) - 2956 * Math.cos(2 * D);

  return { lon, lat, distance };
}

export type SkyPosition = { altitude: number; azimuth: number };

export function sunPosition(date: Date, latitude: number, longitude: number): SkyPosition {
  const lon = sunEcliptic(toDays(date));
  return horizontal(rightAscension(lon, 0), declination(lon, 0), date, latitude, longitude);
}

export type MoonPosition = SkyPosition & {
  distance: number;
  /** Fraction of the disc that is lit, 0–1. */
  illumination: number;
  /** Sun–moon angular separation in degrees (elongation). */
  elongation: number;
  waxing: boolean;
};

/** Topocentric (parallax-corrected), airless moon position. */
export function moonPosition(date: Date, latitude: number, longitude: number): MoonPosition {
  const days = toDays(date);
  const moon = moonEcliptic(days);
  const ra = rightAscension(moon.lon, moon.lat);
  const dec = declination(moon.lon, moon.lat);
  const geocentric = horizontal(ra, dec, date, latitude, longitude);
  const parallax = Math.asin(EARTH_RADIUS_KM / moon.distance) / RAD;

  const sunLon = sunEcliptic(days);
  const sunRa = rightAscension(sunLon, 0);
  const sunDec = declination(sunLon, 0);
  const elongation = Math.acos(
    Math.sin(sunDec) * Math.sin(dec) + Math.cos(sunDec) * Math.cos(dec) * Math.cos(sunRa - ra)
  );
  const phaseAngle = Math.atan2(149598000 * Math.sin(elongation), moon.distance - 149598000 * Math.cos(elongation));
  const lonDiff = ((moon.lon - sunLon) / RAD % 360 + 360) % 360;

  return {
    altitude: geocentric.altitude - parallax * Math.cos(geocentric.altitude * RAD),
    azimuth: geocentric.azimuth,
    distance: moon.distance,
    illumination: (1 + Math.cos(phaseAngle)) / 2,
    elongation: elongation / RAD,
    waxing: lonDiff < 180,
  };
}

/** Sun–moon ecliptic longitude difference, wrapped to (-180, 180]. */
function lunarPhaseAngle(date: Date) {
  const days = toDays(date);
  const diff = ((moonEcliptic(days).lon - sunEcliptic(days)) / RAD) % 360;
  return diff > 180 ? diff - 360 : diff <= -180 ? diff + 360 : diff;
}

/** Moon–sun longitude difference in [0, 360): 0 new, 90 first quarter, 180 full, 270 last quarter. */
export function moonPhaseAngle(date: Date) {
  return ((lunarPhaseAngle(date) % 360) + 360) % 360;
}

/** Refines an estimate of when the phase angle equals `target` (degrees). */
function refinePhase(estimate: number, target: number) {
  let t = estimate;
  for (let i = 0; i < 6; i += 1) {
    const off = ((moonPhaseAngle(new Date(t)) - target + 540) % 360) - 180;
    t -= (off / 12.19) * DAY_MS;
  }
  return new Date(t);
}

/** The most recent new moon (conjunction) at or before `date`. */
export function previousNewMoon(date: Date) {
  // The moon gains ~12.19° a day on the sun: step back to the conjunction, then refine.
  return refinePhase(date.getTime() - (moonPhaseAngle(date) / 12.19) * DAY_MS, 0);
}

/** The next time after `date` the moon reaches a phase angle (0 new, 180 full). */
export function nextMoonPhase(date: Date, target: number) {
  const ahead = ((target - moonPhaseAngle(date) + 360) % 360 || 360) / 12.19;
  const result = refinePhase(date.getTime() + ahead * DAY_MS, target);
  return result.getTime() > date.getTime() ? result : refinePhase(result.getTime() + 29.53 * DAY_MS, target);
}
