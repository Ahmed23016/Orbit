import { SectionCard } from "@/components/orbit/SectionCard";
import { calculationMethods } from "@/lib/orbit/constants";
import { countdown, formatDuration } from "@/lib/orbit/time";
import type { MethodKey } from "@/lib/orbit/types";

type MoonData = {
  illumination: number;
};

type Stats = {
  nightMinutes: number;
  solarNoon: string;
};

type NextPrayer = {
  label: string;
  value: Date;
};

type DailySummaryCardProps = {
  stats: Stats;
  moon: MoonData;
  nextPrayer: NextPrayer;
  now: Date;
  method: MethodKey;
  cityLabel: string;
};

export function DailySummaryCard({
  stats,
  moon,
  nextPrayer,
  now,
  method,
  cityLabel,
}: DailySummaryCardProps) {
  const rows = [
    { label: "Solar noon reference", value: stats.solarNoon },
    { label: "Total night duration", value: formatDuration(stats.nightMinutes) },
    { label: "Current moon illumination", value: `${moon.illumination}%` },
    { label: "Next event countdown", value: countdown(nextPrayer.value, now) },
    { label: "Current method", value: calculationMethods[method].label },
    { label: "Selected city", value: cityLabel },
  ];

  return (
    <SectionCard
      title="Daily summary"
      description="Useful numbers derived from today’s sky and prayer schedule."
      contentClassName="grid gap-3"
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-4"
        >
          <span className="text-slate-400">{row.label}</span>
          <span className="max-w-[55%] text-right font-medium text-white">
            {row.value}
          </span>
        </div>
      ))}
    </SectionCard>
  );
}