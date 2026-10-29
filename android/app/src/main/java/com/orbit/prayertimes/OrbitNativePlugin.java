package com.orbit.prayertimes;

import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Bridge for features the web layer can't do: the home-screen widget and auto-silent. */
@CapacitorPlugin(name = "OrbitNative")
public class OrbitNativePlugin extends Plugin {

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("Missing widget data");
            return;
        }

        Context context = getContext();
        context.getSharedPreferences(PrayerWidgetProvider.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(PrayerWidgetProvider.KEY_DATA, data)
            .apply();
        WidgetData.refreshAll(context);
        call.resolve();
    }

    @PluginMethod
    public void getSilentAccess(PluginCall call) {
        NotificationManager manager =
            (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        JSObject result = new JSObject();
        result.put("granted", manager != null && manager.isNotificationPolicyAccessGranted());
        call.resolve(result);
    }

    @PluginMethod
    public void openSilentAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void scheduleSilent(PluginCall call) {
        JSArray windows = call.getArray("windows");
        String mode = call.getString("mode", "vibrate");
        SilentScheduler.save(getContext(), windows == null ? "[]" : windows.toString(), mode);
        SilentScheduler.scheduleNext(getContext());
        call.resolve();
    }

    @PluginMethod
    public void cancelSilent(PluginCall call) {
        SilentScheduler.clear(getContext());
        call.resolve();
    }
}
