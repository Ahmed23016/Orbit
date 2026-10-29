import { useEffect, useState } from "react";
import { BellOff, BookOpenText, Building2 } from "lucide-react";

import { Panel, Row, SectionLabel, Segmented, Switch } from "@/components/orbit/primitives";
import { JAMAAH_LABELS } from "@/lib/orbit/jamaah";
import type { AppSettings, JamaahKey, SettingsPatch } from "@/lib/orbit/settings";
import { getSilentAccess, openSilentAccessSettings, supportsNativeExtras } from "@/services/nativeBridge";
import { requestNotificationPermission } from "@/services/prayerNotifications";

const JAMAAH_KEYS: JamaahKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha", "jumuah"];

const fieldClass =
  "h-9 w-[4.75rem] shrink-0 rounded-lg bg-o-surface-2 px-2 text-center text-sm tabular-nums text-o-text outline-none focus-visible:ring-2 focus-visible:ring-o-accent";

export function MosqueSettings({
  settings,
  onUpdate,
}: {
  settings: AppSettings;
  onUpdate: (patch: SettingsPatch) => void;
}) {
  const jamaah = settings.jamaah;

  return (
    <div>
      <SectionLabel>Mosque</SectionLabel>
      <Panel className="divide-y divide-o-line">
        <Row
          label={
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-o-accent" />
              Jamāʿah times
            </span>
          }
          hint="Show your mosque's congregation times next to the adhan."
        >
          <Switch
            label="Jamāʿah times"
            checked={jamaah.enabled}
            onChange={(enabled) => onUpdate({ jamaah: { enabled } })}
          />
        </Row>

        {jamaah.enabled ? (
          <>
            <div className="px-4 py-3">
              <input
                value={jamaah.mosqueName}
                onChange={(event) => onUpdate({ jamaah: { mosqueName: event.target.value } })}
                placeholder="Mosque name (optional)"
                aria-label="Mosque name"
                className="h-11 w-full rounded-xl bg-o-surface-2 px-3.5 text-sm outline-none placeholder:text-o-faint focus-visible:ring-2 focus-visible:ring-o-accent"
              />
            </div>
            {JAMAAH_KEYS.map((key) => {
              const entry = jamaah.prayers[key];
              const update = (patch: Partial<typeof entry>) =>
                onUpdate({ jamaah: { prayers: { [key]: { ...entry, ...patch } } } });

              return (
                <div key={key} className="flex items-center gap-2 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{JAMAAH_LABELS[key]}</span>
                  <Segmented
                    value={entry.mode}
                    onChange={(mode) => update({ mode })}
                    options={[
                      { value: "off", label: "Off" },
                      { value: "offset", label: "+min" },
                      { value: "fixed", label: "Time" },
                    ]}
                    className="w-[8.5rem] shrink-0"
                  />
                  {entry.mode === "offset" ? (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={120}
                      value={entry.offset}
                      onChange={(event) => update({ offset: Math.max(0, Math.min(120, Number(event.target.value) || 0)) })}
                      aria-label={`${JAMAAH_LABELS[key]} minutes after adhan`}
                      className={fieldClass}
                    />
                  ) : entry.mode === "fixed" ? (
                    <input
                      type="time"
                      value={entry.time}
                      onChange={(event) => update({ time: event.target.value })}
                      aria-label={`${JAMAAH_LABELS[key]} jamāʿah time`}
                      className={`${fieldClass} !w-[6rem] !px-1`}
                    />
                  ) : (
                    <span className="w-[4.75rem] shrink-0" />
                  )}
                </div>
              );
            })}
          </>
        ) : null}
      </Panel>
    </div>
  );
}

export function QuietSettings({
  settings,
  onUpdate,
}: {
  settings: AppSettings;
  onUpdate: (patch: SettingsPatch) => void;
}) {
  const native = supportsNativeExtras();
  const [silentHint, setSilentHint] = useState("");
  const [adhkarHint, setAdhkarHint] = useState("");
  const autoSilent = settings.autoSilent;

  // Coming back from the system's "Do Not Disturb access" screen: finish turning it on.
  useEffect(() => {
    if (!native) return;
    const onVisible = async () => {
      if (document.visibilityState !== "visible" || !silentHint) return;
      if (await getSilentAccess()) {
        setSilentHint("");
        onUpdate({ autoSilent: { enabled: true } });
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [native, silentHint, onUpdate]);

  const toggleSilent = async (enabled: boolean) => {
    if (!enabled) {
      onUpdate({ autoSilent: { enabled: false } });
      return;
    }
    if (await getSilentAccess()) {
      onUpdate({ autoSilent: { enabled: true } });
      return;
    }
    setSilentHint("Allow Orbit under “Do Not Disturb access”, then come back.");
    await openSilentAccessSettings();
  };

  const toggleAdhkar = async (enabled: boolean) => {
    setAdhkarHint("");
    if (!enabled) {
      onUpdate({ adhkarReminders: { enabled: false } });
      return;
    }
    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      onUpdate({ adhkarReminders: { enabled: true } });
    } else {
      setAdhkarHint("Allow notifications for Orbit to get reminders.");
    }
  };

  return (
    <div>
      <SectionLabel>Focus</SectionLabel>
      <Panel className="divide-y divide-o-line">
        <Row
          label={
            <span className="flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-o-accent" />
              Adhkār reminders
            </span>
          }
          hint={adhkarHint || "20 minutes after Fajr and after Asr."}
        >
          <Switch
            label="Adhkār reminders"
            checked={settings.adhkarReminders.enabled}
            onChange={(enabled) => void toggleAdhkar(enabled)}
          />
        </Row>

        <Row
          label={
            <span className="flex items-center gap-2">
              <BellOff className="h-4 w-4 text-o-accent" />
              Silence during prayer
            </span>
          }
          hint={
            !native
              ? "Available in the Android app."
              : silentHint ||
                (settings.jamaah.enabled
                  ? "From the jamāʿah time; your ringer comes back afterwards."
                  : "From the adhan; your ringer comes back afterwards.")
          }
        >
          <Switch
            label="Silence during prayer"
            checked={native && autoSilent.enabled}
            onChange={(enabled) => (native ? void toggleSilent(enabled) : undefined)}
          />
        </Row>

        {native && autoSilent.enabled ? (
          <div className="grid gap-3 px-4 py-4">
            <div className="grid gap-2">
              <span className="text-xs text-o-faint">For</span>
              <Segmented
                value={String(autoSilent.minutes)}
                onChange={(value) => onUpdate({ autoSilent: { minutes: Number(value) } })}
                options={[
                  { value: "10", label: "10 min" },
                  { value: "15", label: "15 min" },
                  { value: "20", label: "20 min" },
                  { value: "30", label: "30 min" },
                ]}
              />
            </div>
            <div className="grid gap-2">
              <span className="text-xs text-o-faint">Switch to</span>
              <Segmented
                value={autoSilent.mode}
                onChange={(mode) => onUpdate({ autoSilent: { mode } })}
                options={[
                  { value: "vibrate", label: "Vibrate" },
                  { value: "silent", label: "Silent" },
                ]}
              />
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
