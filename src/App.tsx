import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  LoaderCircle,
  Moon,
  Sparkles,
  Sunrise,
  Sunset,
} from "lucide-react";

import "./App.css";

import { DailySummaryCard } from "@/components/orbit/DailySummaryCard";
import { NextPrayerCard } from "@/components/orbit/NextPrayerCard";
import { OrbitControls } from "@/components/orbit/OrbitControls";
import { OrbitHero } from "@/components/orbit/OrbitHero";
import { PrayerGrid } from "@/components/orbit/PrayerGrid";
import { StatsGrid } from "@/components/orbit/StatsGrid";

import { useNow } from "@/hooks/orbit/useNow";
import { useIsMobile } from "@/hooks/orbit/useIsMobile";
import { useOrbitData } from "@/hooks/orbit/useOrbitData";
import { useSettings } from "@/hooks/useSettings";

import { locationPresets } from "@/lib/orbit/constants";
import { resolveTimeZone } from "@/lib/orbit/location";
import {
  formatDate,
  formatDateInputValue,
  formatIslamicDate,
  formatTime,
  getDateInTimeZone,
  isSameDayInTimeZone,
  addDays,
  parseDateInputValue,
} from "@/lib/orbit/time";
import type { LocationPreset, PresetKey } from "@/lib/orbit/types";

const SolarChartCard = lazy(() =>
  import("@/components/orbit/SolarChartCard").then((module) => ({
    default: module.SolarChartCard,
  }))
);

const PrayerSpacingCard = lazy(() =>
  import("@/components/orbit/PrayerSpacingCard").then((module) => ({
    default: module.PrayerSpacingCard,
  }))
);

