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

export type MoonData = {
  age: number;
  illumination: number;
  phaseName: string;
  phase: number;
};
