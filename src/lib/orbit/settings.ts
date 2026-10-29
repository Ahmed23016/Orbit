import type {
  HijriMethodKey,
  LocationPreset,
  LocationSelectionKey,
  MadhabKey,
  MethodKey,
} from "./types";

export type ThemePreference = "light" | "dark" | "system";

export type TimeFormat = "24h" | "12h";

export type HighLatitudeSetting = "auto" | "middleofthenight" | "seventhofthenight" | "twilightangle";

export type PrayerAdjustmentSettings = {
  enabled: boolean;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval: number;
  maghribAngle: number;
  useIshaInterval: boolean;
  useMaghribAngle: boolean;
};

export type AlertSound = "default" | "chime" | "bowl" | "bells" | "dawn" | "silent";

export type NotificationSettings = {
  enabled: boolean;
  sound: AlertSound;
  fajrSound: AlertSound;
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  minutesBefore: number;
};

export type JamaahKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" | "jumuah";

export type JamaahEntry = {
  mode: "off" | "offset" | "fixed";
  /** Minutes after the adhan, for "offset". */
  offset: number;
  /** Wall-clock "HH:MM" at the location, for "fixed". */
  time: string;
};

export type JamaahSettings = {
  enabled: boolean;
  mosqueName: string;
  prayers: Record<JamaahKey, JamaahEntry>;
};

export type AutoSilentSettings = {
  enabled: boolean;
  minutes: number;
  mode: "vibrate" | "silent";
};

/** Minutes added to each computed time, to match a mosque's printed timetable. */
export type TimeOffsets = {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
};

export type AdhkarReminderSettings = {
  enabled: boolean;
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
  highLatitude: HighLatitudeSetting;
  timeOffsets: TimeOffsets;
  notifications: NotificationSettings;
  theme: ThemePreference;
  timeFormat: TimeFormat;
  showTracker: boolean;
  recentLocations: LocationPreset[];
  jamaah: JamaahSettings;
  autoSilent: AutoSilentSettings;
  adhkarReminders: AdhkarReminderSettings;
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
  sound: "chime",
  fajrSound: "dawn",
  fajr: true,
  dhuhr: true,
  asr: true,
  maghrib: true,
  isha: true,
  minutesBefore: 0,
};

const jamaahEntry = (offset: number): JamaahEntry => ({ mode: "offset", offset, time: "13:30" });

export const DEFAULT_JAMAAH_SETTINGS: JamaahSettings = {
  enabled: false,
  mosqueName: "",
  prayers: {
    fajr: jamaahEntry(20),
    dhuhr: jamaahEntry(15),
    asr: jamaahEntry(15),
    maghrib: jamaahEntry(5),
    isha: jamaahEntry(15),
    jumuah: { mode: "fixed", offset: 0, time: "13:30" },
  },
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
  highLatitude: "auto",
  timeOffsets: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  theme: "system",
  timeFormat: "24h",
  showTracker: true,
  recentLocations: [],
  jamaah: DEFAULT_JAMAAH_SETTINGS,
  autoSilent: { enabled: false, minutes: 20, mode: "vibrate" },
  adhkarReminders: { enabled: false },
};

type NestedKeys =
  | "notifications"
  | "prayerAdjustments"
  | "jamaah"
  | "autoSilent"
  | "adhkarReminders"
  | "timeOffsets";

export type SettingsPatch = Omit<Partial<AppSettings>, NestedKeys> & {
  notifications?: Partial<NotificationSettings>;
  prayerAdjustments?: Partial<PrayerAdjustmentSettings>;
  jamaah?: Partial<Omit<JamaahSettings, "prayers">> & {
    prayers?: Partial<Record<JamaahKey, JamaahEntry>>;
  };
  autoSilent?: Partial<AutoSilentSettings>;
  adhkarReminders?: Partial<AdhkarReminderSettings>;
  timeOffsets?: Partial<TimeOffsets>;
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
    jamaah: {
      ...base.jamaah,
      ...patch.jamaah,
      prayers: { ...base.jamaah.prayers, ...patch.jamaah?.prayers },
    },
    autoSilent: { ...base.autoSilent, ...patch.autoSilent },
    adhkarReminders: { ...base.adhkarReminders, ...patch.adhkarReminders },
    timeOffsets: { ...base.timeOffsets, ...patch.timeOffsets },
  };
}

export function normalizeSettings(
  value: Partial<AppSettings> | null | undefined
): AppSettings {
  return mergeSettings(DEFAULT_SETTINGS, value ?? {});
}