export default function App() {
  const { settings, updateSettings, isReady } = useSettings();

  const coords = useMemo(
    () =>
      settings.selectedLocation === "custom"
        ? (settings.customCoords ?? locationPresets.amsterdam)
        : locationPresets[settings.selectedLocation],
    [settings.selectedLocation, settings.customCoords]
  );

  const now = useNow(60000);
  const isMobile = useIsMobile();
  const [showSolarDetails, setShowSolarDetails] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    getDateInTimeZone(new Date(), coords.timeZone)
  );

  const { prayers, moon, nextPrayer, prayerMarkers, chartData, stats, spacingData, currentDay } =
    useOrbitData(
      now,
      selectedDate,
      coords.latitude,
      coords.longitude,
      coords.timeZone,
      settings.prayerMethod,
      settings.madhab
    );

  const hijriSourceDate = useMemo(() => {
    const todayInLocation = getDateInTimeZone(now, coords.timeZone);
    const shouldRollAtMaghrib =
      settings.hijriMethod === "local" &&
      isSameDayInTimeZone(currentDay, todayInLocation, coords.timeZone) &&
      now.getTime() >= prayers.maghrib.getTime();

    return shouldRollAtMaghrib ? addDays(currentDay, 1) : currentDay;
  }, [settings.hijriMethod, currentDay, now, coords.timeZone, prayers.maghrib]);

  const locateMe = useCallback(() => {
    if (!navigator.geolocation) return;

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const timeZone =
            (await resolveTimeZone(pos.coords.latitude, pos.coords.longitude)) ||
            Intl.DateTimeFormat().resolvedOptions().timeZone;

          const customCoords: LocationPreset = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: "Current location",
            timeZone,
          };
          void updateSettings({ selectedLocation: "custom", customCoords });
          setSelectedDate(getDateInTimeZone(new Date(), timeZone));
        } catch {
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const customCoords: LocationPreset = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            label: "Current location",
            timeZone,
          };
          void updateSettings({ selectedLocation: "custom", customCoords });
          setSelectedDate(getDateInTimeZone(new Date(), timeZone));
        } finally {
          setIsLocating(false);
        }
      },
      () => {
        setIsLocating(false);
        alert("Could not get your location.");
      }
    );
  }, [updateSettings]);

  useEffect(() => {
    if (!isReady || !settings.automaticLocation) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      locateMe();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isReady, settings.automaticLocation, locateMe]);

  const handlePresetChange = (key: PresetKey) => {
    void updateSettings({ selectedLocation: key, customCoords: null });
    setSelectedDate(getDateInTimeZone(now, locationPresets[key].timeZone));
  };

  const handleCoordsChange = (location: LocationPreset) => {
    void updateSettings({ selectedLocation: "custom", customCoords: location });
    setSelectedDate(getDateInTimeZone(now, location.timeZone));
  };

  const prayerItems = useMemo(
    () => [
      { title: "Fajr", value: formatTime(prayers.fajr, coords.timeZone), icon: Clock3 },
      { title: "Sunrise", value: formatTime(prayers.sunrise, coords.timeZone), icon: Sunrise },
      { title: "Dhuhr", value: formatTime(prayers.dhuhr, coords.timeZone), icon: Clock3 },
      { title: "Asr", value: formatTime(prayers.asr, coords.timeZone), icon: Clock3 },
      { title: "Maghrib", value: formatTime(prayers.maghrib, coords.timeZone), icon: Sunset },
      { title: "Isha", value: formatTime(prayers.isha, coords.timeZone), icon: Clock3 },
      { title: "Moon phase", value: moon.phaseName, icon: Moon },
      { title: "Moon light", value: `${moon.illumination}%`, icon: Sparkles },
    ],
    [prayers, moon, coords.timeZone]
  );

  if (!isReady) {
    return (
      <div className="orbit-shell min-h-screen w-full text-slate-100">
        <div className="orbit-safe relative w-full py-5 md:px-6 lg:px-8">
          <div className="orbit-loading-panel flex h-48 items-center justify-center rounded-[30px]">
            <div className="flex flex-col items-center gap-3 text-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-cyan-300" />
              <div className="text-lg font-medium text-white">Loading Orbit</div>
              <div className="text-sm text-slate-400">
                Restoring your settings and preparing today&apos;s prayer data.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orbit-shell min-h-screen w-full text-slate-100">
      <div className="orbit-shell__glow orbit-shell__glow--one" />
      <div className="orbit-shell__glow orbit-shell__glow--two" />
      <div className="orbit-shell__grid" />

      <div className="orbit-safe relative w-full py-5 md:px-6 lg:px-8">
        <div className="grid gap-4">
          <OrbitHero
            label={coords.label}
            latitude={coords.latitude}
            longitude={coords.longitude}
            now={now}
            timeZone={coords.timeZone}
          />

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <NextPrayerCard
              nextPrayer={nextPrayer}
              method={settings.prayerMethod}
              madhab={settings.madhab}
              timeZone={coords.timeZone}
            />

            <OrbitControls
              method={settings.prayerMethod}
              madhab={settings.madhab}
              hijriMethod={settings.hijriMethod}
              hijriAdjustment={settings.hijriAdjustment}
              selectedPreset={settings.selectedLocation}
              currentLocation={coords}
              onMethodChange={(prayerMethod) => void updateSettings({ prayerMethod })}
              onMadhabChange={(madhab) => void updateSettings({ madhab })}
              onHijriMethodChange={(hijriMethod) => void updateSettings({ hijriMethod })}
              onHijriAdjustmentChange={(hijriAdjustment) =>
                void updateSettings({ hijriAdjustment })
              }
              onPresetChange={handlePresetChange}
              onLocateMe={locateMe}
              onCoordsChange={handleCoordsChange}
              isLocating={isLocating}
            />
          </div>

          <div className="rounded-[30px] border border-white/10 bg-slate-950/55 p-4 backdrop-blur-xl">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.34em] text-amber-100/70">
                  <CalendarDays className="h-4 w-4" />
                  Viewing day
                </div>
                <div className="mt-2 text-xl font-semibold text-white">
                  {formatDate(currentDay, coords.timeZone)}
                </div>
                <div className="mt-1 text-sm font-medium text-amber-200">
                  Hijri:{" "}
                  {formatIslamicDate(
                    hijriSourceDate,
                    coords.timeZone,
                    settings.hijriMethod,
                    settings.hijriAdjustment
                  )}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  Choose any day and Orbit will show that day's prayer times. Default is today.
                  In local mode, the Hijri date rolls after Maghrib.
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="date"
                  value={formatDateInputValue(selectedDate, coords.timeZone)}
                  onChange={(event) => {
                    const parsed = parseDateInputValue(event.target.value);
                    if (parsed) {
                      setSelectedDate(parsed);
                    }
                  }}
                  className="h-11 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
                />

                <button
                  type="button"
                  onClick={() => setSelectedDate(getDateInTimeZone(now, coords.timeZone))}
                  className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.08]"
                >
                  Jump to today
                </button>
              </div>
            </div>
          </div>

          <PrayerGrid items={prayerItems} />

          {isMobile ? (
            <div className="orbit-mobile-summary rounded-[24px] p-4">
              <div className="text-lg font-semibold text-white">Phone view</div>
              <div className="mt-1 text-sm text-slate-400">
                Graphs are hidden on smaller screens to keep Orbit fast and readable.
              </div>

              <div className="mt-4">
                <StatsGrid stats={stats} moon={moon} />
              </div>
            </div>
          ) : (
            <details
              className="orbit-deferred-section rounded-[30px] border border-white/10 bg-slate-950/50 p-4 backdrop-blur-xl"
              open={showSolarDetails}
              onToggle={(event) =>
                setShowSolarDetails((event.target as HTMLDetailsElement).open)
              }
            >
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-white">Expanded daily insights</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Solar curve, spacing chart, Qibla compass, and supporting data.
                  </div>
                </div>
                <ChevronDown className="h-5 w-5 text-slate-400" />
              </summary>

              <div className="mt-4 grid gap-4">
                {showSolarDetails ? (
                  <Suspense
                    fallback={
                      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
                        <div className="orbit-loading-panel h-[420px] rounded-[30px]" />
                        <div className="orbit-loading-panel h-[320px] rounded-[30px]" />
                      </div>
                    }
                  >
                    <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
                      <SolarChartCard
                        chartData={chartData}
                        prayerMarkers={prayerMarkers}
                        timeZone={coords.timeZone}
                      />
                      <PrayerSpacingCard spacingData={spacingData} />
                    </div>
                  </Suspense>
                ) : null}

                <StatsGrid stats={stats} moon={moon} />
              </div>
            </details>
          )}

          <DailySummaryCard
            stats={stats}
            moon={moon}
            nextPrayer={nextPrayer}
            method={settings.prayerMethod}
            cityLabel={coords.label}
            latitude={coords.latitude}
            longitude={coords.longitude}
            timeZone={coords.timeZone}
          />
        </div>
      </div>
    </div>
  );
}
