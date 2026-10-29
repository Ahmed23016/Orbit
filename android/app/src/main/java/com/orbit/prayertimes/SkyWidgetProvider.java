package com.orbit.prayertimes;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.DashPathEffect;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.Shader;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

/**
 * "Sky" widget: the same sun/moon arc as the app's Today card, the next prayer and a live
 * countdown, on a background that follows the time of day. Redraws every 10 minutes and at
 * each prayer time.
 */
public class SkyWidgetProvider extends AppWidgetProvider {

    private static final int REQUEST_CODE = 4601;
    private static final long REFRESH_MS = 10 * 60000L;
    private static final int W = 560;
    private static final int H = 250;

    // Arc geometry: a half-ellipse resting on the horizon.
    private static final float BASE = H * 0.80f;
    private static final float CX = W / 2f;
    private static final float RX = W * 0.40f;
    private static final float RY = H * 0.50f;

    private static final float[][] STARS = {
        {0.08f, 0.20f}, {0.17f, 0.42f}, {0.30f, 0.12f}, {0.66f, 0.15f}, {0.78f, 0.38f},
        {0.90f, 0.14f}, {0.45f, 0.06f}, {0.57f, 0.33f}, {0.22f, 0.62f}, {0.84f, 0.58f},
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        RemoteViews views = buildViews(context);
        for (int id : ids) manager.updateAppWidget(id, views);
        scheduleNext(context);
    }

    @Override
    public void onDisabled(Context context) {
        WidgetData.cancelUpdate(context, SkyWidgetProvider.class, REQUEST_CODE);
    }

    static void refreshAll(Context context) {
        int[] ids = WidgetData.idsFor(context, SkyWidgetProvider.class);
        if (ids.length == 0) return;
        RemoteViews views = buildViews(context);
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        for (int id : ids) manager.updateAppWidget(id, views);
        scheduleNext(context);
    }

    private static void scheduleNext(Context context) {
        long now = System.currentTimeMillis();
        WidgetData data = WidgetData.load(context);
        WidgetData.Entry next = data == null ? null : data.next(now);
        long at = now + REFRESH_MS;
        if (next != null) at = Math.min(at, next.time + 1000);
        WidgetData.scheduleUpdate(context, SkyWidgetProvider.class, REQUEST_CODE, at);
    }

    private static float[] arcPoint(float t) {
        double a = Math.PI * t;
        return new float[] {(float) (CX - RX * Math.cos(a)), (float) (BASE - RY * Math.sin(a))};
    }

    private static Path arcPath(float from, float to) {
        Path path = new Path();
        int steps = Math.max(2, Math.round((to - from) * 60));
        for (int i = 0; i <= steps; i++) {
            float[] p = arcPoint(from + (to - from) * i / steps);
            if (i == 0) path.moveTo(p[0], p[1]);
            else path.lineTo(p[0], p[1]);
        }
        return path;
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_sky);
        views.setOnClickPendingIntent(R.id.sky_root, WidgetData.openApp(context));

        WidgetData data = WidgetData.load(context);
        long now = System.currentTimeMillis();
        WidgetData.Entry next = data == null ? null : data.next(now);
        if (data == null || next == null) {
            views.setTextViewText(R.id.sky_label, "ORBIT");
            views.setTextViewText(R.id.sky_name, "Open Orbit");
            views.setTextViewText(R.id.sky_time, "");
            views.setViewVisibility(R.id.sky_countdown, View.GONE);
            return views;
        }

