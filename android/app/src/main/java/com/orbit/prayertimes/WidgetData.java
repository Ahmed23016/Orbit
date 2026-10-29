package com.orbit.prayertimes;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The week of prayer times the app hands to the widgets (see nativeBridge.ts), plus the
 * shared logic all widgets use: next/current prayer, the sky phase and refresh scheduling.
 */
final class WidgetData {

    static final class Entry {
        final String key;
        final String name;
        final String day;
        final long time;
        final long jamaah;

        Entry(JSONObject json) throws Exception {
            key = json.getString("key");
            name = json.getString("name");
            day = json.getString("day");
            time = json.getLong("time");
            jamaah = json.optLong("jamaah", 0);
        }
    }

    final String location;
    final boolean hour12;
    final TimeZone timeZone;
    final List<Entry> entries;

    private WidgetData(String location, boolean hour12, TimeZone timeZone, List<Entry> entries) {
        this.location = location;
        this.hour12 = hour12;
        this.timeZone = timeZone;
        this.entries = entries;
    }

    /** Null when the app hasn't written any times yet. */
    static WidgetData load(Context context) {
        String raw = context.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .getString(PrayerWidgetProvider.KEY_DATA, null);
        if (raw == null) return null;
        try {
            JSONObject data = new JSONObject(raw);
            JSONArray prayers = data.getJSONArray("prayers");
            List<Entry> entries = new ArrayList<>();
            for (int i = 0; i < prayers.length(); i++) entries.add(new Entry(prayers.getJSONObject(i)));
            return new WidgetData(
                data.optString("location", ""),
                data.optBoolean("hour12", false),
                TimeZone.getTimeZone(data.optString("timeZone", TimeZone.getDefault().getID())),
                entries
            );
        } catch (Exception e) {
            return null;
        }
    }

    String format(long time) {
        SimpleDateFormat format = new SimpleDateFormat(hour12 ? "h:mm a" : "HH:mm", Locale.getDefault());
        format.setTimeZone(timeZone);
        return format.format(new Date(time));
    }

    /** "2026-10-14"-style key (no zero padding), matching dayKey() in the web app. */
    String dayKey(long time) {
        Calendar calendar = Calendar.getInstance(timeZone);
        calendar.setTimeInMillis(time);
        return calendar.get(Calendar.YEAR) + "-" + (calendar.get(Calendar.MONTH) + 1) + "-" + calendar.get(Calendar.DAY_OF_MONTH);
    }

    Entry next(long now) {
        for (Entry entry : entries) if (entry.time > now) return entry;
        return null;
    }

    Entry previous(long now) {
        Entry last = null;
        for (Entry entry : entries) {
            if (entry.time <= now) last = entry;
            else break;
        }
        return last;
    }

    Entry find(String day, String key) {
        for (Entry entry : entries) if (entry.day.equals(day) && entry.key.equals(key)) return entry;
        return null;
    }

    /** Sky phase, matching getSkyPhase() in the app: night, dawn, morning, day, golden, dusk. */
    String phase(long now) {
        Entry current = previous(now);
        if (current == null) return "night";
        switch (current.key) {
            case "fajr": return "dawn";
            case "sunrise": return "morning";
            case "dhuhr": return "day";
            case "asr": {
                Entry maghrib = find(current.day, "maghrib");
                return maghrib != null && maghrib.time - now < 45 * 60000L ? "golden" : "day";
            }
            case "maghrib": return "dusk";
            default: return "night";
        }
    }

    static int backgroundFor(String phase) {
        switch (phase) {
            case "dawn": return R.drawable.widget_bg_dawn;
            case "morning": return R.drawable.widget_bg_morning;
            case "day": return R.drawable.widget_bg_day;
            case "golden": return R.drawable.widget_bg_golden;
            case "dusk": return R.drawable.widget_bg_dusk;
            default: return R.drawable.widget_background;
        }
    }

    /** Redraws every Orbit widget on the home screen. */
    static void refreshAll(Context context) {
        PrayerWidgetProvider.refreshAll(context);
        SkyWidgetProvider.refreshAll(context);
        RingWidgetProvider.refreshAll(context);
    }

    static int[] idsFor(Context context, Class<?> provider) {
        return AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, provider));
    }

    /**
     * Wakes a widget provider at `at` (screen-on only, no wake-up) to redraw.
     * Each provider passes its own request code so their alarms don't replace each other.
     */
    static void scheduleUpdate(Context context, Class<?> provider, int requestCode, long at) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, provider)
            .setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, idsFor(context, provider));
        PendingIntent pending = PendingIntent.getBroadcast(
            context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        if (exact) alarms.setExact(AlarmManager.RTC, at, pending);
        else alarms.set(AlarmManager.RTC, at, pending);
    }

    static void cancelUpdate(Context context, Class<?> provider, int requestCode) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        Intent intent = new Intent(context, provider).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        alarms.cancel(PendingIntent.getBroadcast(
            context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
    }

    static PendingIntent openApp(Context context) {
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
