import type {
  HijriMethodKey,
  LocationPreset,
  LocationSelectionKey,
  MadhabKey,
  MethodKey,
} from "./types";

export type ThemePreference = "light" | "dark" | "system";

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
  notifications: NotificationSettings;
  theme: ThemePreference;
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
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  theme: "system",
};

export type SettingsPatch = Omit<Partial<AppSettings>, "notifications"> & {
  notifications?: Partial<NotificationSettings>;
};

export function mergeSettings(base: AppSettings, patch: SettingsPatch): AppSettings {
  return {
    ...base,
    ...patch,
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
