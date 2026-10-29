package com.orbit.prayertimes;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

/**
 * Small 2×2 widget: a ring that fills up from the last prayer to the next, with the next
 * prayer's name, time and a live countdown in the middle.
 */
public class RingWidgetProvider extends AppWidgetProvider {

    private static final int REQUEST_CODE = 4701;
    private static final long REFRESH_MS = 10 * 60000L;
    private static final int SIZE = 280;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        RemoteViews views = buildViews(context);
        for (int id : ids) manager.updateAppWidget(id, views);
        scheduleNext(context);
    }

    @Override
    public void onDisabled(Context context) {
        WidgetData.cancelUpdate(context, RingWidgetProvider.class, REQUEST_CODE);
    }

    static void refreshAll(Context context) {
        int[] ids = WidgetData.idsFor(context, RingWidgetProvider.class);
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
        WidgetData.scheduleUpdate(context, RingWidgetProvider.class, REQUEST_CODE, at);
    }

    private static RemoteViews buildViews(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ring);
        views.setOnClickPendingIntent(R.id.ring_root, WidgetData.openApp(context));

        WidgetData data = WidgetData.load(context);
        long now = System.currentTimeMillis();
        WidgetData.Entry next = data == null ? null : data.next(now);
        WidgetData.Entry previous = data == null ? null : data.previous(now);
        if (data == null || next == null) {
            views.setTextViewText(R.id.ring_name, "Orbit");
            views.setTextViewText(R.id.ring_time, "Open app");
            views.setViewVisibility(R.id.ring_countdown, View.GONE);
            return views;
        }

        views.setInt(R.id.ring_root, "setBackgroundResource", WidgetData.backgroundFor(data.phase(now)));
        views.setTextViewText(R.id.ring_name, next.name);
        views.setTextViewText(R.id.ring_time, data.format(next.time));
        views.setChronometer(R.id.ring_countdown, SystemClock.elapsedRealtime() + (next.time - now), null, true);
        views.setChronometerCountDown(R.id.ring_countdown, true);
        views.setViewVisibility(R.id.ring_countdown, View.VISIBLE);

        float progress = 0f;
        if (previous != null && next.time > previous.time) {
            progress = Math.max(0f, Math.min(1f, (now - previous.time) / (float) (next.time - previous.time)));
        }
        views.setImageViewBitmap(R.id.ring_image, drawRing(progress));
        return views;
    }

    private static Bitmap drawRing(float progress) {
        Bitmap bitmap = Bitmap.createBitmap(SIZE, SIZE, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeCap(Paint.Cap.ROUND);
        float stroke = 18f;
        float inset = stroke / 2f + 16f;
        RectF oval = new RectF(inset, inset, SIZE - inset, SIZE - inset);

        paint.setStrokeWidth(stroke);
        paint.setColor(Color.argb(45, 255, 255, 255));
        canvas.drawArc(oval, 0, 360, false, paint);

        if (progress > 0.005f) {
            paint.setColor(Color.rgb(227, 189, 114));
            canvas.drawArc(oval, -90, 360 * progress, false, paint);

            // A bright dot at the leading edge.
            double angle = Math.toRadians(-90 + 360 * progress);
            float r = (SIZE - 2 * inset) / 2f;
            float x = (float) (SIZE / 2f + r * Math.cos(angle));
            float y = (float) (SIZE / 2f + r * Math.sin(angle));
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(Color.rgb(255, 244, 214));
            canvas.drawCircle(x, y, stroke * 0.55f, paint);
        }
        return bitmap;
    }
}
