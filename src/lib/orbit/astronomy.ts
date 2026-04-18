import { clamp, degToRad, radToDeg } from "./math";

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
  minuteOfDay: number
) {
  const n = dayOfYear(date);
  const decl = degToRad(solarDeclination(n));
  const lat = degToRad(latitude);
  const tzOffset = -date.getTimezoneOffset();
  const noon = solarNoonMinutes(date, longitude, tzOffset);
  const hourAngle = degToRad((minuteOfDay - noon) / 4);

  const sinAlt =
    Math.sin(lat) * Math.sin(decl) +
    Math.cos(lat) * Math.cos(decl) * Math.cos(hourAngle);

  return radToDeg(Math.asin(clamp(sinAlt, -1, 1)));
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