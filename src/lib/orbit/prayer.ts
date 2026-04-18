import { Coordinates, Madhab, PrayerTimes } from "adhan";
import { calculationMethods } from "./constants";
import type { MadhabKey, MethodKey, PrayerMarker, PrayerSet } from "./types";

export function buildPrayerTimes(
  date: Date,
  latitude: number,
  longitude: number,
  method: MethodKey,
  madhab: MadhabKey
): PrayerSet {
  const coordinates = new Coordinates(latitude, longitude);
  const params = calculationMethods[method].build();
  params.madhab = madhab === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
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

export function buildPrayerMarkers(prayers: PrayerSet): PrayerMarker[] {
  return [
    { label: "Fajr", value: prayers.fajr },
    { label: "Sunrise", value: prayers.sunrise },
    { label: "Dhuhr", value: prayers.dhuhr },
    { label: "Asr", value: prayers.asr },
    { label: "Maghrib", value: prayers.maghrib },
    { label: "Isha", value: prayers.isha },
  ];
}

export function nextPrayerInfo(prayers: PrayerMarker[], now: Date) {
  const upcoming = prayers.find((p) => p.value.getTime() > now.getTime());
  if (upcoming) return upcoming;
  return { label: "Fajr", value: new Date(prayers[0].value.getTime() + 86400000) };
}