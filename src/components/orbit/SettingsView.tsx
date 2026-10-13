import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import { BellRing, History, LoaderCircle, LocateFixed, Search, X } from "lucide-react";

import {
  Disclosure,
  NativeSelect,
  Panel,
  Row,
  SectionLabel,
  Segmented,
  Switch,
} from "@/components/orbit/primitives";
import {
  calculationMethods,
  getMethodDefaults,
  locationPresets,
} from "@/lib/orbit/constants";
import { resolveTimeZone } from "@/lib/orbit/location";
import { FARD_KEYS, PRAYER_LABELS } from "@/lib/orbit/schedule";
import { requestNotificationPermission } from "@/services/prayerNotifications";
import type { AppSettings, SettingsPatch } from "@/lib/orbit/settings";
import {
  formatCoordinate,
  formatLocationUpdatedAt,
  formatTimeZoneLabel,
} from "@/lib/orbit/time";
import type {
  HijriMethodKey,
  LocationPreset,
  MethodKey,
  PresetKey,
} from "@/lib/orbit/types";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
};

type SettingsViewProps = {
  settings: AppSettings;
  location: LocationPreset;
  onUpdate: (patch: SettingsPatch) => void;
  onReset: () => void;
  onPresetChange: (key: PresetKey) => void;
  onCoordsChange: (location: LocationPreset) => void;
  onLocateMe: () => void;
  isLocating: boolean;
  locationStatusMessage: string;
  locationErrorMessage: string;
};

const methodOptions = Object.entries(calculationMethods).map(([value, method]) => ({
  value: value as MethodKey,
  label: method.label,
}));

const hijriOptions: Array<{ value: HijriMethodKey; label: string }> = [
  { value: "ummalqura", label: "Umm al-Qura" },
  { value: "local", label: "Local sighting" },
  { value: "calculated", label: "Calculated" },
];

const inputClass =
  "h-11 w-full rounded-xl bg-o-surface-2 px-3.5 text-sm text-o-text outline-none placeholder:text-o-faint focus-visible:ring-2 focus-visible:ring-o-accent";

function useCitySearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  useEffect(() => {
    if (deferredQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        setError("");

        const params = new URLSearchParams({
          q: deferredQuery,
          format: "jsonv2",
          limit: "6",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const payload = (await response.json()) as Array<{
          place_id: number;
          display_name: string;
          lat: string;
          lon: string;
        }>;

        startTransition(() => {
          setResults(
            payload.map((item) => {
              const [label, ...rest] = item.display_name.split(",");
              return {
                id: String(item.place_id),
                label: label.trim(),
                subtitle: rest.join(",").trim(),
                latitude: Number(item.lat),
                longitude: Number(item.lon),
              };
            })
          );
          setIsSearching(false);
        });
      } catch (searchError) {
        if ((searchError as Error).name === "AbortError") {
          return;
        }

        setResults([]);
        setIsSearching(false);
        setError("City search is unavailable right now.");
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredQuery]);

  return { results: deferredQuery.length >= 2 ? results : [], isSearching, error, setError };
}

function ManualCoordinates({
  location,
  onApply,
  onError,
}: {
  location: LocationPreset;
  onApply: (location: LocationPreset) => void;
  onError: (message: string) => void;
}) {
  const [lat, setLat] = useState(String(location.latitude));
  const [lng, setLng] = useState(String(location.longitude));
  const [isResolving, setIsResolving] = useState(false);

  const apply = async () => {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!lat.trim() || !lng.trim() || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      onError("Latitude and longitude need valid numbers.");
      return;
    }

    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      onError("Latitude must be between -90 and 90, longitude between -180 and 180.");
      return;
    }

    try {
      setIsResolving(true);
      onError("");
      const timeZone = await resolveTimeZone(latitude, longitude);
      onApply({ label: "Custom coordinates", latitude, longitude, timeZone });
    } catch {
      onError("Could not resolve the time zone for those coordinates.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
      <input
        value={lat}
        onChange={(event) => setLat(event.target.value)}
        inputMode="decimal"
        aria-label="Latitude"
        placeholder="Latitude"
        className={inputClass}
      />
      <input
        value={lng}
        onChange={(event) => setLng(event.target.value)}
        inputMode="decimal"
        aria-label="Longitude"
        placeholder="Longitude"
        className={inputClass}
      />
      <button
        type="button"
        onClick={() => void apply()}
        disabled={isResolving}
        className="h-11 rounded-xl bg-o-text px-4 text-sm font-medium text-o-bg disabled:opacity-60"
      >
        {isResolving ? "…" : "Apply"}
      </button>
    </div>
  );
}

function AngleField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-o-faint">{label}</span>
      <div className="flex items-center rounded-xl bg-o-surface-2 pr-3">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 w-full bg-transparent px-3.5 text-sm text-o-text outline-none"
        />
        <span className="text-xs text-o-faint">{suffix}</span>
      </div>
    </label>
  );
}

