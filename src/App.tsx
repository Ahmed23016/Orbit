import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { LocalNotifications } from "@capacitor/local-notifications";

import "./App.css";

import type { PracticeSection } from "@/components/orbit/PracticeView";
import { TabBar, type TabKey } from "@/components/orbit/TabBar";
import { TodayView } from "@/components/orbit/TodayView";

import { useNow } from "@/hooks/orbit/useNow";
import { usePrayedPlaces } from "@/hooks/orbit/usePrayedPlaces";
import { usePrayerTracker } from "@/hooks/orbit/usePrayerTracker";
import { useSettings } from "@/hooks/useSettings";

import { defaultAdhkarSession, type AdhkarSession } from "@/lib/orbit/adhkar";
import { calculationMethods, getMethodDetails, locationPresets } from "@/lib/orbit/constants";
import {
  getCurrentPosition,
  getLocationErrorMessage,
  getDeviceTimeZone,
  resolveTimeZone,
  reverseGeocode,
} from "@/lib/orbit/location";
import {
  createPrayerCalculator,
  dayKey,
  getPrayerDay,
  getPrayerTimeline,
  prayerLabel,
  type PrayerCalculator,
} from "@/lib/orbit/schedule";
import { SKY_GRADIENTS, getSkyPhase } from "@/lib/orbit/sky";
import { formatCountdown, getDateInTimeZone } from "@/lib/orbit/time";
import type { LocationPreset, PresetKey } from "@/lib/orbit/types";
import { syncAutoSilent, syncWidget } from "@/services/nativeBridge";
import { syncPrayerNotifications } from "@/services/prayerNotifications";

const MAX_RECENT_LOCATIONS = 4;

// Today loads first; the other tabs load on first visit.
const MonthView = lazy(() => import("@/components/orbit/MonthView").then((m) => ({ default: m.MonthView })));
const PracticeView = lazy(() =>
  import("@/components/orbit/PracticeView").then((m) => ({ default: m.PracticeView }))
);
const QiblaView = lazy(() => import("@/components/orbit/QiblaView").then((m) => ({ default: m.QiblaView })));
const SettingsView = lazy(() =>
  import("@/components/orbit/SettingsView").then((m) => ({ default: m.SettingsView }))
);

/** Soft ambient light at the top of the screen, tinted by the time of day. */
function SkyGlow({ calc, timeZone }: { calc: PrayerCalculator; timeZone: string }) {
  const now = useNow(30000);
  const today = getDateInTimeZone(now, timeZone);
  const { current } = getPrayerTimeline(now, today, calc);
  const phase = getSkyPhase(current.key, now, calc(today).maghrib);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 h-[28rem] transition-[background] duration-1000"
      style={{
        background: `radial-gradient(120% 65% at 50% 0%, ${SKY_GRADIENTS[phase].glow}, transparent 72%)`,
      }}
    />
  );
}

/** Keeps the browser/tab title showing the countdown to the next prayer. */
function DocumentTitle({ calc, timeZone }: { calc: PrayerCalculator; timeZone: string }) {
  const now = useNow(1000);
  const { next, day } = getPrayerTimeline(now, getDateInTimeZone(now, timeZone), calc);
  const title = `${prayerLabel(next.key, day)} in ${formatCountdown(next.time, now)} · Orbit`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => () => void (document.title = "Orbit"), []);

  return null;
}

function usePrefersDark() {
  const [prefersDark, setPrefersDark] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setPrefersDark(media.matches);

    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return prefersDark;
}

