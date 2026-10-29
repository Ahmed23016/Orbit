package com.orbit.prayertimes;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Home-screen widget: next prayer, live countdown and the day's five prayers.
 * The app writes a week of times (see nativeBridge.ts); the widget picks the next one
 * itself and wakes at each prayer time to move on.
 */
public class PrayerWidgetProvider extends AppWidgetProvider {

    static final String PREFS = "orbit_widget";
    static final String KEY_DATA = "data";
    private static final int REFRESH_REQUEST_CODE = 4501;

    private static final int[] COLUMN_NAMES = {
        R.id.widget_col_name_0, R.id.widget_col_name_1, R.id.widget_col_name_2,
        R.id.widget_col_name_3, R.id.widget_col_name_4,
    };
    private static final int[] COLUMN_TIMES = {
        R.id.widget_col_time_0, R.id.widget_col_time_1, R.id.widget_col_time_2,
        R.id.widget_col_time_3, R.id.widget_col_time_4,
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            manager.updateAppWidget(id, buildViews(context));
        }
        scheduleRefresh(context);
    }

    @Override
    public void onDisabled(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) alarms.cancel(refreshIntent(context));
    }

    /** Redraws every placed widget (called after the app saves new times, and on schedule). */
    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
        if (ids.length == 0) return;
        RemoteViews views = buildViews(context);
        for (int id : ids) {
            manager.updateAppWidget(id, views);
        }
        scheduleRefresh(context);
    }

    private static final class Entry {
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

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_prayer);

        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(
            R.id.widget_root,
            PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)
        );

        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DATA, null);
        try {
            if (raw == null) throw new IllegalStateException("No data yet");
            JSONObject data = new JSONObject(raw);
            String location = data.optString("location", "");
            boolean hour12 = data.optBoolean("hour12", false);
            SimpleDateFormat format = new SimpleDateFormat(hour12 ? "h:mm a" : "HH:mm", Locale.getDefault());
            format.setTimeZone(TimeZone.getTimeZone(data.optString("timeZone", TimeZone.getDefault().getID())));

            JSONArray prayers = data.getJSONArray("prayers");
            List<Entry> entries = new ArrayList<>();
            for (int i = 0; i < prayers.length(); i++) {
                entries.add(new Entry(prayers.getJSONObject(i)));
            }

            long now = System.currentTimeMillis();
            Entry next = null;
            for (Entry entry : entries) {
                if (entry.time > now) {
                    next = entry;
                    break;
                }
            }
            if (next == null) throw new IllegalStateException("Times ran out");

            views.setTextViewText(
                R.id.widget_label,
                ("sunrise".equals(next.key) ? "FAJR ENDS" : "NEXT PRAYER")
                    + (location.isEmpty() ? "" : " · " + location.toUpperCase(Locale.getDefault()))
            );
            WidgetData shared = WidgetData.load(context);
            views.setInt(
                R.id.widget_root,
                "setBackgroundResource",
                WidgetData.backgroundFor(shared != null ? shared.phase(now) : "night")
            );
            views.setTextViewText(R.id.widget_name, next.name);
            views.setTextViewText(R.id.widget_time, format.format(new Date(next.time)));
            views.setChronometer(
                R.id.widget_countdown,
                SystemClock.elapsedRealtime() + (next.time - now),
                "in %s",
                true
            );
            views.setChronometerCountDown(R.id.widget_countdown, true);
            views.setViewVisibility(R.id.widget_countdown, View.VISIBLE);

            if (next.jamaah > 0) {
                views.setTextViewText(R.id.widget_jamaah, "Jamāʿah " + format.format(new Date(next.jamaah)));
                views.setViewVisibility(R.id.widget_jamaah, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_jamaah, View.GONE);
            }

            // The five prayers of the next prayer's day.
            int column = 0;
            for (Entry entry : entries) {
                if (!entry.day.equals(next.day) || "sunrise".equals(entry.key) || column >= 5) continue;
                views.setTextViewText(COLUMN_NAMES[column], entry.name);
                views.setTextViewText(COLUMN_TIMES[column], format.format(new Date(entry.time)));
                boolean isNext = entry.time == next.time;
                int color = isNext ? 0xFFE3BD72 : 0xCCFFFFFF;
                views.setTextColor(COLUMN_NAMES[column], isNext ? 0xFFE3BD72 : 0x99FFFFFF);
                views.setTextColor(COLUMN_TIMES[column], color);
                column++;
            }
            views.setViewVisibility(R.id.widget_row, column > 0 ? View.VISIBLE : View.GONE);
        } catch (Exception missing) {
            views.setTextViewText(R.id.widget_label, "ORBIT");
            views.setTextViewText(R.id.widget_name, "Open Orbit");
            views.setTextViewText(R.id.widget_time, "");
            views.setViewVisibility(R.id.widget_countdown, View.GONE);
            views.setViewVisibility(R.id.widget_jamaah, View.GONE);
            views.setViewVisibility(R.id.widget_row, View.GONE);
        }

        return views;
    }

    /** Wake up just after the next prayer starts so the widget moves on to the following one. */
    private static void scheduleRefresh(Context context) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_DATA, null);
        if (raw == null) return;

        long now = System.currentTimeMillis();
        long nextTime = 0;
        try {
            JSONArray prayers = new JSONObject(raw).getJSONArray("prayers");
            for (int i = 0; i < prayers.length(); i++) {
                long time = prayers.getJSONObject(i).getLong("time");
                if (time > now) {
                    nextTime = time;
                    break;
                }
            }
        } catch (Exception ignored) {
            return;
        }
        if (nextTime == 0) return;

        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;
        PendingIntent pending = refreshIntent(context);
        long at = nextTime + 1000;
        boolean exactAllowed = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms();
        // RTC (not _WAKEUP): the widget only matters when the screen is on.
        if (exactAllowed) {
            alarms.setExact(AlarmManager.RTC, at, pending);
        } else {
            alarms.set(AlarmManager.RTC, at, pending);
        }
    }

    private static PendingIntent refreshIntent(Context context) {
        Intent intent = new Intent(context, PrayerWidgetProvider.class);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context)
            .getAppWidgetIds(new ComponentName(context, PrayerWidgetProvider.class));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        return PendingIntent.getBroadcast(
            context,
            REFRESH_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
