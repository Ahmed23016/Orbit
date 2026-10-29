package com.orbit.prayertimes;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Puts the phone on vibrate/silent during prayer windows and restores it afterwards.
 * Only one alarm is pending at a time: each firing schedules the next start or end.
 */
public final class SilentScheduler {

    static final String PREFS = "orbit_silent";
    private static final String KEY_WINDOWS = "windows";
    private static final String KEY_MODE = "mode";
    private static final String KEY_ACTIVE_UNTIL = "activeUntil";
    private static final String KEY_PREVIOUS_MODE = "previousRingerMode";
    private static final String KEY_APPLIED_MODE = "appliedRingerMode";

    static final String ACTION_START = "com.orbit.prayertimes.SILENT_START";
    static final String ACTION_END = "com.orbit.prayertimes.SILENT_END";
    private static final int REQUEST_CODE = 4401;

    private SilentScheduler() {}

    static void save(Context context, String windowsJson, String mode) {
        prefs(context).edit().putString(KEY_WINDOWS, windowsJson).putString(KEY_MODE, mode).apply();
    }

    static void clear(Context context) {
        cancelAlarm(context);
        if (prefs(context).getLong(KEY_ACTIVE_UNTIL, 0) > 0) {
            restore(context);
        }
        prefs(context).edit().remove(KEY_WINDOWS).apply();
    }

    /** Schedules the next start or end event. */
    static void scheduleNext(Context context) {
        cancelAlarm(context);
        long now = System.currentTimeMillis();
        SharedPreferences prefs = prefs(context);

        long activeUntil = prefs.getLong(KEY_ACTIVE_UNTIL, 0);
        if (activeUntil > 0) {
            setAlarm(context, ACTION_END, Math.max(activeUntil, now + 1000), 0);
            return;
        }

        try {
            JSONArray windows = new JSONArray(prefs.getString(KEY_WINDOWS, "[]"));
            long bestStart = Long.MAX_VALUE;
            long bestEnd = 0;
            for (int i = 0; i < windows.length(); i++) {
                JSONObject window = windows.getJSONObject(i);
                long start = window.getLong("start");
                long end = window.getLong("end");
                if (start > now && start < bestStart) {
                    bestStart = start;
                    bestEnd = end;
                }
            }
            if (bestStart != Long.MAX_VALUE) {
                setAlarm(context, ACTION_START, bestStart, bestEnd);
            }
        } catch (Exception ignored) {
            // Bad data: nothing to schedule until the app syncs again.
        }
    }

    static void onAlarm(Context context, Intent intent) {
        if (ACTION_START.equals(intent.getAction())) {
            long end = intent.getLongExtra("end", 0);
            if (end > System.currentTimeMillis()) {
                silence(context, end);
            }
        } else if (ACTION_END.equals(intent.getAction())) {
            restore(context);
        }
        scheduleNext(context);
    }

    private static void silence(Context context, long until) {
        AudioManager audio = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        NotificationManager notifications =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (audio == null || notifications == null || !notifications.isNotificationPolicyAccessGranted()) {
            return;
        }

        int previous = audio.getRingerMode();
        if (previous != AudioManager.RINGER_MODE_NORMAL) {
            // Already quiet: leave the user's choice alone.
            return;
        }

        int target = "silent".equals(prefs(context).getString(KEY_MODE, "vibrate"))
            ? AudioManager.RINGER_MODE_SILENT
            : AudioManager.RINGER_MODE_VIBRATE;
        try {
            audio.setRingerMode(target);
            prefs(context).edit()
                .putLong(KEY_ACTIVE_UNTIL, until)
                .putInt(KEY_PREVIOUS_MODE, previous)
                .putInt(KEY_APPLIED_MODE, target)
                .apply();
        } catch (SecurityException ignored) {
            // Permission revoked.
        }
    }

    private static void restore(Context context) {
        SharedPreferences prefs = prefs(context);
        AudioManager audio = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (audio != null) {
            int applied = prefs.getInt(KEY_APPLIED_MODE, -1);
            // Only undo our own change; if the user switched modes meanwhile, keep theirs.
            if (applied != -1 && audio.getRingerMode() == applied) {
                try {
                    audio.setRingerMode(prefs.getInt(KEY_PREVIOUS_MODE, AudioManager.RINGER_MODE_NORMAL));
                } catch (SecurityException ignored) {
                    // Permission revoked.
                }
            }
        }
        prefs.edit().remove(KEY_ACTIVE_UNTIL).remove(KEY_PREVIOUS_MODE).remove(KEY_APPLIED_MODE).apply();
    }

    private static void setAlarm(Context context, String action, long at, long end) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;

        PendingIntent pending = pendingIntent(context, action, end);
        boolean exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        if (exactAllowed) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
        }
    }

    private static void cancelAlarm(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        alarms.cancel(pendingIntent(context, ACTION_START, 0));
        alarms.cancel(pendingIntent(context, ACTION_END, 0));
    }

    private static PendingIntent pendingIntent(Context context, String action, long end) {
        Intent intent = new Intent(context, Receiver.class).setAction(action).putExtra("end", end);
        int requestCode = REQUEST_CODE + (ACTION_END.equals(action) ? 1 : 0);
        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Receives silent start/end alarms and re-arms everything after a reboot. */
    public static class Receiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
                scheduleNext(context);
                WidgetData.refreshAll(context);
            } else {
                onAlarm(context, intent);
            }
        }
    }
}