export default function App() {
  const { settings, updateSettings, resetSettings, isReady } = useSettings();
  const prefersDark = usePrefersDark();
  const [tab, setTab] = useState<TabKey>("today");
  const [practiceSection, setPracticeSection] = useState<PracticeSection>("tasbih");
  const [adhkarSession, setAdhkarSession] = useState<AdhkarSession | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState("");
  const [locationErrorMessage, setLocationErrorMessage] = useState("");
  const locatingRef = useRef(false);
  const tracker = usePrayerTracker();
  const prayedPlaces = usePrayedPlaces();

  const resolvedTheme =
    settings.theme === "system" ? (prefersDark ? "dark" : "light") : settings.theme;
  const hour12 = settings.timeFormat === "12h";

  const coords = useMemo(
    () =>
      settings.selectedLocation === "custom"
        ? (settings.customCoords ?? locationPresets.amsterdam)
        : locationPresets[settings.selectedLocation],
    [settings.selectedLocation, settings.customCoords]
  );

  const calc = useMemo(
    () =>
      createPrayerCalculator(
        coords.latitude,
        coords.longitude,
        settings.prayerMethod,
        settings.madhab,
        settings.prayerAdjustments,
        settings.highLatitude,
        settings.timeOffsets
      ),
    [
      coords.latitude,
      coords.longitude,
      settings.prayerMethod,
      settings.madhab,
      settings.prayerAdjustments,
      settings.highLatitude,
      settings.timeOffsets,
    ]
  );

  const altAsrCalc = useMemo(
    () =>
      createPrayerCalculator(
        coords.latitude,
        coords.longitude,
        settings.prayerMethod,
        settings.madhab === "hanafi" ? "shafi" : "hanafi",
        settings.prayerAdjustments,
        settings.highLatitude,
        settings.timeOffsets
      ),
    [
      coords.latitude,
      coords.longitude,
      settings.prayerMethod,
      settings.madhab,
      settings.prayerAdjustments,
      settings.highLatitude,
      settings.timeOffsets,
    ]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolvedTheme === "dark");
    root.style.colorScheme = resolvedTheme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolvedTheme === "dark" ? "#0b0d12" : "#f5f4f0");
  }, [resolvedTheme]);

  // Keep a week of prayer alerts scheduled; refresh when anything relevant changes or the app resumes.
  useEffect(() => {
    if (!isReady) {
      return;
    }

    const sync = () =>
      void syncPrayerNotifications({
        calc,
        today: getDateInTimeZone(new Date(), coords.timeZone),
        settings: settings.notifications,
        timeZone: coords.timeZone,
        hour12,
        locationLabel: coords.label,
        jamaah: settings.jamaah,
        adhkarReminders: settings.adhkarReminders.enabled,
      });
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };

    sync();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [
    isReady,
    calc,
    coords.timeZone,
    coords.label,
    settings.notifications,
    settings.jamaah,
    settings.adhkarReminders.enabled,
    hour12,
  ]);

  // Android extras: the home-screen widget and auto-silent read a week of times.
  useEffect(() => {
    if (!isReady) {
      return;
    }

    const sync = () => {
      const input = {
        calc,
        today: getDateInTimeZone(new Date(), coords.timeZone),
        timeZone: coords.timeZone,
        hour12,
        locationLabel: coords.label,
        jamaah: settings.jamaah,
      };
      void syncWidget(input);
      void syncAutoSilent({ ...input, settings: settings.autoSilent });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };

    sync();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [isReady, calc, coords.timeZone, coords.label, hour12, settings.jamaah, settings.autoSilent]);

  // Tapping an adhkār reminder opens the right list.
  useEffect(() => {
    const listener = LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
      const extra = event.notification.extra as { open?: string; session?: AdhkarSession } | undefined;
      if (extra?.open === "adhkar") {
        setPracticeSection("adhkar");
        setAdhkarSession(extra.session ?? null);
        setTab("practice");
      }
    });
    return () => {
      void listener.then((handle) => handle.remove()).catch(() => {});
    };
  }, []);

  const methodInfo = useMemo(() => {
    const details = getMethodDetails(settings.prayerMethod, settings.prayerAdjustments);
    return {
      label: settings.prayerAdjustments.enabled
        ? `${calculationMethods[settings.prayerMethod].label} (custom)`
        : calculationMethods[settings.prayerMethod].label,
      fajrAngle: details.fajrAngle,
      ishaAngle: details.ishaAngle,
      ishaInterval: details.ishaInterval,
    };
  }, [settings.prayerMethod, settings.prayerAdjustments]);

  const changeTab = useCallback((next: TabKey) => {
    setTab(next);
    window.scrollTo({ top: 0 });
  }, []);

  const applyCurrentLocation = useCallback(
    (location: LocationPreset, recordedAt: string) => {
      void updateSettings({
        selectedLocation: "custom",
        customCoords: location,
        lastCurrentLocationAt: recordedAt,
      });
    },
    [updateSettings]
  );

  const locateMe = useCallback(async () => {
    if (locatingRef.current) {
      return;
    }

    locatingRef.current = true;
    setLocationErrorMessage("");
    setLocationStatusMessage("Finding your location…");
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
      setLocationStatusMessage("Checking time zone…");

      const [timeZoneResult, placeResult] = await Promise.allSettled([
        resolveTimeZone(position.latitude, position.longitude),
        reverseGeocode(position.latitude, position.longitude),
      ]);
      const timeZone =
        timeZoneResult.status === "fulfilled" ? timeZoneResult.value : fallbackTimeZone;
      const label = placeResult.status === "fulfilled" ? placeResult.value : immediateLocation.label;

      if (timeZone !== fallbackTimeZone || label !== immediateLocation.label) {
        applyCurrentLocation({ ...immediateLocation, timeZone, label }, recordedAt);
      }

      setLocationStatusMessage(
        timeZoneResult.status === "fulfilled"
          ? "Location updated."
          : "Location updated using your device time zone."
      );

      window.setTimeout(() => setLocationStatusMessage(""), 2400);
    } catch (error) {
      setLocationErrorMessage(getLocationErrorMessage(error));
      setLocationStatusMessage("");
    } finally {
      locatingRef.current = false;
      setIsLocating(false);
    }
  }, [applyCurrentLocation]);

  useEffect(() => {
    if (!isReady || !settings.automaticLocation) {
      return;
    }

    const timeoutId = window.setTimeout(() => void locateMe(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isReady, settings.automaticLocation, locateMe]);

  const handlePresetChange = (key: PresetKey) => {
    setLocationErrorMessage("");
    setLocationStatusMessage("");
    void updateSettings({ selectedLocation: key, customCoords: null });
  };

  const handleCoordsChange = (location: LocationPreset) => {
    setLocationErrorMessage("");
    setLocationStatusMessage("");
    const recentLocations = [
      location,
      ...settings.recentLocations.filter(
        (recent) =>
          recent.label !== location.label ||
          recent.latitude.toFixed(3) !== location.latitude.toFixed(3)
      ),
    ].slice(0, MAX_RECENT_LOCATIONS);
    void updateSettings({ selectedLocation: "custom", customCoords: location, recentLocations });
  };

  if (!isReady) {
    return (
      <div className="orbit-app grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <img src="/favicon.svg" alt="" className="h-20 w-20 rounded-[22px] shadow-lg" />
          <LoaderCircle className="h-5 w-5 animate-spin text-o-accent" aria-label="Loading" />
        </div>
      </div>
    );
  }

  return (
    <div className="orbit-app">
      <SkyGlow calc={calc} timeZone={coords.timeZone} />
      <main className="orbit-main relative mx-auto w-full max-w-xl">
        <Suspense
          fallback={
            <div className="grid h-60 place-items-center">
              <LoaderCircle className="h-5 w-5 animate-spin text-o-accent" aria-label="Loading" />
            </div>
          }
        >
        {tab === "today" ? (
          <TodayView
            latitude={coords.latitude}
            longitude={coords.longitude}
            jamaah={settings.jamaah}
            method={methodInfo}
            onStartTasbih={() => {
              setPracticeSection("tasbih");
              changeTab("practice");
            }}
            calc={calc}
            altAsrCalc={altAsrCalc}
            madhab={settings.madhab}
            timeZone={coords.timeZone}
            locationLabel={coords.label}
            hijriMethod={settings.hijriMethod}
            hijriAdjustment={settings.hijriAdjustment}
            hour12={hour12}
            isLocating={isLocating}
            onOpenLocation={() => changeTab("settings")}
            tracker={{
              enabled: settings.showTracker,
              getDone: tracker.getDone,
              toggle: (day, prayer) => {
                const wasDone = tracker.getDone(day).includes(prayer);
                tracker.toggle(day, prayer);
                // Remember where you prayed, for the Qibla history — but only for the current
                // prayer day: ticking off past days doesn't mean you prayed them here.
                const now = new Date();
                const prayerDay = getPrayerDay(now, getDateInTimeZone(now, coords.timeZone), calc);
                if (!wasDone && dayKey(day) === dayKey(prayerDay)) {
                  prayedPlaces.record(coords, `${dayKey(day)}:${prayer}`);
                }
              },
            }}
          />
        ) : tab === "calendar" ? (
          <MonthView
            key={coords.timeZone}
            calc={calc}
            timeZone={coords.timeZone}
            hijriMethod={settings.hijriMethod}
            hijriAdjustment={settings.hijriAdjustment}
            hour12={hour12}
            latitude={coords.latitude}
            longitude={coords.longitude}
          />
        ) : tab === "practice" ? (
          <PracticeView
            section={practiceSection}
            onSectionChange={setPracticeSection}
            adhkarSession={
              adhkarSession ??
              (() => {
                const today = calc(getDateInTimeZone(new Date(), coords.timeZone));
                return defaultAdhkarSession(new Date(), today.fajr, today.asr);
              })()
            }
          />
        ) : tab === "qibla" ? (
          <QiblaView
            latitude={coords.latitude}
            longitude={coords.longitude}
            timeZone={coords.timeZone}
            locationLabel={coords.label}
            hour12={hour12}
            places={prayedPlaces.places}
            onRemovePlace={prayedPlaces.remove}
          />
        ) : (
          <SettingsView
            settings={settings}
            location={coords}
            onUpdate={(patch) => void updateSettings(patch)}
            onReset={() => void resetSettings()}
            onPresetChange={handlePresetChange}
            onCoordsChange={handleCoordsChange}
            onLocateMe={() => void locateMe()}
            isLocating={isLocating}
            locationStatusMessage={locationStatusMessage}
            locationErrorMessage={locationErrorMessage}
          />
        )}
        </Suspense>
      </main>

      <TabBar value={tab} onChange={changeTab} />
      <DocumentTitle calc={calc} timeZone={coords.timeZone} />
    </div>
  );
}
