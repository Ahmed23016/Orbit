import { memo } from "react";

import { SectionCard } from "@/components/orbit/SectionCard";
import { useLivePrayerStatus } from "@/hooks/orbit/useLivePrayerStatus";
import { calculationMethods } from "@/lib/orbit/constants";
import type { PrayerAdjustmentSettings } from "@/lib/orbit/settings";
import {
  countdown,
  formatCoordinate,
  formatDuration,
  formatTimeZoneLabel,
} from "@/lib/orbit/time";
import type { MadhabKey, MethodKey } from "@/lib/orbit/types";

type MoonData = {
  illumination: number;
};

type Stats = {
  nightMinutes: number;
  solarNoon: string;
};

type DailySummaryCardProps = {
  stats: Stats;
  moon: MoonData;
  method: MethodKey;
  madhab: MadhabKey;
  cityLabel: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  compact?: boolean;
  prayerAdjustments?: PrayerAdjustmentSettings;
};

function DailySummaryCardInner({
  stats,
  moon,
  method,
  madhab,
  cityLabel,
  latitude,
  longitude,
  timeZone,
  compact = false,
  prayerAdjustments,
}: DailySummaryCardProps) {
  const rows = [
    { label: compact ? "Noon" : "Solar noon reference", value: stats.solarNoon },
    { label: compact ? "Night" : "Total night duration", value: formatDuration(stats.nightMinutes) },
    { label: compact ? "Moon" : "Current moon illumination", value: `${moon.illumination}%` },
    { label: compact ? "Method" : "Current method", value: calculationMethods[method].label },
    { label: compact ? "City" : "Selected city", value: cityLabel },
    {
      label: compact ? "Coords" : "Coordinates",
      value: `${formatCoordinate(latitude, "lat")} / ${formatCoordinate(longitude, "lng")}`,
    },
    {
      label: compact ? "Zone" : "Time zone",
      value: formatTimeZoneLabel(timeZone),
    },
  ];

  return (
    <SectionCard
      title={compact ? "Details" : "Daily summary"}
      contentClassName="grid gap-3"
      compact={compact}
    >
      <LiveNextEventCountdown
        latitude={latitude}
        longitude={longitude}
        method={method}
        madhab={madhab}
        timeZone={timeZone}
        compact={compact}
        prayerAdjustments={prayerAdjustments}
      />

      {rows.map((row) => (
        <div
          key={row.label}
          className={`flex items-center justify-between gap-4 rounded-2xl border border-white/10 ${
            compact ? "bg-white/[0.03] p-3.5" : "bg-slate-900/60 p-4"
          }`}
        >
          <span className={compact ? "text-slate-500" : "text-slate-400"}>{row.label}</span>
          <span className="max-w-[55%] text-right font-medium text-white">{row.value}</span>
        </div>
      ))}
    </SectionCard>
  );
}

function LiveNextEventCountdown({
  latitude,
  longitude,
  method,
  madhab,
  timeZone,
  compact = false,
  prayerAdjustments,
}: {
  latitude: number;
  longitude: number;
  method: MethodKey;
  madhab: MadhabKey;
  timeZone: string;
  compact?: boolean;
  prayerAdjustments?: PrayerAdjustmentSettings;
}) {
  const { nextPrayer, now } = useLivePrayerStatus(
    latitude,
    longitude,
    timeZone,
    method,
    madhab,
    prayerAdjustments
  );

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-2xl border border-white/10 ${
        compact ? "bg-white/[0.03] p-3.5" : "bg-slate-900/60 p-4"
      }`}
    >
      <span className={compact ? "text-slate-500" : "text-slate-400"}>
        {compact ? "Next" : "Next event countdown"}
      </span>
      <span className="max-w-[55%] text-right font-medium text-white">
        {countdown(nextPrayer.value, now)}
      </span>
    </div>
  );
}

export const DailySummaryCard = memo(DailySummaryCardInner);
