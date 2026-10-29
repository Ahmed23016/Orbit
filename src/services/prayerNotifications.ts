import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

import {
  FARD_KEYS,
  isValidTime,
  prayerLabel,
  shiftDay,
  type PrayerCalculator,
} from "@/lib/orbit/schedule";
import { getJamaahTime } from "@/lib/orbit/jamaah";
import type { AlertSound, JamaahSettings, NotificationSettings } from "@/lib/orbit/settings";
import { formatClock } from "@/lib/orbit/time";

/** Our notification ids live in this range so we never cancel anything else. */
const ID_BASE = 7000;
const DAYS_AHEAD = 7;
const ADHKAR_ID_BASE = ID_BASE + 900;
const ADHKAR_DELAY_MINUTES = 20;

export const ALERT_SOUNDS: Record<AlertSound, { label: string; file: string | null }> = {
  chime: { label: "Soft chime", file: "orbit_chime.wav" },
  bowl: { label: "Singing bowl", file: "orbit_bowl.wav" },
  bells: { label: "Bells", file: "orbit_bells.wav" },
  dawn: { label: "Dawn", file: "orbit_dawn.wav" },
  default: { label: "Phone default", file: null },
  silent: { label: "Silent", file: null },
};

/** Android 8+ ties a sound to a channel, so each sound gets its own (named) channel. */
const channelId = (sound: AlertSound) => `orbit_prayer_${sound}`;

async function ensureChannels() {
  if (Capacitor.getPlatform() !== "android") return;
  for (const [key, sound] of Object.entries(ALERT_SOUNDS) as Array<[AlertSound, (typeof ALERT_SOUNDS)[AlertSound]]>) {
    await LocalNotifications.createChannel({
      id: channelId(key),
      name: `Prayer alerts · ${sound.label}`,
      description: "Reminders at prayer times",
      // Silent still shows the alert, just without sound.
      importance: key === "silent" ? 2 : 4,
      sound: sound.file ?? undefined,
      vibration: key !== "silent",
      visibility: 1,
    }).catch(() => {});
  }
}

export type NotificationPermission = "granted" | "denied" | "prompt" | "unsupported";

export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
  } catch {
    return "unsupported";
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted" ? "granted" : display === "denied" ? "denied" : "prompt";
  } catch {
    return "unsupported";
  }
}

async function cancelOurs() {
  const { notifications } = await LocalNotifications.getPending();
  const ours = notifications.filter((item) => item.id >= ID_BASE && item.id < ID_BASE + 1000);

  if (ours.length > 0) {
    await LocalNotifications.cancel({ notifications: ours.map(({ id }) => ({ id })) });
  }
}

/**
 * Replaces all scheduled prayer alerts with the next week's worth.
 * Called on start, on resume and whenever the location or settings change.
 */
export async function syncPrayerNotifications({
  calc,
  today,
  settings,
  timeZone,
  hour12,
  locationLabel,
  jamaah,
  adhkarReminders = false,
}: {
  calc: PrayerCalculator;
  today: Date;
  settings: NotificationSettings;
  timeZone: string;
  hour12: boolean;
  locationLabel: string;
  jamaah?: JamaahSettings;
  adhkarReminders?: boolean;
}) {
  try {
    if ((await getNotificationPermission()) !== "granted") {
      return;
    }

    await cancelOurs();
    await ensureChannels();

    if (!settings.enabled && !adhkarReminders) {
      return;
    }

    const now = Date.now();
    const notifications = [];

    for (let offset = 0; offset < DAYS_AHEAD; offset += 1) {
      const day = shiftDay(today, offset);
      const times = calc(day);

      if (adhkarReminders) {
        const reminders = [
          { session: "morning", base: times.fajr, title: "Morning adhkār", index: 0 },
          { session: "evening", base: times.asr, title: "Evening adhkār", index: 1 },
        ];
        for (const reminder of reminders) {
          if (!isValidTime(reminder.base)) continue;
          const at = new Date(reminder.base.getTime() + ADHKAR_DELAY_MINUTES * 60000);
          if (at.getTime() <= now) continue;
          notifications.push({
            id: ADHKAR_ID_BASE + offset * 2 + reminder.index,
            title: reminder.title,
            body: "A few minutes of remembrance. Tap to open your adhkār.",
            schedule: { at, allowWhileIdle: true },
            extra: { open: "adhkar", session: reminder.session },
          });
        }
      }

      if (!settings.enabled) {
        continue;
      }

      for (const [index, key] of FARD_KEYS.entries()) {
        const time = times[key];

        if (!settings[key] || !isValidTime(time)) {
          continue;
        }

        const at = new Date(time.getTime() - settings.minutesBefore * 60000);
        if (at.getTime() <= now) {
          continue;
        }

        const name = prayerLabel(key, day);
        const sound = key === "fajr" ? settings.fajrSound : settings.sound;
        const jamaahTime = jamaah ? getJamaahTime(key, day, time, jamaah, timeZone) : null;
        notifications.push({
          id: ID_BASE + offset * 10 + index,
          title:
            settings.minutesBefore > 0
              ? `${name} in ${settings.minutesBefore} minutes`
              : `It's time for ${name}`,
          body: `${name} at ${formatClock(time, timeZone, hour12)}${
            jamaahTime ? ` · Jamāʿah ${formatClock(jamaahTime, timeZone, hour12)}` : ""
          } · ${locationLabel}`,
          schedule: { at, allowWhileIdle: true },
          channelId: channelId(sound),
          // iOS plays bundled files by name; others fall back to the default sound.
          sound: ALERT_SOUNDS[sound].file ?? undefined,
        });
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch {
    // Notifications are best-effort; never let them break the app.
  }
}