export function SettingsView({
  settings,
  location,
  onUpdate,
  onReset,
  onPresetChange,
  onCoordsChange,
  onLocateMe,
  isLocating,
  locationStatusMessage,
  locationErrorMessage,
}: SettingsViewProps) {
  const [query, setQuery] = useState("");
  const [isApplying, setIsApplying] = useState(false);
  const { results, isSearching, error: searchError, setError: setSearchError } = useCitySearch(query);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const notifications = settings.notifications;
  const recents = settings.recentLocations.filter(
    (recent) =>
      recent.label !== location.label ||
      recent.latitude.toFixed(3) !== location.latitude.toFixed(3)
  );

  const toggleNotifications = async (enabled: boolean) => {
    setNotificationError("");

    if (!enabled) {
      onUpdate({ notifications: { enabled: false } });
      return;
    }

    const permission = await requestNotificationPermission();
    if (permission === "granted") {
      onUpdate({ notifications: { enabled: true } });
    } else if (permission === "unsupported") {
      setNotificationError("Notifications aren't supported here.");
    } else {
      setNotificationError("Permission was denied. Allow notifications for Orbit in your settings.");
    }
  };
  const adjustments = settings.prayerAdjustments;
  const methodDefaults = useMemo(
    () => getMethodDefaults(settings.prayerMethod),
    [settings.prayerMethod]
  );

  const selectResult = async (result: SearchResult) => {
    try {
      setIsApplying(true);
      setSearchError("");
      const timeZone = await resolveTimeZone(result.latitude, result.longitude);
      onCoordsChange({
        label: result.label,
        latitude: result.latitude,
        longitude: result.longitude,
        timeZone,
      });
      setQuery("");
    } catch {
      setSearchError("Could not resolve the time zone for that place.");
    } finally {
      setIsApplying(false);
    }
  };

  const toggleCustomAngles = (enabled: boolean) => {
    if (!enabled) {
      onUpdate({ prayerAdjustments: { enabled: false } });
      return;
    }

    onUpdate({
      prayerAdjustments: {
        enabled: true,
        fajrAngle: methodDefaults.fajrAngle,
        ishaAngle: methodDefaults.ishaAngle,
        ishaInterval: methodDefaults.ishaInterval,
        maghribAngle: methodDefaults.maghribAngle ?? 0,
        useIshaInterval: methodDefaults.ishaInterval > 0,
        useMaghribAngle: methodDefaults.maghribAngle !== null,
      },
    });
  };

  const presets = Object.entries(locationPresets) as [PresetKey, LocationPreset][];
  const errorMessage = locationErrorMessage || searchError;

  return (
    <div className="orbit-fade grid grid-cols-1 gap-6">
      <header className="pt-1">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight">Settings</h1>
      </header>

      <div>
        <SectionLabel>Location</SectionLabel>
        <Panel className="divide-y divide-o-line">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-medium">{location.label}</div>
              <div className="mt-0.5 truncate text-xs text-o-faint">
                {formatTimeZoneLabel(location.timeZone)} ·{" "}
                {formatCoordinate(location.latitude, "lat")},{" "}
                {formatCoordinate(location.longitude, "lng")}
              </div>
              {location.label === "Current location" && settings.lastCurrentLocationAt ? (
                <div className="mt-0.5 text-xs text-o-faint">
                  {formatLocationUpdatedAt(settings.lastCurrentLocationAt)}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onLocateMe}
              disabled={isLocating}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-o-accent px-3.5 text-sm font-medium text-o-on-accent transition active:scale-[0.98] disabled:opacity-70"
            >
              {isLocating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="h-4 w-4" />
              )}
              Locate
            </button>
          </div>

          <div className="grid gap-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-o-faint" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a city"
                aria-label="Search a city"
                enterKeyHint="search"
                className={cn(inputClass, "pl-10", query && "pr-10")}
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute top-1/2 right-2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-o-faint"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {query.trim().length >= 2 ? (
              <div className="overflow-hidden rounded-xl border border-o-line">
                {isSearching || isApplying ? (
                  <div className="flex items-center gap-2 px-3.5 py-3 text-sm text-o-muted">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    {isApplying ? "Applying…" : "Searching…"}
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-3.5 py-3 text-sm text-o-muted">No places found.</div>
                ) : (
                  <ul className="divide-y divide-o-line">
                    {results.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => void selectResult(result)}
                          className="w-full px-3.5 py-2.5 text-left transition hover:bg-o-surface-2"
                        >
                          <div className="text-sm font-medium">{result.label}</div>
                          {result.subtitle ? (
                            <div className="mt-0.5 truncate text-xs text-o-faint">
                              {result.subtitle}
                            </div>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="grid gap-2.5">
                {recents.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {recents.map((recent) => (
                      <button
                        key={`${recent.label}-${recent.latitude}`}
                        type="button"
                        onClick={() => onCoordsChange(recent)}
                        className="flex h-8 max-w-full items-center gap-1.5 rounded-full border border-o-line px-3 text-xs font-medium text-o-text transition hover:bg-o-surface-2"
                      >
                        <History className="h-3 w-3 shrink-0 text-o-faint" />
                        <span className="truncate">{recent.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              <div className="flex flex-wrap gap-2">
                {presets.map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onPresetChange(key)}
                    className={cn(
                      "h-8 rounded-full px-3 text-xs font-medium transition",
                      settings.selectedLocation === key
                        ? "bg-o-text text-o-bg"
                        : "bg-o-surface-2 text-o-muted hover:text-o-text"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              </div>
            )}

            {locationStatusMessage ? (
              <div className="text-xs text-o-muted">{locationStatusMessage}</div>
            ) : null}
            {errorMessage ? <div className="text-xs text-o-danger">{errorMessage}</div> : null}
          </div>

          <Row label="Locate on startup" hint="Refresh your position each time the app opens.">
            <Switch
              label="Locate on startup"
              checked={settings.automaticLocation}
              onChange={(automaticLocation) => onUpdate({ automaticLocation })}
            />
          </Row>

          <Disclosure title="Enter coordinates">
            <ManualCoordinates
              key={`${location.latitude}:${location.longitude}`}
              location={location}
              onApply={onCoordsChange}
              onError={setSearchError}
            />
          </Disclosure>
        </Panel>
      </div>

      <div>
        <SectionLabel>Prayer times</SectionLabel>
        <Panel className="divide-y divide-o-line">
          <Row label="Method">
            <NativeSelect
              label="Calculation method"
              value={settings.prayerMethod}
              onChange={(prayerMethod) => onUpdate({ prayerMethod })}
              options={methodOptions}
            />
          </Row>
          <Row label="Asr" hint={settings.madhab === "hanafi" ? "Hanafi (later Asr)" : "Shafi, Maliki, Hanbali"}>
            <Segmented
              value={settings.madhab}
              onChange={(madhab) => onUpdate({ madhab })}
              options={[
                { value: "shafi", label: "Standard" },
                { value: "hanafi", label: "Hanafi" },
              ]}
              className="w-44"
            />
          </Row>
          <Row label="Time format">
            <Segmented
              value={settings.timeFormat}
              onChange={(timeFormat) => onUpdate({ timeFormat })}
              options={[
                { value: "24h", label: "24h" },
                { value: "12h", label: "12h" },
              ]}
              className="w-44"
            />
          </Row>

          <Disclosure title="Custom angles">
            <div className="grid gap-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-o-muted">Override the method's angles</span>
                <Switch
                  label="Custom angles"
                  checked={adjustments.enabled}
                  onChange={toggleCustomAngles}
                />
              </div>

              {adjustments.enabled ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <AngleField
                      label="Fajr angle"
                      value={adjustments.fajrAngle}
                      suffix="°"
                      onChange={(fajrAngle) => onUpdate({ prayerAdjustments: { fajrAngle } })}
                    />
                    {adjustments.useIshaInterval ? (
                      <AngleField
                        label="Isha after Maghrib"
                        value={adjustments.ishaInterval}
                        suffix="min"
                        onChange={(value) =>
                          onUpdate({ prayerAdjustments: { ishaInterval: Math.max(0, value) } })
                        }
                      />
                    ) : (
                      <AngleField
                        label="Isha angle"
                        value={adjustments.ishaAngle}
                        suffix="°"
                        onChange={(ishaAngle) => onUpdate({ prayerAdjustments: { ishaAngle } })}
                      />
                    )}
                    {adjustments.useMaghribAngle ? (
                      <AngleField
                        label="Maghrib angle"
                        value={adjustments.maghribAngle}
                        suffix="°"
                        onChange={(maghribAngle) =>
                          onUpdate({ prayerAdjustments: { maghribAngle } })
                        }
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-o-muted">Isha as minutes after Maghrib</span>
                    <Switch
                      label="Isha as minutes after Maghrib"
                      checked={adjustments.useIshaInterval}
                      onChange={(useIshaInterval) =>
                        onUpdate({
                          prayerAdjustments: {
                            useIshaInterval,
                            ishaInterval: useIshaInterval
                              ? adjustments.ishaInterval || methodDefaults.ishaInterval || 90
                              : adjustments.ishaInterval,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-o-muted">Maghrib by angle, not sunset</span>
                    <Switch
                      label="Maghrib by angle"
                      checked={adjustments.useMaghribAngle}
                      onChange={(useMaghribAngle) =>
                        onUpdate({
                          prayerAdjustments: {
                            useMaghribAngle,
                            maghribAngle: useMaghribAngle
                              ? adjustments.maghribAngle || methodDefaults.maghribAngle || 4
                              : adjustments.maghribAngle,
                          },
                        })
                      }
                    />
                  </div>
                </>
              ) : null}
            </div>
          </Disclosure>
        </Panel>
      </div>

      <div>
        <SectionLabel>Reminders &amp; tracker</SectionLabel>
        <Panel className="divide-y divide-o-line">
          <Row
            label={
              <span className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-o-accent" />
                Prayer alerts
              </span>
            }
            hint={notificationError || "Scheduled a week ahead, even when the app is closed."}
          >
            <Switch
              label="Prayer alerts"
              checked={notifications.enabled}
              onChange={(enabled) => void toggleNotifications(enabled)}
            />
          </Row>

          {notifications.enabled ? (
            <div className="grid gap-4 px-4 py-4">
              <div className="grid grid-cols-5 gap-1.5">
                {FARD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={notifications[key]}
                    onClick={() => onUpdate({ notifications: { [key]: !notifications[key] } })}
                    className={cn(
                      "h-9 rounded-xl text-[13px] font-medium transition",
                      notifications[key]
                        ? "bg-o-accent-soft text-o-accent ring-1 ring-o-accent/40 ring-inset"
                        : "bg-o-surface-2 text-o-faint line-through"
                    )}
                  >
                    {PRAYER_LABELS[key]}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                <span className="text-xs text-o-faint">Remind me</span>
                <Segmented
                  value={String(notifications.minutesBefore)}
                  onChange={(value) => onUpdate({ notifications: { minutesBefore: Number(value) } })}
                  options={[
                    { value: "0", label: "At adhan" },
                    { value: "10", label: "10 min" },
                    { value: "15", label: "15 min" },
                    { value: "30", label: "30 min" },
                  ]}
                />
              </div>
            </div>
          ) : null}

          <Row label="Prayer tracker" hint="Tick off prayers and see your week.">
            <Switch
              label="Prayer tracker"
              checked={settings.showTracker}
              onChange={(showTracker) => onUpdate({ showTracker })}
            />
          </Row>
        </Panel>
      </div>

      <div>
        <SectionLabel>Hijri date</SectionLabel>
        <Panel className="divide-y divide-o-line">
          <Row
            label="Calendar"
            hint={settings.hijriMethod === "local" ? "Date changes at Maghrib." : undefined}
          >
            <NativeSelect
              label="Hijri calendar"
              value={settings.hijriMethod}
              onChange={(hijriMethod) => onUpdate({ hijriMethod })}
              options={hijriOptions}
            />
          </Row>
          <Row label="Adjustment" hint="Shift if your community's date differs.">
            <div className="flex items-center gap-1 rounded-xl bg-o-surface-2 p-1">
              <button
                type="button"
                aria-label="One day earlier"
                onClick={() => onUpdate({ hijriAdjustment: Math.max(-2, settings.hijriAdjustment - 1) })}
                className="h-8 w-8 rounded-lg text-lg text-o-text transition hover:bg-o-surface"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium tabular-nums">
                {settings.hijriAdjustment > 0 ? `+${settings.hijriAdjustment}` : settings.hijriAdjustment}
              </span>
              <button
                type="button"
                aria-label="One day later"
                onClick={() => onUpdate({ hijriAdjustment: Math.min(2, settings.hijriAdjustment + 1) })}
                className="h-8 w-8 rounded-lg text-lg text-o-text transition hover:bg-o-surface"
              >
                +
              </button>
            </div>
          </Row>
        </Panel>
      </div>

      <div>
        <SectionLabel>Appearance</SectionLabel>
        <Panel>
          <Row label="Theme">
            <Segmented
              value={settings.theme}
              onChange={(theme) => onUpdate({ theme })}
              options={[
                { value: "system", label: "Auto" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              className="w-56"
            />
          </Row>
        </Panel>
      </div>

      <button
        type="button"
        onClick={() => {
          if (confirmReset) {
            onReset();
            setConfirmReset(false);
          } else {
            setConfirmReset(true);
          }
        }}
        onBlur={() => setConfirmReset(false)}
        className={cn(
          "h-12 rounded-2xl border border-o-line bg-o-surface text-sm font-medium transition",
          confirmReset ? "text-o-danger" : "text-o-muted"
        )}
      >
        {confirmReset ? "Tap again to reset everything" : "Reset settings"}
      </button>

      <footer className="flex flex-col items-center gap-2 pt-2 pb-4 text-center">
        <img src="/favicon.svg" alt="" className="h-12 w-12 rounded-[14px]" />
        <div className="text-sm font-semibold">Orbit</div>
        <div className="text-xs text-o-faint">Prayer times, Qibla &amp; Hijri calendar</div>
      </footer>
    </div>
  );
}
