import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  LoaderCircle,
  LocateFixed,
  MapPin,
  MoonStar,
  Palette,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculationMethods,
  getMethodDefaults,
  getMethodDetails,
  locationPresets,
} from "@/lib/orbit/constants";
import { resolveTimeZone } from "@/lib/orbit/location";
import type {
  NotificationSettings,
  PrayerAdjustmentSettings,
  ThemePreference,
} from "@/lib/orbit/settings";
import { cn } from "@/lib/utils";
import { formatLocationUpdatedAt, formatTimeZoneLabel } from "@/lib/orbit/time";
import type {
  HijriMethodKey,
  LocationPreset,
  LocationSelectionKey,
  MadhabKey,
  MethodKey,
  PresetKey,
} from "@/lib/orbit/types";

type SearchResult = {
  id: string;
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
};

type OrbitControlsProps = {
  method: MethodKey;
  madhab: MadhabKey;
  hijriMethod: HijriMethodKey;
  hijriAdjustment: number;
  prayerAdjustments: PrayerAdjustmentSettings;
  theme: ThemePreference;
  automaticLocation: boolean;
  notifications: NotificationSettings;
  selectedPreset: LocationSelectionKey;
  currentLocation: LocationPreset;
  onMethodChange: (value: MethodKey) => void;
  onMadhabChange: (value: MadhabKey) => void;
  onHijriMethodChange: (value: HijriMethodKey) => void;
  onHijriAdjustmentChange: (value: number) => void;
  onPrayerAdjustmentsChange: (value: Partial<PrayerAdjustmentSettings>) => void;
  onThemeChange: (value: ThemePreference) => void;
  onAutomaticLocationChange: (value: boolean) => void;
  onNotificationsChange: (value: Partial<NotificationSettings>) => void;
  onResetSettings: () => void;
  onPresetChange: (value: PresetKey) => void;
  onLocateMe: () => void;
  onCoordsChange: (value: LocationPreset) => void;
  isLocating?: boolean;
  isResolvingLocationTimeZone?: boolean;
  locationStatusMessage?: string;
  locationErrorMessage?: string;
  lastCurrentLocationAt?: string | null;
  compact?: boolean;
};

type ManualCoordinateFormProps = {
  currentLocation: LocationPreset;
  onCoordsChange: (value: LocationPreset) => void;
  onErrorChange: (value: string) => void;
};

const themeOptions: Array<{ value: ThemePreference; label: string }> = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const notificationPrayerOptions: Array<{
  key: keyof Omit<NotificationSettings, "enabled" | "minutesBefore">;
  label: string;
}> = [
  { key: "fajr", label: "Fajr" },
  { key: "dhuhr", label: "Dhuhr" },
  { key: "asr", label: "Asr" },
  { key: "maghrib", label: "Maghrib" },
  { key: "isha", label: "Isha" },
];

function DeckSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4 flex flex-col gap-1">
        <div className="text-[11px] font-medium uppercase tracking-[0.3em] text-slate-400">
          {title}
        </div>
        {hint ? <div className="text-sm text-slate-500">{hint}</div> : null}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function SummaryChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
      {children}
    </span>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-white"
      />
    </label>
  );
}

function SegmentedChoice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-11 rounded-2xl border text-sm font-medium transition",
            value === option.value
              ? "border-white/20 bg-white text-slate-950"
              : "border-white/10 bg-slate-950/55 text-slate-300 hover:border-white/20 hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AngleInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-4">
        <input
          type="number"
          step="0.1"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 w-full bg-transparent text-sm text-white outline-none"
        />
        <span className="text-sm text-slate-500">{suffix}</span>
      </div>
    </label>
  );
}

