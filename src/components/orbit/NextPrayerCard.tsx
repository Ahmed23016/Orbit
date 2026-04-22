import { memo } from "react";

import { SectionCard } from "@/components/orbit/SectionCard";
import { useLivePrayerStatus } from "@/hooks/orbit/useLivePrayerStatus";
import { calculationMethods } from "@/lib/orbit/constants";
import type { PrayerAdjustmentSettings } from "@/lib/orbit/settings";
import { cn } from "@/lib/utils";
import { countdown, formatTime, formatTimeZoneLabel } from "@/lib/orbit/time";
import type { MadhabKey, MethodKey } from "@/lib/orbit/types";

type NextPrayerCardProps = {
  latitude: number;
  longitude: number;
  method: MethodKey;
  madhab: MadhabKey;
  timeZone: string;
  compact?: boolean;
  prayerAdjustments?: PrayerAdjustmentSettings;
};

function NextPrayerCardInner({
  latitude,
  longitude,
  method,
  madhab,
  timeZone,
  compact = false,
  prayerAdjustments,
}: NextPrayerCardProps) {
  const { nextPrayer, now } = useLivePrayerStatus(
    latitude,
    longitude,
    timeZone,
    method,
    madhab,
    prayerAdjustments
  );

  return (
    <SectionCard
      title={compact ? "Next" : "Next prayer"}
      contentClassName={compact ? "space-y-4" : "space-y-5"}
      compact={compact}
    >
      <div>
        <div className={cn("font-semibold tracking-tight text-white", compact ? "text-4xl" : "text-5xl")}>
          {nextPrayer.label}
        </div>
        <div className={cn("mt-2", compact ? "text-2xl text-white" : "text-3xl text-cyan-300")}>
          {formatTime(nextPrayer.value, timeZone)}
        </div>
        <div className="mt-2 text-sm text-slate-500">{formatTimeZoneLabel(timeZone)}</div>
      </div>

      <div
        className={cn(
          "rounded-3xl p-4",
          compact
            ? "border border-white/10 bg-white/[0.03]"
            : "border border-cyan-500/10 bg-cyan-500/[0.05]"
        )}
      >
        <div className={cn("text-xs uppercase tracking-[0.28em]", compact ? "text-slate-500" : "text-cyan-300/70")}>
          Countdown
        </div>
        <div className={cn("mt-2 font-semibold text-white", compact ? "text-3xl" : "text-4xl")}>
          {countdown(nextPrayer.value, now)}
        </div>
      </div>

      {compact ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
          <span className="text-slate-500">Method</span>
          <span className="text-right font-medium text-slate-200">
            {calculationMethods[method].label}
          </span>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-4">
            <span className="text-slate-400">Method</span>
            <span className="text-right font-medium text-white">
              {calculationMethods[method].label}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-4">
            <span className="text-slate-400">Madhab</span>
            <span className="font-medium text-white">
              {madhab === "hanafi" ? "Hanafi" : "Shafi / Maliki / Hanbali"}
            </span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export const NextPrayerCard = memo(NextPrayerCardInner);
