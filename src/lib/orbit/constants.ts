import { CalculationMethod } from "adhan";
import type { LocationPreset, PresetKey } from "./types";

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
  moonsighting: { label: "Moonsighting Committee", build: () => CalculationMethod.MoonsightingCommittee() },
} as const;

export const locationPresets: Record<PresetKey, LocationPreset> = {
  amsterdam: { label: "Amsterdam", latitude: 52.3676, longitude: 4.9041 },
  london: { label: "London", latitude: 51.5072, longitude: -0.1276 },
  makkah: { label: "Makkah", latitude: 21.3891, longitude: 39.8579 },
  istanbul: { label: "Istanbul", latitude: 41.0082, longitude: 28.9784 },
  newyork: { label: "New York", latitude: 40.7128, longitude: -74.006 },
  jakarta: { label: "Jakarta", latitude: -6.2088, longitude: 106.8456 },
};