        String phase = data.phase(now);
        views.setInt(R.id.sky_root, "setBackgroundResource", WidgetData.backgroundFor(phase));
        views.setTextViewText(
            R.id.sky_label,
            ("sunrise".equals(next.key) ? "FAJR ENDS" : "NEXT")
                + (data.location.isEmpty() ? "" : " · " + data.location.toUpperCase(java.util.Locale.getDefault()))
        );
        views.setTextViewText(R.id.sky_name, next.name);
        views.setTextViewText(R.id.sky_time, data.format(next.time));
        views.setChronometer(R.id.sky_countdown, SystemClock.elapsedRealtime() + (next.time - now), "in %s", true);
        views.setChronometerCountDown(R.id.sky_countdown, true);
        views.setViewVisibility(R.id.sky_countdown, View.VISIBLE);
        views.setImageViewBitmap(R.id.sky_image, drawSky(data, now, phase));
        return views;
    }

    /** Today's sun arc (or tonight's moon arc) with the body at its current position. */
    private static Bitmap drawSky(WidgetData data, long now, String phase) {
        Bitmap bitmap = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);

        String today = data.dayKey(now);
        String tomorrow = data.dayKey(now + 86400000L);
        WidgetData.Entry sunrise = data.find(today, "sunrise");
        WidgetData.Entry maghrib = data.find(today, "maghrib");
        if (sunrise == null || maghrib == null) return bitmap;

        boolean day = now >= sunrise.time && now < maghrib.time;
        long start;
        long end;
        String startLabel;
        String endLabel;
        String[][] markerKeys;
        if (day) {
            start = sunrise.time;
            end = maghrib.time;
            startLabel = "Sunrise " + data.format(sunrise.time);
            endLabel = "Maghrib " + data.format(maghrib.time);
            markerKeys = new String[][] {{today, "dhuhr"}, {today, "asr"}};
        } else if (now < sunrise.time) {
            start = maghrib.time - 86400000L; // yesterday's sunset, near enough
            end = sunrise.time;
            startLabel = "Maghrib";
            endLabel = "Sunrise " + data.format(sunrise.time);
            markerKeys = new String[][] {{today, "fajr"}};
        } else {
            WidgetData.Entry nextSunrise = data.find(tomorrow, "sunrise");
            start = maghrib.time;
            end = nextSunrise != null ? nextSunrise.time : maghrib.time + 12 * 3600000L;
            startLabel = "Maghrib " + data.format(maghrib.time);
            endLabel = nextSunrise != null ? "Sunrise " + data.format(nextSunrise.time) : "Sunrise";
            markerKeys = new String[][] {{today, "isha"}, {tomorrow, "fajr"}};
        }
        float t = Math.max(0f, Math.min(1f, (now - start) / (float) (end - start)));

        // Stars on dark skies.
        if (!day && ("night".equals(phase) || "dusk".equals(phase) || "dawn".equals(phase))) {
            paint.setColor(Color.argb(150, 255, 255, 255));
            for (float[] star : STARS) canvas.drawCircle(star[0] * W, star[1] * H, 1.8f, paint);
        }

        // Horizon.
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(2f);
        paint.setColor(Color.argb(60, 255, 255, 255));
        canvas.drawLine(W * 0.04f, BASE, W * 0.96f, BASE, paint);

        // Full arc (dashed), then the part already travelled.
        paint.setStrokeWidth(3f);
        paint.setColor(Color.argb(70, 255, 255, 255));
        paint.setPathEffect(new DashPathEffect(new float[] {4f, 10f}, 0));
        paint.setStrokeCap(Paint.Cap.ROUND);
        canvas.drawPath(arcPath(0f, 1f), paint);
        paint.setPathEffect(null);
        if (t > 0) {
            paint.setStrokeWidth(4f);
            paint.setColor(Color.argb(200, 255, 255, 255));
            canvas.drawPath(arcPath(0f, t), paint);
        }

        // Prayer markers along the arc.
        paint.setStyle(Paint.Style.FILL);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setTextSize(18f);
        for (String[] key : markerKeys) {
            WidgetData.Entry marker = data.find(key[0], key[1]);
            if (marker == null) continue;
            float mt = (marker.time - start) / (float) (end - start);
            if (mt < 0 || mt > 1) continue;
            float[] p = arcPoint(mt);
            paint.setColor(Color.argb(mt <= t ? 140 : 230, 255, 255, 255));
            canvas.drawCircle(p[0], p[1], 5f, paint);
            if (Math.abs(mt - t) > 0.07f) canvas.drawText(marker.name, p[0], p[1] + 26f, paint);
        }

        // The sun or moon, with a soft glow.
        float[] body = arcPoint(t);
        paint.setShader(new RadialGradient(body[0], body[1], 38f,
            Color.argb(day ? 170 : 120, 255, 244, 214), Color.TRANSPARENT, Shader.TileMode.CLAMP));
        canvas.drawCircle(body[0], body[1], 38f, paint);
        paint.setShader(null);
        if (day) {
            paint.setColor(Color.rgb(255, 244, 207));
            canvas.drawCircle(body[0], body[1], 13f, paint);
        } else {
            paint.setColor(Color.rgb(238, 242, 255));
            canvas.drawCircle(body[0], body[1], 12f, paint);
            paint.setColor(Color.argb(90, 0, 0, 0));
            canvas.drawCircle(body[0] + 6f, body[1] - 4f, 10f, paint);
        }

        // Ends of the arc.
        paint.setColor(Color.argb(170, 255, 255, 255));
        paint.setTextSize(17f);
        paint.setTextAlign(Paint.Align.LEFT);
        canvas.drawText(startLabel, W * 0.04f, H - 12f, paint);
        paint.setTextAlign(Paint.Align.RIGHT);
        canvas.drawText(endLabel, W * 0.96f, H - 12f, paint);
        return bitmap;
    }
}
