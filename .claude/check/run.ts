// Logic checks for Orbit's prayer, calendar and astronomy code. Run with:
//   node --experimental-strip-types .claude/check/run.ts
import { createPrayerCalculator, getPrayerTimeline, getPrayerDay, getNightTimes, shiftDay, PRAYER_KEYS, isValidTime } from "./lib/schedule.ts";
import { getDateInTimeZone, formatClock, getHijriParts, formatHijri } from "./lib/time.ts";
import { getUpcomingEvents } from "./lib/events.ts";
import { getJamaahTime } from "./lib/jamaah.ts";
import { DEFAULT_JAMAAH_SETTINGS, DEFAULT_PRAYER_ADJUSTMENT_SETTINGS } from "./lib/settings.ts";
import { getSunnahTimes, getPrayerWindows, getMoonInsights } from "./lib/insights.ts";
import { forecastCrescent, getCrescentWatch } from "./lib/sighting.ts";
import { qiblaDirection, distanceToMakkahKm } from "./lib/astronomy.ts";
import { getSeason } from "./lib/seasons.ts";

let failures = 0;
let passes = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) passes += 1;
  else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? "  — " + detail : ""}`);
  }
}

const places = [
  { name: "Amsterdam", lat: 52.37, lng: 4.9, tz: "Europe/Amsterdam" },
  { name: "Makkah", lat: 21.42, lng: 39.83, tz: "Asia/Riyadh" },
  { name: "Tromsø", lat: 69.65, lng: 18.96, tz: "Europe/Oslo" },
  { name: "Sydney", lat: -33.87, lng: 151.21, tz: "Australia/Sydney" },
  { name: "New York", lat: 40.71, lng: -74.0, tz: "America/New_York" },
];

// 1. Timeline invariants, every 7 minutes for 52 days spread over a year, in every place.
for (const place of places) {
  const calc = createPrayerCalculator(place.lat, place.lng, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  let bad = 0;
  let example = "";
  for (let week = 0; week < 52; week += 1) {
    const start = Date.UTC(2026, 0, 3) + week * 7 * 86400000;
    for (let m = 0; m < 24 * 60; m += 7) {
      const now = new Date(start + m * 60000);
      const today = getDateInTimeZone(now, place.tz);
      const t = getPrayerTimeline(now, today, calc);
      const problems: string[] = [];
      if (!isValidTime(t.next.time)) problems.push("next invalid");
      else if (t.next.time.getTime() <= now.getTime()) problems.push("next not in future");
      if (isValidTime(t.current.time) && t.current.time.getTime() > now.getTime()) problems.push("current in future");
      if (isValidTime(t.next.time) && t.next.time.getTime() - now.getTime() > 30 * 3600000) problems.push("next > 30h away");
      const pd = getPrayerDay(now, today, calc);
      if (Math.abs(pd.getTime() - today.getTime()) > 1.5 * 86400000) problems.push("prayer day off");
      if (problems.length) {
        bad += 1;
        if (!example) example = `${now.toISOString()} ${problems.join(", ")} (current ${t.current.key}, next ${t.next.key})`;
      }
    }
  }
  check(`timeline invariants · ${place.name}`, bad === 0, `${bad} bad moments, e.g. ${example}`);
}

// 2. Daily order: Fajr < Sunrise < Dhuhr < Asr < Maghrib < Isha, for every day of 2026.
for (const place of places) {
  const calc = createPrayerCalculator(place.lat, place.lng, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  let bad = 0;
  let example = "";
  for (let d = 0; d < 365; d += 1) {
    const day = new Date(2026, 0, 1 + d, 12);
    const times = calc(day);
    const values = PRAYER_KEYS.map((k) => times[k].getTime());
    const invalid = values.some((v) => Number.isNaN(v));
    const ordered = values.every((v, i) => i === 0 || v > values[i - 1]);
    if (invalid || !ordered) {
      bad += 1;
      if (!example) example = `${day.toDateString()} ${PRAYER_KEYS.map((k) => k + " " + formatClock(times[k], place.tz)).join(" ")}`;
    }
  }
  check(`valid & ordered all year · ${place.name}`, bad === 0, `${bad} days, e.g. ${example}`);
}

// 3. Isha rollover and before-Fajr behaviour (Amsterdam, 15 Oct 2026).
{
  const tz = "Europe/Amsterdam";
  const calc = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  const evening = new Date("2026-10-15T21:00:00+02:00");
  const t = getPrayerTimeline(evening, getDateInTimeZone(evening, tz), calc);
  check("after Isha → tomorrow, next Fajr", t.rolledOver && t.next.key === "fajr" && t.current.key === "isha" && t.day.getDate() === 16);
  const early = new Date("2026-10-15T03:00:00+02:00");
  const e = getPrayerTimeline(early, getDateInTimeZone(early, tz), calc);
  check("before Fajr → current Isha (yesterday), next Fajr today", !e.rolledOver && e.next.key === "fajr" && e.current.key === "isha" && e.current.time.getTime() < early.getTime());
  check("before Fajr → prayer day is yesterday", getPrayerDay(early, getDateInTimeZone(early, tz), calc).getDate() === 14);
}

// 4. Fine-tune offsets move exactly the right prayer.
{
  const base = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  const tuned = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto", { fajr: 2, sunrise: 0, dhuhr: 0, asr: -3, maghrib: 0, isha: 5 });
  const day = new Date(2026, 9, 15, 12);
  const a = base(day);
  const b = tuned(day);
  const diff = (k: (typeof PRAYER_KEYS)[number]) => Math.round((b[k].getTime() - a[k].getTime()) / 60000);
  check("fine-tune: Fajr +2, Asr −3, Isha +5, others 0", diff("fajr") === 2 && diff("asr") === -3 && diff("isha") === 5 && diff("dhuhr") === 0 && diff("maghrib") === 0, PRAYER_KEYS.map((k) => `${k} ${diff(k)}`).join(" "));
}

// 5. High latitude: Amsterdam in June must not collapse Fajr and Isha together.
{
  const calc = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  const t = calc(new Date(2026, 5, 21, 12));
  const gap = (t.fajr.getTime() - t.isha.getTime()) / 60000;
  check("Amsterdam June: Fajr and Isha are distinct", Math.abs(gap) > 60, `fajr ${formatClock(t.fajr, "Europe/Amsterdam")} isha ${formatClock(t.isha, "Europe/Amsterdam")}`);
}

// 6. Daylight-saving change (Amsterdam, clocks go back 25 Oct 2026): Maghrib shifts about an hour on the clock.
{
  const calc = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  const before = formatClock(calc(new Date(2026, 9, 24, 12)).maghrib, "Europe/Amsterdam");
  const after = formatClock(calc(new Date(2026, 9, 25, 12)).maghrib, "Europe/Amsterdam");
  const [bh, bm] = before.split(":").map(Number);
  const [ah, am] = after.split(":").map(Number);
  const delta = (bh * 60 + bm) - (ah * 60 + am);
  check("DST: Maghrib jumps ~1h earlier on the clock", delta >= 60 && delta <= 64, `${before} → ${after}`);
}

// 7. Jamāʿah: offset, fixed time, and Jumuʿah on Friday.
{
  const tz = "Europe/Amsterdam";
  const calc = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  const settings = { ...DEFAULT_JAMAAH_SETTINGS, enabled: true };
  const thursday = new Date(2026, 9, 15, 12);
  const friday = new Date(2026, 9, 16, 12);
  const dhuhrThu = getJamaahTime("dhuhr", thursday, calc(thursday).dhuhr, settings, tz);
  const dhuhrFri = getJamaahTime("dhuhr", friday, calc(friday).dhuhr, settings, tz);
  check("jamāʿah offset: Dhuhr + 15 min", dhuhrThu !== null && Math.round((dhuhrThu.getTime() - calc(thursday).dhuhr.getTime()) / 60000) === 15);
  check("jamāʿah Friday uses Jumuʿah 13:30", dhuhrFri !== null && formatClock(dhuhrFri, tz) === "13:30", dhuhrFri ? formatClock(dhuhrFri, tz) : "null");
  check("jamāʿah disabled → null", getJamaahTime("fajr", thursday, calc(thursday).fajr, DEFAULT_JAMAAH_SETTINGS, tz) === null);
}

// 8. Hijri calendar & events (Umm al-Qura).
{
  const hijri = getHijriParts(new Date(2026, 9, 15, 12), "ummalqura", 0);
  check("15 Oct 2026 = 4 Jumada al-Ula 1448", hijri.day === 4 && hijri.month === 5 && hijri.year === 1448, formatHijri(hijri));
  const events = getUpcomingEvents(new Date(2026, 9, 15, 12), "ummalqura", 0, 5);
  const ramadan = events.find((e) => e.name === "Ramadan begins");
  check("Ramadan 1448 begins 8 Feb 2027", !!ramadan && ramadan.date.getFullYear() === 2027 && ramadan.date.getMonth() === 1 && ramadan.date.getDate() === 8, ramadan?.date.toDateString());
  const eid = events.find((e) => e.name === "Eid al-Fitr");
  check("Eid al-Fitr 1448 on 9 Mar 2027", !!eid && eid.date.getMonth() === 2 && eid.date.getDate() === 9, eid?.date.toDateString());
  check("+1 adjustment shifts the Hijri date by a day", getHijriParts(new Date(2026, 9, 15, 12), "ummalqura", 1).day === 5);
  check("season: Ramadan night 27 on evening of 26th", getSeason({ day: 26, month: 9, year: 1448, monthName: "Ramadan" }, true)?.kind === "qadr");
  check("season: none in Jumada", getSeason(hijri, false) === null);
}

// 9. Night & sunnah times are well-ordered.
{
  const tz = "Europe/Amsterdam";
  const calc = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  const day = new Date(2026, 9, 15, 12);
  const t = calc(day);
  const night = getNightTimes(day, calc);
  const nextFajr = calc(shiftDay(day, 1)).fajr;
  check("Maghrib < midnight < last third < next Fajr", t.maghrib < night.midnight && night.midnight < night.lastThird && night.lastThird < nextFajr);
  const sunnah = getSunnahTimes(day, calc);
  check("Duha: after sunrise, ends before Dhuhr", sunnah.duha.start > t.sunrise && sunnah.duha.end < t.dhuhr && sunnah.duhaBest > sunnah.duha.start && sunnah.duhaBest < sunnah.duha.end);
  const w = getPrayerWindows(day, calc);
  check("windows: Fajr ends at sunrise, Isha at midnight", w.fajr.getTime() === t.sunrise.getTime() && w.isha.getTime() === night.midnight.getTime());
  void tz;
}

// 10. Qibla bearings and distances (reference: adhan / published values).
for (const [name, lat, lng, bearing, km] of [
  ["Amsterdam", 52.37, 4.9, 125.59, 4553],
  ["New York", 40.71, -74.0, 58.49, 10300],
  ["Sydney", -33.87, 151.21, 277.5, 13236],
  ["Jakarta", -6.2, 106.85, 295.15, 7920],
] as const) {
  const b = qiblaDirection(lat, lng);
  const d = distanceToMakkahKm(lat, lng);
  check(`qibla ${name} ≈ ${bearing}°`, Math.abs(b - bearing) < 0.2, b.toFixed(2));
  check(`distance ${name} ≈ ${km} km`, Math.abs(d - km) / km < 0.01, `${d}`);
}

// 11. Moon & crescent.
{
  const m = getMoonInsights(new Date(2026, 9, 15, 12));
  check("next full moon 26 Oct 2026", m.nextFull.getUTCMonth() === 9 && m.nextFull.getUTCDate() === 26, m.nextFull.toISOString());
  check("next new moon 9 Nov 2026", m.nextNew.getUTCMonth() === 10 && m.nextNew.getUTCDate() === 9, m.nextNew.toISOString());
  check("15 Oct: waxing crescent", m.phaseName === "Waxing Crescent", m.phaseName);
  const calc = createPrayerCalculator(52.37, 4.9, "mwl", "shafi", DEFAULT_PRAYER_ADJUSTMENT_SETTINGS, "auto");
  const watch = getCrescentWatch(new Date("2027-02-05T12:00:00Z"), calc, 52.37, 4.9, "Europe/Amsterdam");
  check("crescent watch around 6 Feb 2027", watch.evenings.length === 3 && watch.conjunction.getUTCDate() === 6 && watch.conjunction.getUTCMonth() === 1);
  check("evening of conjunction not visible", watch.evenings[0].forecast.verdict === "impossible" || watch.evenings[0].forecast.verdict === "unlikely");
  check("evening after: visible with aid or better", ["likely", "easy", "optics"].includes(watch.evenings[1].forecast.verdict), watch.evenings[1].forecast.verdict);
  const invalid = forecastCrescent(new Date(NaN), 52.37, 4.9);
  check("forecast handles invalid sunset", invalid === null);
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
