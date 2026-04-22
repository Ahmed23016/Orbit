import type {
  HijriMethodKey,
  LocationPreset,
  LocationSelectionKey,
  MadhabKey,
  MethodKey,
} from "./types";

export type ThemePreference = "light" | "dark" | "system";

export type PrayerAdjustmentSettings = {
  enabled: boolean;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval: number;
  maghribAngle: number;
  useIshaInterval: boolean;
  useMaghribAngle: boolean;
};

export type NotificationSettings = {
  enabled: boolean;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  minutesBefore: number;
};

export type AppSettings = {
  selectedLocation: LocationSelectionKey;
  customCoords: LocationPreset | null;
  lastCurrentLocationAt: string | null;
  useLocationAsDefault: boolean;
  automaticLocation: boolean;
  prayerMethod: MethodKey;
  madhab: MadhabKey;
  hijriMethod: HijriMethodKey;
  hijriAdjustment: number;
  prayerAdjustments: PrayerAdjustmentSettings;
  notifications: NotificationSettings;
  theme: ThemePreference;
};

export const DEFAULT_PRAYER_ADJUSTMENT_SETTINGS: PrayerAdjustmentSettings = {
  enabled: false,
  fajrAngle: 18,
  ishaAngle: 17,
  ishaInterval: 0,
  maghribAngle: 0,
  useIshaInterval: false,
  useMaghribAngle: false,
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  minutesBefore: 0,
};

export const DEFAULT_SETTINGS: AppSettings = {
  selectedLocation: "amsterdam",
  customCoords: null,
  lastCurrentLocationAt: null,
  useLocationAsDefault: false,
  automaticLocation: false,
  prayerMethod: "mwl",
  madhab: "shafi",
  hijriMethod: "ummalqura",
  hijriAdjustment: 0,
  prayerAdjustments: DEFAULT_PRAYER_ADJUSTMENT_SETTINGS,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  theme: "system",
};

export type SettingsPatch = Omit<Partial<AppSettings>, "notifications" | "prayerAdjustments"> & {
  notifications?: Partial<NotificationSettings>;
  prayerAdjustments?: Partial<PrayerAdjustmentSettings>;
};

export function mergeSettings(base: AppSettings, patch: SettingsPatch): AppSettings {
  return {
    ...base,
    ...patch,
    prayerAdjustments: {
      ...base.prayerAdjustments,
      ...patch.prayerAdjustments,
    },
    notifications: {
      ...base.notifications,
      ...patch.notifications,
    },
  };
}

export function normalizeSettings(
  value: Partial<AppSettings> | null | undefined
): AppSettings {
  return mergeSettings(DEFAULT_SETTINGS, value ?? {});
}
