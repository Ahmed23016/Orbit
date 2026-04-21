import { useSettings } from "@/hooks/useSettings";
import { locationPresets, calculationMethods } from "@/lib/orbit/constants";
import type { HijriMethodKey, MadhabKey, MethodKey, PresetKey } from "@/lib/orbit/types";

export function SettingsScreen() {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <section className="rounded-[24px] border border-white/10 bg-slate-950/68 p-5">
      <h2 className="text-xl font-semibold text-white">Settings</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-slate-300">Default location</span>
          <select
            value={settings.selectedLocation}
            onChange={(event) =>
              void updateSettings({
                selectedLocation: event.target.value as PresetKey | "custom",
              })
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white"
          >
            {Object.entries(locationPresets).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-slate-300">Prayer method</span>
          <select
            value={settings.prayerMethod}
            onChange={(event) =>
              void updateSettings({
                prayerMethod: event.target.value as MethodKey,
              })
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white"
          >
            {Object.entries(calculationMethods).map(([key, method]) => (
              <option key={key} value={key}>
                {method.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-slate-300">Madhab</span>
          <select
            value={settings.madhab}
            onChange={(event) =>
              void updateSettings({
                madhab: event.target.value as MadhabKey,
              })
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white"
          >
            <option value="shafi">Shafi / Maliki / Hanbali</option>
            <option value="hanafi">Hanafi</option>
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-slate-300">Moon sighting</span>
          <select
            value={settings.hijriMethod}
            onChange={(event) =>
              void updateSettings({
                hijriMethod: event.target.value as HijriMethodKey,
              })
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white"
          >
            <option value="ummalqura">Saudi / Umm al-Qura</option>
            <option value="local">Local moon sighting</option>
            <option value="calculated">Calculated</option>
          </select>
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <span className="text-sm text-slate-300">Use selected location as default</span>
          <input
            type="checkbox"
            checked={settings.useLocationAsDefault}
            onChange={(event) =>
              void updateSettings({
                useLocationAsDefault: event.target.checked,
              })
            }
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <span className="text-sm text-slate-300">Automatic location on startup</span>
          <input
            type="checkbox"
            checked={settings.automaticLocation}
            onChange={(event) =>
              void updateSettings({
                automaticLocation: event.target.checked,
              })
            }
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <span className="text-sm text-slate-300">Prayer notifications</span>
          <input
            type="checkbox"
            checked={settings.notifications.enabled}
            onChange={(event) =>
              void updateSettings({
                notifications: {
                  enabled: event.target.checked,
                },
              })
            }
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-slate-300">Theme</span>
          <select
            value={settings.theme}
            onChange={(event) =>
              void updateSettings({
                theme: event.target.value as "light" | "dark" | "system",
              })
            }
            className="rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white"
          >
            <option value="system">System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void resetSettings()}
        className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white"
      >
        Reset settings
      </button>
    </section>
  );
}
