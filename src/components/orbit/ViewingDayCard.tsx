import { memo, useMemo } from "react";

import { SectionCard } from "@/components/orbit/SectionCard";
import { useNow } from "@/hooks/orbit/useNow";
import {
  addDays,
  formatDate,
  formatDateInputValue,
  formatIslamicDate,
  getDateInTimeZone,
  isSameDayInTimeZone,
  parseDateInputValue,
} from "@/lib/orbit/time";
import type { HijriMethodKey } from "@/lib/orbit/types";

type ViewingDayCardProps = {
  currentDay: Date;
  selectedDate: Date;
  timeZone: string;
  hijriMethod: HijriMethodKey;
  hijriAdjustment: number;
  maghrib: Date;
  onSelectedDateChange: (date: Date) => void;
  compact?: boolean;
};

function ViewingDayCardInner({
  currentDay,
  selectedDate,
  timeZone,
  hijriMethod,
  hijriAdjustment,
  maghrib,
  onSelectedDateChange,
  compact = false,
}: ViewingDayCardProps) {
  const now = useNow(60000);

  const hijriSourceDate = useMemo(() => {
    const todayInLocation = getDateInTimeZone(now, timeZone);
    const shouldRollAtMaghrib =
      hijriMethod === "local" &&
      isSameDayInTimeZone(currentDay, todayInLocation, timeZone) &&
      now.getTime() >= maghrib.getTime();

    return shouldRollAtMaghrib ? addDays(currentDay, 1) : currentDay;
  }, [currentDay, hijriMethod, maghrib, now, timeZone]);

  return (
    <SectionCard
      title={compact ? "Day" : "Viewing day"}
      compact={compact}
      className="orbit-surface"
      contentClassName="grid gap-4 md:grid-cols-[1fr_auto] md:items-end"
    >
      <div>
        <div className="text-xl font-semibold text-white">
          {formatDate(currentDay, timeZone)}
        </div>
        <div className="mt-1 text-sm font-medium text-slate-300">
          Hijri {formatIslamicDate(hijriSourceDate, timeZone, hijriMethod, hijriAdjustment)}
        </div>
        {!compact ? <div className="mt-1 text-sm text-slate-400">Local mode rolls after Maghrib.</div> : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="date"
          value={formatDateInputValue(selectedDate, timeZone)}
          onChange={(event) => {
            const parsed = parseDateInputValue(event.target.value);
            if (parsed) {
              onSelectedDateChange(parsed);
            }
          }}
          className="h-11 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm text-white outline-none transition focus:border-slate-400/50"
        />

        <button
          type="button"
          onClick={() => onSelectedDateChange(getDateInTimeZone(new Date(), timeZone))}
          className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-100 transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          Today
        </button>
      </div>
    </SectionCard>
  );
}

export const ViewingDayCard = memo(ViewingDayCardInner);
