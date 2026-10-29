import { Capacitor, registerPlugin } from "@capacitor/core";

import { getJamaahTime } from "@/lib/orbit/jamaah";
import {
  FARD_KEYS,
  PRAYER_KEYS,
  dayKey,
  isValidTime,
  prayerLabel,
  shiftDay,
  type PrayerCalculator,
} from "@/lib/orbit/schedule";
import type { AutoSilentSettings, JamaahSettings } from "@/lib/orbit/settings";

/** Implemented natively in android/app/src/main/java/com/orbit/prayertimes/OrbitNativePlugin.java */
type OrbitNativePlugin = {
  updateWidget(options: { data: string }): Promise<void>;
  getSilentAccess(): Promise<{ granted: boolean }>;
  openSilentAccessSettings(): Promise<void>;
  scheduleSilent(options: { windows: Array<{ start: number; end: number }>; mode: string }): Promise<void>;
  cancelSilent(): Promise<void>;
};

const OrbitNative = registerPlugin<OrbitNativePlugin>("OrbitNative");

const DAYS_AHEAD = 7;

export function supportsNativeExtras() {
  return Capacitor.getPlatform() === "android";
}

type SyncInput = {
  calc: PrayerCalculator;
  today: Date;
  timeZone: string;
  hour12: boolean;
  locationLabel: string;
  jamaah: JamaahSettings;
};

/** Hands the next week of times to the home-screen widget, which picks the next one itself. */
export async function syncWidget({ calc, today, timeZone, hour12, locationLabel, jamaah }: SyncInput) {
  if (!supportsNativeExtras()) return;

  const prayers = [];
  for (let offset = 0; offset < DAYS_AHEAD; offset += 1) {
    const day = shiftDay(today, offset);
    const times = calc(day);
    for (const key of PRAYER_KEYS) {
      if (!isValidTime(times[key])) continue;
      const congregation = key === "sunrise" ? null : getJamaahTime(key, day, times[key], jamaah, timeZone);
      prayers.push({
        key,
        name: prayerLabel(key, day),
        day: dayKey(day),
        time: times[key].getTime(),
        jamaah: congregation ? congregation.getTime() : 0,
      });
    }
  }

  try {
    await OrbitNative.updateWidget({
      data: JSON.stringify({ location: locationLabel, timeZone, hour12, prayers }),
    });
  } catch {
    // The widget is optional.
  }
}

/** Schedules phone-silencing windows for the coming week (from the jamāʿah time when set). */
export async function syncAutoSilent({
  calc,
  today,
  timeZone,
  jamaah,
  settings,
}: Omit<SyncInput, "hour12" | "locationLabel"> & { settings: AutoSilentSettings }) {
  if (!supportsNativeExtras()) return;

  try {
    if (!settings.enabled) {
      await OrbitNative.cancelSilent();
      return;
    }

    const windows = [];
    for (let offset = 0; offset < DAYS_AHEAD; offset += 1) {
      const day = shiftDay(today, offset);
      const times = calc(day);
      for (const key of FARD_KEYS) {
        if (!isValidTime(times[key])) continue;
        const start = getJamaahTime(key, day, times[key], jamaah, timeZone) ?? times[key];
        windows.push({ start: start.getTime(), end: start.getTime() + settings.minutes * 60000 });
      }
    }

    await OrbitNative.scheduleSilent({ windows, mode: settings.mode });
  } catch {
    // Without permission the native side simply does nothing.
  }
}

export async function getSilentAccess() {
  if (!supportsNativeExtras()) return false;
  try {
    return (await OrbitNative.getSilentAccess()).granted;
  } catch {
    return false;
  }
}

export async function openSilentAccessSettings() {
  if (!supportsNativeExtras()) return;
  try {
    await OrbitNative.openSilentAccessSettings();
  } catch {
    // Settings screen unavailable.
  }
}
