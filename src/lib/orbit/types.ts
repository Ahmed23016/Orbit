export type MethodKey =
  | "mwl"
  | "egyptian"
  | "karachi"
  | "umm"
  | "dubai"
  | "qatar"
  | "singapore"
  | "turkey"
  | "tehran"
  | "moonsighting";

export type MadhabKey = "shafi" | "hanafi";

export type HijriMethodKey = "local" | "calculated" | "ummalqura";

export type PresetKey =
  | "amsterdam"
  | "london"
  | "makkah"
  | "istanbul"
  | "newyork"
  | "jakarta";

export type LocationPreset = {
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

export type LocationSelectionKey = PresetKey | "custom";

export type PrayerSet = {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
};

export type PrayerMarker = {
  label: string;
  value: Date;
};

export type YearlyPrayerRow = {
  date: Date;
  dayOfYear: number;
  label: string;
  fajrMinutes: number;
  sunriseMinutes: number;
  dhuhrMinutes: number;
  asrMinutes: number;
  maghribMinutes: number;
  ishaMinutes: number;
  fastingMinutes: number;
  daylightMinutes: number;
};

export type YearlyPrayerExtremes = {
  earliestFajr: YearlyPrayerRow;
  latestFajr: YearlyPrayerRow;
  longestFast: YearlyPrayerRow;
  shortestFast: YearlyPrayerRow;
};

export type MoonData = {
  age: number;
  illumination: number;
  phaseName: string;
  phase: number;
};
