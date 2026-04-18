import { useMemo, useState } from "react";
import { Clock3, Moon, Sparkles, Sunrise, Sunset } from "lucide-react";

import { DailySummaryCard } from "@/components/orbit/DailySummaryCard";
import { NextPrayerCard } from "@/components/orbit/NextPrayerCard";
import { OrbitControls } from "@/components/orbit/OrbitControls";
import { OrbitHero } from "@/components/orbit/OrbitHero";
import { PrayerGrid } from "@/components/orbit/PrayerGrid";
import { PrayerSpacingCard } from "@/components/orbit/PrayerSpacingCard";
import { SolarChartCard } from "@/components/orbit/SolarChartCard";
import { StatsGrid } from "@/components/orbit/StatsGrid";

import { useNow } from "@/hooks/orbit/useNow";
import { useOrbitData } from "@/hooks/orbit/useOrbitData";

import { locationPresets } from "@/lib/orbit/constants";
import { formatTime } from "@/lib/orbit/time";
import type { MadhabKey, MethodKey, PresetKey } from "@/lib/orbit/types";

export default function App() {
  const [presetKey, setPresetKey] = useState<PresetKey>("amsterdam");
  const [coords, setCoords] = useState(locationPresets.amsterdam);
  const [method, setMethod] = useState<MethodKey>("mwl");
  const [madhab, setMadhab] = useState<MadhabKey>("shafi");

  const now = useNow();

  const { prayers, moon, nextPrayer, prayerMarkers, chartData, stats, spacingData } =
    useOrbitData(now, coords.latitude, coords.longitude, method, madhab);

  const locateMe = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "Current location",
        });
      },
      () => {
        alert("Could not get your location.");
      }
    );
  };

  const handlePresetChange = (key: PresetKey) => {
    setPresetKey(key);
    setCoords(locationPresets[key]);
  };

  const prayerItems = useMemo(
    () => [
      { title: "Fajr", value: formatTime(prayers.fajr), icon: Clock3 },
      { title: "Sunrise", value: formatTime(prayers.sunrise), icon: Sunrise },
      { title: "Dhuhr", value: formatTime(prayers.dhuhr), icon: Clock3 },
      { title: "Asr", value: formatTime(prayers.asr), icon: Clock3 },
      { title: "Maghrib", value: formatTime(prayers.maghrib), icon: Sunset },
      { title: "Isha", value: formatTime(prayers.isha), icon: Clock3 },
      { title: "Moon phase", value: moon.phaseName, icon: Moon },
      { title: "Moon light", value: `${moon.illumination}%`, icon: Sparkles },
    ],
    [prayers, moon]
  );

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top,#041a33_0%,#020b18_42%,#00040d_100%)] text-slate-100">
      <div className="w-full px-4 py-4 md:px-6 lg:px-8">
        <div className="mb-4 grid gap-5 xl:grid-cols-[1.2fr_0.9fr] xl:items-start">
          <OrbitHero
            label={coords.label}
            latitude={coords.latitude}
            longitude={coords.longitude}
            now={now}
          />

          <OrbitControls
            method={method}
            madhab={madhab}
            selectedPreset={presetKey}
            onMethodChange={setMethod}
            onMadhabChange={setMadhab}
            onPresetChange={handlePresetChange}
            onLocateMe={locateMe}
          />
        </div>

        <PrayerGrid items={prayerItems} />

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1.1fr_1.1fr]">
          <SolarChartCard
            chartData={chartData}
            prayerMarkers={prayerMarkers}
            now={now}
          />

          <NextPrayerCard
            nextPrayer={nextPrayer}
            now={now}
            method={method}
            madhab={madhab}
          />
        </div>

        <StatsGrid stats={stats} moon={moon} />

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <PrayerSpacingCard spacingData={spacingData} />

          <DailySummaryCard
            stats={stats}
            moon={moon}
            nextPrayer={nextPrayer}
            now={now}
            method={method}
            cityLabel={coords.label}
          />
        </div>
      </div>
    </div>
  );
}