function ManualCoordinateForm({
  currentLocation,
  onCoordsChange,
  onErrorChange,
}: ManualCoordinateFormProps) {
  const [latInput, setLatInput] = useState(String(currentLocation.latitude));
  const [lngInput, setLngInput] = useState(String(currentLocation.longitude));
  const [isResolving, setIsResolving] = useState(false);

  const applyManualCoordinates = async () => {
    const latitude = Number(latInput);
    const longitude = Number(lngInput);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      onErrorChange("Latitude and longitude need valid numbers.");
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      onErrorChange("Latitude must be between -90 and 90, longitude between -180 and 180.");
      return;
    }

    try {
      setIsResolving(true);
      onErrorChange("");
      const timeZone = await resolveTimeZone(latitude, longitude);
      onCoordsChange({
        label: "Custom coordinates",
        latitude,
        longitude,
        timeZone,
      });
    } catch {
      onErrorChange("Could not resolve the time zone for those coordinates.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Latitude</span>
        <input
          value={latInput}
          onChange={(event) => setLatInput(event.target.value)}
          placeholder="52.3676"
          className="h-11 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm text-white outline-none transition focus:border-white/20"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Longitude</span>
        <input
          value={lngInput}
          onChange={(event) => setLngInput(event.target.value)}
          placeholder="4.9041"
          className="h-11 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm text-white outline-none transition focus:border-white/20"
        />
      </label>

      <Button
        onClick={applyManualCoordinates}
        disabled={isResolving}
        className="h-11 rounded-2xl bg-white text-slate-950 shadow-none hover:bg-slate-200"
      >
        {isResolving ? "Resolving..." : "Apply"}
      </Button>
    </div>
  );
}

export function OrbitControls({
  method,
  madhab,
  hijriMethod,
  hijriAdjustment,
  prayerAdjustments,
  theme,
  automaticLocation,
  notifications,
  selectedPreset,
  currentLocation,
  onMethodChange,
  onMadhabChange,
  onHijriMethodChange,
  onHijriAdjustmentChange,
  onPrayerAdjustmentsChange,
  onThemeChange,
  onAutomaticLocationChange,
  onNotificationsChange,
  onResetSettings,
  onPresetChange,
  onLocateMe,
  onCoordsChange,
  isLocating = false,
  isResolvingLocationTimeZone = false,
  locationStatusMessage = "",
  locationErrorMessage = "",
  lastCurrentLocationAt = null,
  compact = false,
}: OrbitControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isApplyingResult, setIsApplyingResult] = useState(false);

  const deferredQuery = useDeferredValue(query.trim());
  const methodDetails = useMemo(
    () => getMethodDetails(method, prayerAdjustments),
    [method, prayerAdjustments]
  );
  const methodDefaults = useMemo(() => getMethodDefaults(method), [method]);

  useEffect(() => {
    if (!isOpen || deferredQuery.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError("");

        const params = new URLSearchParams({
          q: deferredQuery,
          format: "jsonv2",
          limit: "6",
          addressdetails: "1",
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

        const nextResults = payload.map((item) => {
          const [label, ...rest] = item.display_name.split(",");
          return {
            id: String(item.place_id),
            label: label.trim(),
            subtitle: rest.join(",").trim(),
            latitude: Number(item.lat),
            longitude: Number(item.lon),
          };
        });

        startTransition(() => {
          setResults(nextResults);
          setIsSearching(false);
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setResults([]);
        setIsSearching(false);
        setSearchError("City search is unavailable right now.");
      }
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [deferredQuery, isOpen]);

  const quickPresets = useMemo(
    () => Object.entries(locationPresets) as [PresetKey, LocationPreset][],
    []
  );

  const selectSearchResult = async (result: SearchResult) => {
    try {
      setIsApplyingResult(true);
      setSearchError("");
      const timeZone = await resolveTimeZone(result.latitude, result.longitude);
      onCoordsChange({
        label: result.label,
        latitude: result.latitude,
        longitude: result.longitude,
        timeZone,
      });
      setQuery(result.label);
      setResults([]);
    } catch {
      setSearchError("Could not resolve the time zone for that location.");
    } finally {
      setIsApplyingResult(false);
    }
  };

  const enableCustomAngles = (enabled: boolean) => {
    if (!enabled) {
      onPrayerAdjustmentsChange({ enabled: false });
      return;
    }

    onPrayerAdjustmentsChange({
      enabled: true,
      fajrAngle: methodDefaults.fajrAngle,
      ishaAngle: methodDefaults.ishaAngle,
      ishaInterval: methodDefaults.ishaInterval,
      maghribAngle: methodDefaults.maghribAngle ?? 0,
      useIshaInterval: methodDefaults.ishaInterval > 0,
      useMaghribAngle: methodDefaults.maghribAngle !== null,
    });
  };

  const headerChips = [
    currentLocation.label,
    calculationMethods[method].label,
    themeOptions.find((option) => option.value === theme)?.label ?? "System",
    prayerAdjustments.enabled ? "Custom angles" : "Preset angles",
  ];

  return (
    <details
      className={cn(
        "orbit-panel orbit-panel--deck rounded-[30px] p-4 md:p-5",
        compact && "bg-slate-950/92"
      )}
      open={isOpen}
      onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.34em] text-slate-400">
            <SlidersHorizontal className="h-4 w-4" />
            {compact ? "Controls" : "Control deck"}
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {compact ? "Advanced controls" : "Appearance, location, calculation, alerts"}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {headerChips.map((chip) => (
              <SummaryChip key={chip}>{chip}</SummaryChip>
            ))}
          </div>
        </div>

        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </summary>

      {isOpen ? (
        <div className="mt-5 grid gap-4">
          <DeckSection title="Look">
            <SegmentedChoice value={theme} onChange={onThemeChange} options={themeOptions} />
          </DeckSection>

          <DeckSection title="Location" hint={formatTimeZoneLabel(currentLocation.timeZone)}>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={onLocateMe}
                disabled={isLocating}
                className="h-11 flex-1 rounded-2xl bg-white text-slate-950 shadow-none hover:bg-slate-200"
              >
                {isLocating ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="mr-2 h-4 w-4" />
                )}
                {isLocating ? "Locating..." : "Use my location"}
              </Button>

              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Active</span>
                <span className="font-medium text-white">{currentLocation.label}</span>
              </div>
            </div>

            <ToggleRow
              label="Automatic location"
              description="Update location on startup."
              checked={automaticLocation}
              onChange={onAutomaticLocationChange}
            />

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={compact ? "Search city" : "Search city or place"}
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 pl-11 pr-4 text-sm text-white outline-none transition focus:border-white/20"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPresets.map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPresetChange(key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition",
                    selectedPreset === key
                      ? "border-white/20 bg-white text-slate-950"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {query.trim().length >= 2 ? (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-3">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>Search</span>
                  <span>
                    {isApplyingResult
                      ? "Applying..."
                      : isSearching
                        ? "Searching..."
                        : `${results.length} found`}
                  </span>
                </div>

                <div className="grid gap-2">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => void selectSearchResult(result)}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-white/20 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-white">{result.label}</span>
                        <span className="text-xs text-slate-400">
                          {result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}
                        </span>
                      </div>
                      {result.subtitle ? (
                        <div className="mt-1 text-sm text-slate-500">{result.subtitle}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <ManualCoordinateForm
              key={`${currentLocation.latitude}:${currentLocation.longitude}:${currentLocation.label}`}
              currentLocation={currentLocation}
              onCoordsChange={onCoordsChange}
              onErrorChange={setSearchError}
            />

            {currentLocation.label === "Current location" && lastCurrentLocationAt ? (
              <div className="text-sm text-slate-500">
                {formatLocationUpdatedAt(lastCurrentLocationAt)}
              </div>
            ) : null}

            {locationStatusMessage ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                {isLocating || isResolvingLocationTimeZone ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : null}
                {locationStatusMessage}
              </div>
            ) : null}

            {locationErrorMessage ? (
              <div className="text-sm text-rose-300">{locationErrorMessage}</div>
            ) : null}

            {searchError ? <div className="text-sm text-rose-300">{searchError}</div> : null}
          </DeckSection>

          <DeckSection title="Calculation">
            <div className="grid gap-3 md:grid-cols-3">
              <Select value={method} onValueChange={(value) => onMethodChange(value as MethodKey)}>
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-slate-950/60 text-slate-100 shadow-none">
                  <SelectValue placeholder="Calculation method" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(calculationMethods).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={madhab} onValueChange={(value) => onMadhabChange(value as MadhabKey)}>
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-slate-950/60 text-slate-100 shadow-none">
                  <SelectValue placeholder="Madhab" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shafi">Shafi / Maliki / Hanbali</SelectItem>
                  <SelectItem value="hanafi">Hanafi</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={hijriMethod}
                onValueChange={(value) => onHijriMethodChange(value as HijriMethodKey)}
              >
                <SelectTrigger className="h-12 rounded-2xl border-white/10 bg-slate-950/60 text-slate-100 shadow-none">
                  <SelectValue placeholder="Hijri method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ummalqura">Saudi / Umm al-Qura</SelectItem>
                  <SelectItem value="local">Local moon sighting</SelectItem>
                  <SelectItem value="calculated">Calculated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Fajr</div>
                <div className="mt-2 text-2xl font-semibold text-white">{methodDetails.fajrAngle} deg</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Isha</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {methodDetails.ishaInterval > 0
                    ? `${methodDetails.ishaInterval} min`
                    : `${methodDetails.ishaAngle} deg`}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Maghrib</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {methodDetails.maghribAngle ?? "Sunset"}
                  {methodDetails.maghribAngle !== null ? " deg" : ""}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-3">
                <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Source</div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {prayerAdjustments.enabled ? "Custom" : "Preset"}
                </div>
              </div>
            </div>

            {hijriMethod === "local" ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-medium text-white">Hijri adjustment</div>
                  <div className="mt-1 text-sm text-slate-500">Shift by a day if needed.</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onHijriAdjustmentChange(Math.max(-2, hijriAdjustment - 1))}
                    className="h-10 w-10 rounded-2xl border border-white/10 bg-slate-950/60 text-white transition hover:border-white/20"
                  >
                    -
                  </button>
                  <div className="min-w-20 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-center font-medium text-white">
                    {hijriAdjustment > 0 ? `+${hijriAdjustment}` : hijriAdjustment}
                  </div>
                  <button
                    type="button"
                    onClick={() => onHijriAdjustmentChange(Math.min(2, hijriAdjustment + 1))}
                    className="h-10 w-10 rounded-2xl border border-white/10 bg-slate-950/60 text-white transition hover:border-white/20"
                  >
                    +
                  </button>
                </div>
              </div>
            ) : null}
          </DeckSection>

          <DeckSection title="Angles">
            <ToggleRow
              label="Custom angles"
              description="Override the selected preset."
              checked={prayerAdjustments.enabled}
              onChange={enableCustomAngles}
            />

            {prayerAdjustments.enabled ? (
              <>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <AngleInput
                    label="Fajr angle"
                    value={prayerAdjustments.fajrAngle}
                    onChange={(value) => onPrayerAdjustmentsChange({ fajrAngle: value })}
                    suffix="deg"
                  />

                  {prayerAdjustments.useIshaInterval ? (
                    <AngleInput
                      label="Isha interval"
                      value={prayerAdjustments.ishaInterval}
                      onChange={(value) =>
                        onPrayerAdjustmentsChange({ ishaInterval: Math.max(0, value) })
                      }
                      suffix="min"
                    />
                  ) : (
                    <AngleInput
                      label="Isha angle"
                      value={prayerAdjustments.ishaAngle}
                      onChange={(value) => onPrayerAdjustmentsChange({ ishaAngle: value })}
                      suffix="deg"
                    />
                  )}

                  {prayerAdjustments.useMaghribAngle ? (
                    <AngleInput
                      label="Maghrib angle"
                      value={prayerAdjustments.maghribAngle}
                      onChange={(value) => onPrayerAdjustmentsChange({ maghribAngle: value })}
                      suffix="deg"
                    />
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Maghrib</div>
                      <div className="mt-2 text-lg font-semibold text-white">Sunset</div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Preset</div>
                    <div className="mt-2 text-sm font-medium text-white">
                      {calculationMethods[method].label}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    label="Use Isha interval"
                    description="Switch from angle to minutes after Maghrib."
                    checked={prayerAdjustments.useIshaInterval}
                    onChange={(value) =>
                      onPrayerAdjustmentsChange({
                        useIshaInterval: value,
                        ishaInterval: value
                          ? Math.max(0, prayerAdjustments.ishaInterval || methodDefaults.ishaInterval)
                          : prayerAdjustments.ishaInterval,
                      })
                    }
                  />

                  <ToggleRow
                    label="Use Maghrib angle"
                    description="Use an angle instead of sunset."
                    checked={prayerAdjustments.useMaghribAngle}
                    onChange={(value) =>
                      onPrayerAdjustmentsChange({
                        useMaghribAngle: value,
                        maghribAngle: value
                          ? prayerAdjustments.maghribAngle || methodDefaults.maghribAngle || 4
                          : prayerAdjustments.maghribAngle,
                      })
                    }
                  />
                </div>
              </>
            ) : null}
          </DeckSection>

          <DeckSection title="Alerts">
            <ToggleRow
              label="Prayer notifications"
              description="Store your preferred alert setup."
              checked={notifications.enabled}
              onChange={(value) => onNotificationsChange({ enabled: value })}
            />

            {notifications.enabled ? (
              <>
                <div className="grid gap-3 md:grid-cols-[180px_1fr] md:items-end">
                  <AngleInput
                    label="Minutes before"
                    value={notifications.minutesBefore}
                    onChange={(value) =>
                      onNotificationsChange({ minutesBefore: Math.max(0, Math.round(value)) })
                    }
                    suffix="min"
                  />
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    {notificationPrayerOptions.map((option) => (
                      <label
                        key={option.key}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3"
                      >
                        <span className="text-sm text-white">{option.label}</span>
                        <input
                          type="checkbox"
                          checked={notifications[option.key]}
                          onChange={(event) =>
                            onNotificationsChange({ [option.key]: event.target.checked })
                          }
                          className="h-4 w-4 accent-white"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </DeckSection>

          <DeckSection title="Actions">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Palette className="h-4 w-4" />
                <span>{themeOptions.find((option) => option.value === theme)?.label ?? "System"} theme</span>
                <span className="text-slate-600">•</span>
                <MoonStar className="h-4 w-4" />
                <span>{prayerAdjustments.enabled ? "Custom calculation" : "Preset calculation"}</span>
                <span className="text-slate-600">•</span>
                <Bell className="h-4 w-4" />
                <span>{notifications.enabled ? "Alerts on" : "Alerts off"}</span>
              </div>

              <Button
                onClick={onResetSettings}
                variant="outline"
                className="h-11 rounded-2xl border-white/10 bg-slate-950/45 text-white hover:bg-white/[0.06]"
              >
                Reset settings
              </Button>
            </div>
          </DeckSection>
        </div>
      ) : null}
    </details>
  );
}
