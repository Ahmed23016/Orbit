import { CalculationMethod } from "adhan";

import type { PrayerAdjustmentSettings } from "./settings";
import type { LocationPreset, MethodKey, PresetKey } from "./types";

export const calculationMethods = {
  mwl: { label: "Muslim World League", build: () => CalculationMethod.MuslimWorldLeague() },
  egyptian: { label: "Egyptian", build: () => CalculationMethod.Egyptian() },
  karachi: { label: "Karachi", build: () => CalculationMethod.Karachi() },
  umm: { label: "Umm al-Qura", build: () => CalculationMethod.UmmAlQura() },
  dubai: { label: "Dubai", build: () => CalculationMethod.Dubai() },
  qatar: { label: "Qatar", build: () => CalculationMethod.Qatar() },
  singapore: { label: "Singapore", build: () => CalculationMethod.Singapore() },
  turkey: { label: "Turkey", build: () => CalculationMethod.Turkey() },
  tehran: { label: "Tehran", build: () => CalculationMethod.Tehran() },
  moonsighting: {
    label: "Moonsighting Committee",
    build: () => CalculationMethod.MoonsightingCommittee(),
  },
} as const;

export const locationPresets: Record<PresetKey, LocationPreset> = {
  amsterdam: {
    label: "Amsterdam",
    latitude: 52.3676,
    longitude: 4.9041,
    timeZone: "Europe/Amsterdam",
  },
  london: {
    label: "London",
    latitude: 51.5072,
    longitude: -0.1276,
    timeZone: "Europe/London",
  },
  makkah: {
    label: "Makkah",
    latitude: 21.3891,
    longitude: 39.8579,
    timeZone: "Asia/Riyadh",
  },
  istanbul: {
    label: "Istanbul",
    latitude: 41.0082,
    longitude: 28.9784,
    timeZone: "Europe/Istanbul",
  },
  newyork: {
    label: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    timeZone: "America/New_York",
  },
  jakarta: {
    label: "Jakarta",
    latitude: -6.2088,
    longitude: 106.8456,
    timeZone: "Asia/Jakarta",
  },
};

export function buildCalculationParameters(
  method: MethodKey,
  adjustments?: PrayerAdjustmentSettings
) {
  const params = calculationMethods[method].build();

  if (adjustments?.enabled) {
    params.fajrAngle = adjustments.fajrAngle;

    if (adjustments.useIshaInterval) {
      params.ishaInterval = Math.max(0, Math.round(adjustments.ishaInterval));
      params.ishaAngle = 0;
    } else {
      params.ishaAngle = adjustments.ishaAngle;
      params.ishaInterval = 0;
    }

    if (adjustments.useMaghribAngle) {
      params.maghribAngle = adjustments.maghribAngle;
    } else {
      delete (params as { maghribAngle?: number }).maghribAngle;
    }
  }

  return params;
}

export function getMethodDefaults(method: MethodKey) {
  const params = calculationMethods[method].build();

  return {
    fajrAngle: params.fajrAngle,
    ishaAngle: params.ishaAngle,
    maghribAngle: params.maghribAngle ?? null,
    ishaInterval: params.ishaInterval,
  };
}

export function getMethodDetails(
  method: MethodKey,
  adjustments?: PrayerAdjustmentSettings
) {
  const params = buildCalculationParameters(method, adjustments);

  return {
    fajrAngle: params.fajrAngle,
    ishaAngle: params.ishaAngle,
    maghribAngle: params.maghribAngle ?? null,
    ishaInterval: params.ishaInterval,
  };
}
