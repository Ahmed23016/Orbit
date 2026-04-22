import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  LoaderCircle,
  LocateFixed,
  MapPin,
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
import { calculationMethods, getMethodDetails, locationPresets } from "@/lib/orbit/constants";
import { resolveTimeZone } from "@/lib/orbit/location";
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
  selectedPreset: LocationSelectionKey;
  currentLocation: LocationPreset;
  onMethodChange: (value: MethodKey) => void;
  onMadhabChange: (value: MadhabKey) => void;
  onHijriMethodChange: (value: HijriMethodKey) => void;
  onHijriAdjustmentChange: (value: number) => void;
  onPresetChange: (value: PresetKey) => void;
  onLocateMe: () => void;
  onCoordsChange: (value: LocationPreset) => void;
  isLocating?: boolean;
  isResolvingLocationTimeZone?: boolean;
  locationStatusMessage?: string;
  locationErrorMessage?: string;
  lastCurrentLocationAt?: string | null;
};

type ManualCoordinateFormProps = {
  currentLocation: LocationPreset;
  onCoordsChange: (value: LocationPreset) => void;
  onErrorChange: (value: string) => void;
};

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
    <div className="grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.04] p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Latitude</span>
        <input
          value={latInput}
          onChange={(event) => setLatInput(event.target.value)}
          placeholder="52.3676"
          className="h-11 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Longitude</span>
        <input
          value={lngInput}
          onChange={(event) => setLngInput(event.target.value)}
          placeholder="4.9041"
          className="h-11 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
        />
      </label>

      <Button
        onClick={applyManualCoordinates}
        disabled={isResolving}
        className="h-11 rounded-2xl bg-amber-300 text-slate-950 shadow-none hover:bg-amber-200"
      >
        {isResolving ? "Resolving..." : "Apply coords"}
      </Button>
    </div>
  );
}

export function OrbitControls({
  method,
  madhab,
  hijriMethod,
  hijriAdjustment,
  selectedPreset,
  currentLocation,
  onMethodChange,
  onMadhabChange,
  onHijriMethodChange,
  onHijriAdjustmentChange,
  onPresetChange,
  onLocateMe,
  onCoordsChange,
  isLocating = false,
  isResolvingLocationTimeZone = false,
  locationStatusMessage = "",
  locationErrorMessage = "",
  lastCurrentLocationAt = null,
}: OrbitControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isApplyingResult, setIsApplyingResult] = useState(false);

  const deferredQuery = useDeferredValue(query.trim());
  const methodDetails = useMemo(() => getMethodDetails(method), [method]);

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

  return (
    <details
      className="orbit-panel rounded-[30px] p-4 md:p-5"
      open={isOpen}
      onToggle={(event) => setIsOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.34em] text-amber-100/70">
            <SlidersHorizontal className="h-4 w-4" />
            Control deck
          </div>
          <div className="mt-2 text-sm text-slate-300">
            Basic view stays light. Open this for city search, coordinates, methods, and
            angles.
          </div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </summary>

      {isOpen ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
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
                <SelectItem value="local">Local mosque / moon sighting</SelectItem>
                <SelectItem value="calculated">Calculated</SelectItem>
                <SelectItem value="ummalqura">Saudi / Umm al-Qura</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.04] p-3 md:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-3">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                Fajr angle
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {methodDetails.fajrAngle} deg
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-3">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                Isha angle
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {methodDetails.ishaInterval > 0
                  ? `${methodDetails.ishaInterval} min`
                  : `${methodDetails.ishaAngle} deg`}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-3">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                Maghrib angle
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {methodDetails.maghribAngle ?? "Sunset"}
                {methodDetails.maghribAngle ? " deg" : ""}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-3">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                Time zone
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {formatTimeZoneLabel(currentLocation.timeZone)}
              </div>
            </div>
          </div>

          {hijriMethod === "local" ? (
            <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">
                    Local Hijri adjustment
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    Use this if your mosque announces the month a day earlier or later.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onHijriAdjustmentChange(Math.max(-2, hijriAdjustment - 1))}
                    className="h-10 w-10 rounded-2xl border border-white/10 bg-slate-950/60 text-white transition hover:border-cyan-300/30"
                  >
                    -
                  </button>
                  <div className="min-w-20 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-center font-medium text-white">
                    {hijriAdjustment > 0 ? `+${hijriAdjustment}` : hijriAdjustment}
                  </div>
                  <button
                    type="button"
                    onClick={() => onHijriAdjustmentChange(Math.min(2, hijriAdjustment + 1))}
                    className="h-10 w-10 rounded-2xl border border-white/10 bg-slate-950/60 text-white transition hover:border-cyan-300/30"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search any city or place"
                className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950/60 pl-11 pr-4 text-sm text-white outline-none transition focus:border-amber-300/40 focus:bg-slate-950/75"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPresets.map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPresetChange(key)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    selectedPreset === key
                      ? "border-amber-300/30 bg-amber-300/15 text-amber-50"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {query.trim().length >= 2 ? (
              <div className="rounded-[24px] border border-white/10 bg-slate-950/55 p-3">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-400">
                  <span>Search results</span>
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
                      className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-amber-300/20 hover:bg-amber-300/[0.06]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-white">{result.label}</span>
                        <span className="text-xs text-slate-400">
                          {result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}
                        </span>
                      </div>
                      {result.subtitle ? (
                        <div className="mt-1 text-sm text-slate-400">{result.subtitle}</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <ManualCoordinateForm
            key={`${currentLocation.latitude}:${currentLocation.longitude}:${currentLocation.label}`}
            currentLocation={currentLocation}
            onCoordsChange={onCoordsChange}
            onErrorChange={setSearchError}
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={onLocateMe}
              disabled={isLocating}
              className="h-11 flex-1 rounded-2xl bg-cyan-300 text-slate-950 shadow-none hover:bg-cyan-200"
            >
              {isLocating ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="mr-2 h-4 w-4" />
              )}
              {isLocating ? "Getting location..." : "Use my location"}
            </Button>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm text-slate-300">
              <MapPin className="h-4 w-4 text-amber-200" />
              Active location: <span className="font-medium text-white">{currentLocation.label}</span>
            </div>
          </div>

          {currentLocation.label === "Current location" && lastCurrentLocationAt ? (
            <div className="text-sm text-slate-400">
              {formatLocationUpdatedAt(lastCurrentLocationAt)}
            </div>
          ) : null}

          {locationStatusMessage ? (
            <div className="flex items-center gap-2 text-sm text-cyan-200">
              {isLocating || isResolvingLocationTimeZone ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {locationStatusMessage}
            </div>
          ) : null}

          {locationErrorMessage ? (
            <div className="text-sm text-rose-300">{locationErrorMessage}</div>
          ) : null}

          {isLocating && !locationStatusMessage ? (
            <div className="flex items-center gap-2 text-sm text-cyan-200">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Finding your coordinates and resolving the local time zone...
            </div>
          ) : null}

          {searchError ? <div className="text-sm text-rose-300">{searchError}</div> : null}
        </div>
      ) : null}
    </details>
  );
}
