import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { ViewingDayCard } from "@/components/orbit/ViewingDayCard";

import { useIsMobile } from "@/hooks/orbit/useIsMobile";
import { useOrbitData } from "@/hooks/orbit/useOrbitData";
import { useSettings } from "@/hooks/useSettings";

import { locationPresets } from "@/lib/orbit/constants";
import {
  getCurrentPosition,
  getLocationErrorMessage,
  getDeviceTimeZone,
  resolveTimeZone,
} from "@/lib/orbit/location";
import {
  formatTime,
  getDateInTimeZone,
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
  const { settings, updateSettings, resetSettings, isReady } = useSettings();
  const [prefersDark, setPrefersDark] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const coords = useMemo(
    () =>
      settings.selectedLocation === "custom"
        ? (settings.customCoords ?? locationPresets.amsterdam)
        : locationPresets[settings.selectedLocation],
    [settings.selectedLocation, settings.customCoords]
  );

  const isMobile = useIsMobile();
  const [showSolarDetails, setShowSolarDetails] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingLocationTimeZone, setIsResolvingLocationTimeZone] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState("");
  const [locationErrorMessage, setLocationErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    getDateInTimeZone(new Date(), coords.timeZone)
  );
  const locatingRef = useRef(false);
  const resolvedTheme =
    settings.theme === "system" ? (prefersDark ? "dark" : "light") : settings.theme;

  const { prayers, moon, prayerMarkers, chartData, stats, spacingData, currentDay } =
    useOrbitData(
      selectedDate,
      coords.latitude,
      coords.longitude,
      coords.timeZone,
      settings.prayerMethod,
      settings.madhab,
      settings.prayerAdjustments
    );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setPrefersDark(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);

    return () => media.removeEventListener("change", handleChange);
  }, []);

  const applyCurrentLocation = useCallback(
    (location: LocationPreset, recordedAt: string) => {
      void updateSettings({
        selectedLocation: "custom",
        customCoords: location,
        lastCurrentLocationAt: recordedAt,
      });
      setSelectedDate(getDateInTimeZone(new Date(), location.timeZone));
    },
    [updateSettings]
  );

  const locateMe = useCallback(async () => {
    if (locatingRef.current) {
      return;
    }

    locatingRef.current = true;
    setLocationErrorMessage("");
    setLocationStatusMessage("Requesting your current location...");
    setIsLocating(true);

    try {
      const position = await getCurrentPosition();
      const fallbackTimeZone = getDeviceTimeZone();
      const recordedAt = new Date(position.timestamp || Date.now()).toISOString();
      const immediateLocation: LocationPreset = {
        latitude: position.latitude,
        longitude: position.longitude,
        label: "Current location",
        timeZone: fallbackTimeZone,
      };

      applyCurrentLocation(immediateLocation, recordedAt);
      locatingRef.current = false;
      setIsLocating(false);
      setLocationStatusMessage("Verifying time zone...");
      setIsResolvingLocationTimeZone(true);

      try {
        const resolvedTimeZone = await resolveTimeZone(position.latitude, position.longitude);

        if (resolvedTimeZone !== fallbackTimeZone) {
          applyCurrentLocation({
            ...immediateLocation,
            timeZone: resolvedTimeZone,
          }, recordedAt);
        }

        setLocationStatusMessage("Updated.");
      } catch {
        setLocationStatusMessage("Updated with device time zone.");
      } finally {
        setIsResolvingLocationTimeZone(false);
        window.setTimeout(() => setLocationStatusMessage(""), 2400);
      }
    } catch (error) {
      locatingRef.current = false;
      setIsLocating(false);
      setIsResolvingLocationTimeZone(false);
      setLocationErrorMessage(getLocationErrorMessage(error));
      setLocationStatusMessage("");
    }
  }, [applyCurrentLocation]);

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
    setLocationErrorMessage("");
    setLocationStatusMessage("");
    void updateSettings({ selectedLocation: key, customCoords: null });
    setSelectedDate(getDateInTimeZone(new Date(), locationPresets[key].timeZone));
  };

  const handleCoordsChange = (location: LocationPreset) => {
    setLocationErrorMessage("");
    setLocationStatusMessage("");
    void updateSettings({ selectedLocation: "custom", customCoords: location });
    setSelectedDate(getDateInTimeZone(new Date(), location.timeZone));
  };

  const prayerItems = useMemo(
    () => [
      { title: "Fajr", value: formatTime(prayers.fajr, coords.timeZone), icon: Clock3 },
      { title: "Sunrise", value: formatTime(prayers.sunrise, coords.timeZone), icon: Sunrise },
      { title: "Dhuhr", value: formatTime(prayers.dhuhr, coords.timeZone), icon: Clock3 },
      { title: "Asr", value: formatTime(prayers.asr, coords.timeZone), icon: Clock3 },
      { title: "Maghrib", value: formatTime(prayers.maghrib, coords.timeZone), icon: Sunset },
      { title: "Isha", value: formatTime(prayers.isha, coords.timeZone), icon: Clock3 },
      { title: isMobile ? "Phase" : "Moon phase", value: moon.phaseName, icon: Moon },
      { title: isMobile ? "Light" : "Moon light", value: `${moon.illumination}%`, icon: Sparkles },
    ],
    [prayers, moon, coords.timeZone, isMobile]
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
    <div
      className={`orbit-shell orbit-shell--${resolvedTheme} min-h-screen w-full text-slate-100`}
    >
      <div className="orbit-shell__glow orbit-shell__glow--one" />
      <div className="orbit-shell__glow orbit-shell__glow--two" />
      <div className="orbit-shell__grid" />

      <div className="orbit-safe relative w-full py-5 md:px-6 lg:px-8">
        <div className="grid gap-4">
          <OrbitHero
            label={coords.label}
            latitude={coords.latitude}
            longitude={coords.longitude}
            timeZone={coords.timeZone}
            compact={isMobile}
          />

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <NextPrayerCard
              latitude={coords.latitude}
              longitude={coords.longitude}
              method={settings.prayerMethod}
              madhab={settings.madhab}
              timeZone={coords.timeZone}
              compact={isMobile}
              prayerAdjustments={settings.prayerAdjustments}
            />
            <ViewingDayCard
              currentDay={currentDay}
              selectedDate={selectedDate}
              timeZone={coords.timeZone}
              hijriMethod={settings.hijriMethod}
              hijriAdjustment={settings.hijriAdjustment}
              maghrib={prayers.maghrib}
              onSelectedDateChange={setSelectedDate}
              compact={isMobile}
            />
          </div>

          <PrayerGrid items={prayerItems} compact={isMobile} />

          <OrbitControls
            method={settings.prayerMethod}
            madhab={settings.madhab}
            hijriMethod={settings.hijriMethod}
            hijriAdjustment={settings.hijriAdjustment}
            prayerAdjustments={settings.prayerAdjustments}
            theme={settings.theme}
            automaticLocation={settings.automaticLocation}
            notifications={settings.notifications}
            selectedPreset={settings.selectedLocation}
            currentLocation={coords}
            onMethodChange={(prayerMethod) => void updateSettings({ prayerMethod })}
            onMadhabChange={(madhab) => void updateSettings({ madhab })}
            onHijriMethodChange={(hijriMethod) => void updateSettings({ hijriMethod })}
            onHijriAdjustmentChange={(hijriAdjustment) =>
              void updateSettings({ hijriAdjustment })
            }
            onPrayerAdjustmentsChange={(prayerAdjustments) =>
              void updateSettings({ prayerAdjustments })
            }
            onThemeChange={(theme) => void updateSettings({ theme })}
            onAutomaticLocationChange={(automaticLocation) =>
              void updateSettings({ automaticLocation })
            }
            onNotificationsChange={(notifications) =>
              void updateSettings({ notifications })
            }
            onResetSettings={() => void resetSettings()}
            onPresetChange={handlePresetChange}
            onLocateMe={locateMe}
            onCoordsChange={handleCoordsChange}
            isLocating={isLocating}
            isResolvingLocationTimeZone={isResolvingLocationTimeZone}
            locationStatusMessage={locationStatusMessage}
            locationErrorMessage={locationErrorMessage}
            lastCurrentLocationAt={settings.lastCurrentLocationAt}
            compact={isMobile}
          />

          {isMobile ? (
            <StatsGrid
              stats={stats}
              moon={moon}
              latitude={coords.latitude}
              longitude={coords.longitude}
              timeZone={coords.timeZone}
              compact
            />
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
                  <div className="text-lg font-semibold text-white">Insights</div>
                </div>
                <ChevronDown className="h-5 w-5 text-slate-400" />
              </summary>

              {showSolarDetails ? (
                <div className="mt-4 grid gap-4">
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
                  <StatsGrid
                    stats={stats}
                    moon={moon}
                    latitude={coords.latitude}
                    longitude={coords.longitude}
                    timeZone={coords.timeZone}
                  />
                </div>
              ) : null}
            </details>
          )}

          <DailySummaryCard
            stats={stats}
            moon={moon}
            method={settings.prayerMethod}
            madhab={settings.madhab}
            cityLabel={coords.label}
            latitude={coords.latitude}
            longitude={coords.longitude}
            timeZone={coords.timeZone}
            compact={isMobile}
            prayerAdjustments={settings.prayerAdjustments}
          />
        </div>
      </div>
    </div>
  );
}
