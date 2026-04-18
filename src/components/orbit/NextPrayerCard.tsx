import { SectionCard } from "@/components/orbit/SectionCard";
import { calculationMethods } from "@/lib/orbit/constants";
import { countdown, formatTime } from "@/lib/orbit/time";
import type { MadhabKey, MethodKey } from "@/lib/orbit/types";

type NextPrayer = {
  label: string;
  value: Date;
};

type NextPrayerCardProps = {
  nextPrayer: NextPrayer;
  now: Date;
  method: MethodKey;
  madhab: MadhabKey;
};

export function NextPrayerCard({
  nextPrayer,
  now,
  method,
  madhab,
}: NextPrayerCardProps) {
  return (
    <SectionCard
      title="Next prayer"
      description="Live countdown to the next upcoming prayer."
      contentClassName="space-y-5"
    >
      <div>
        <div className="text-5xl font-semibold tracking-tight text-white">
          {nextPrayer.label}
        </div>
        <div className="mt-2 text-2xl text-cyan-300">
          {formatTime(nextPrayer.value)}
        </div>
      </div>

      <div className="rounded-3xl border border-cyan-500/10 bg-cyan-500/[0.05] p-4">
        <div className="text-xs uppercase tracking-[0.28em] text-cyan-300/70">
          Countdown
        </div>
        <div className="mt-2 text-4xl font-semibold text-white">
          {countdown(nextPrayer.value, now)}
        </div>
      </div>

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
    </SectionCard>
  );
}