import { useSettings } from "@/hooks/useSettings";

export function SettingsSummary() {
  const { settings } = useSettings();

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-300">
      <div>Location: {settings.selectedLocation}</div>
      <div>Method: {settings.prayerMethod}</div>
      <div>Madhab: {settings.madhab}</div>
      <div>Moon sighting: {settings.hijriMethod}</div>
      <div>Theme: {settings.theme}</div>
      <div>Notifications: {settings.notifications.enabled ? "On" : "Off"}</div>
    </div>
  );
}
