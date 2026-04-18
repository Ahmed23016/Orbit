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
};

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

export type MoonData = {
  age: number;
  illumination: number;
  phaseName: string;
  phase: number;
};