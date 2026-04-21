import { Preferences } from "@capacitor/preferences";

import {
  DEFAULT_SETTINGS,
  mergeSettings,
  normalizeSettings,
  type AppSettings,
  type SettingsPatch,
} from "@/lib/orbit/settings";

const STORAGE_KEY = "orbit:settings";

function canUsePreferences() {
  return typeof window !== "undefined";
}

export async function getSettings(): Promise<AppSettings> {
  if (!canUsePreferences()) {
    return DEFAULT_SETTINGS;
  }

  try {
    const { value } = await Preferences.get({ key: STORAGE_KEY });
    if (!value) {
      return DEFAULT_SETTINGS;
    }

    return normalizeSettings(JSON.parse(value) as Partial<AppSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!canUsePreferences()) {
    return;
  }

  try {
    await Preferences.set({
      key: STORAGE_KEY,
      value: JSON.stringify(settings),
    });
  } catch {
    // Ignore storage failures so the app stays usable.
  }
}

export async function updateSettings(patch: SettingsPatch): Promise<AppSettings> {
  const current = await getSettings();
  const next = mergeSettings(current, patch);
  await saveSettings(next);
  return next;
}

export async function resetSettings(): Promise<AppSettings> {
  await saveSettings(DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}
