import { memo, useMemo } from "react";
import { CalendarDays } from "lucide-react";

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
};

function ViewingDayCardInner({
  currentDay,
  selectedDate,
  timeZone,
  hijriMethod,
  hijriAdjustment,
  maghrib,
  onSelectedDateChange,
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
    <div className="orbit-surface rounded-[30px] border border-white/10 p-4">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.34em] text-amber-100/70">
            <CalendarDays className="h-4 w-4" />
            Viewing day
          </div>
          <div className="mt-2 text-xl font-semibold text-white">
            {formatDate(currentDay, timeZone)}
          </div>
          <div className="mt-1 text-sm font-medium text-amber-200">
            Hijri: {formatIslamicDate(hijriSourceDate, timeZone, hijriMethod, hijriAdjustment)}
          </div>
          <div className="mt-1 text-sm text-slate-400">
            Choose any day and Orbit will show that day&apos;s prayer times. Default is today.
            In local mode, the Hijri date rolls after Maghrib.
          </div>
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
            className="h-11 rounded-2xl border border-white/10 bg-slate-950/65 px-4 text-sm text-white outline-none transition focus:border-amber-300/40"
          />

          <button
            type="button"
            onClick={() => onSelectedDateChange(getDateInTimeZone(new Date(), timeZone))}
            className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/[0.08]"
          >
            Jump to today
          </button>
        </div>
      </div>
    </div>
  );
}

export const ViewingDayCard = memo(ViewingDayCardInner);
