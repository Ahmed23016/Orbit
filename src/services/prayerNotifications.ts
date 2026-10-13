import { LocalNotifications } from "@capacitor/local-notifications";

import {
  FARD_KEYS,
  isValidTime,
  prayerLabel,
  shiftDay,
  type PrayerCalculator,
} from "@/lib/orbit/schedule";
import type { NotificationSettings } from "@/lib/orbit/settings";
import { formatClock } from "@/lib/orbit/time";

/** Our notification ids live in this range so we never cancel anything else. */
const ID_BASE = 7000;
const DAYS_AHEAD = 7;

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
}: {
  calc: PrayerCalculator;
  today: Date;
  settings: NotificationSettings;
  timeZone: string;
  hour12: boolean;
  locationLabel: string;
}) {
  try {
    if ((await getNotificationPermission()) !== "granted") {
      return;
    }

    await cancelOurs();

    if (!settings.enabled) {
      return;
    }

    const now = Date.now();
    const notifications = [];

    for (let offset = 0; offset < DAYS_AHEAD; offset += 1) {
      const day = shiftDay(today, offset);
      const times = calc(day);

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
        notifications.push({
          id: ID_BASE + offset * 10 + index,
          title:
            settings.minutesBefore > 0
              ? `${name} in ${settings.minutesBefore} minutes`
              : `It's time for ${name}`,
          body: `${name} at ${formatClock(time, timeZone, hour12)} · ${locationLabel}`,
          schedule: { at, allowWhileIdle: true },
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
