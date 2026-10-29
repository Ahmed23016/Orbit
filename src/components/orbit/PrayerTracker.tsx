import { useState } from "react";
import { Check, Flame } from "lucide-react";

import { Constellation } from "@/components/orbit/Constellation";
import { Panel, Segmented } from "@/components/orbit/primitives";
import {
  FARD_KEYS,
  dayKey,
  isSameDay,
  prayerLabel,
  shiftDay,
  type FardKey,
  type PrayerCalculator,
} from "@/lib/orbit/schedule";
import { formatClock, formatDay } from "@/lib/orbit/time";
import { cn } from "@/lib/utils";

type PrayerTrackerProps = {
  now: Date;
  prayerDay: Date;
  calc: PrayerCalculator;
  timeZone: string;
  hour12: boolean;
  getDone: (day: Date) => FardKey[];
  toggle: (day: Date, prayer: FardKey) => void;
};

const RADIUS = 13;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function Ring({ ratio }: { ratio: number }) {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8 -rotate-90" aria-hidden="true">
      <circle cx="16" cy="16" r={RADIUS} fill="none" strokeWidth="3" className="stroke-o-surface-2" />
      {ratio > 0 ? (
        <circle
          cx="16"
          cy="16"
          r={RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE * ratio} ${CIRCUMFERENCE}`}
          className="stroke-o-accent transition-[stroke-dasharray] duration-500"
        />
      ) : null}
    </svg>
  );
}

export function PrayerTracker({
  now,
  prayerDay,
  calc,
  timeZone,
  hour12,
  getDone,
  toggle,
}: PrayerTrackerProps) {
  const [selectedKey, setSelectedKey] = useState(() => dayKey(prayerDay));
  const [view, setView] = useState<"week" | "month">("week");
  const [month, setMonth] = useState(() => new Date(prayerDay.getFullYear(), prayerDay.getMonth(), 1, 12));
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(prayerDay, index - 6));
  const selected = (() => {
    const [year, monthNumber, date] = selectedKey.split("-").map(Number);
    const parsed = new Date(year, monthNumber - 1, date, 12);
    return Number.isNaN(parsed.getTime()) || parsed.getTime() > prayerDay.getTime() ? prayerDay : parsed;
  })();
  const isToday = isSameDay(selected, prayerDay);
  const selectedTimes = calc(selected);
  const done = getDone(selected);

  const counts = days.map((day) => getDone(day).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  let streak = counts[counts.length - 1] === FARD_KEYS.length ? 1 : 0;
  for (let index = counts.length - 2; index >= 0 && counts[index] === FARD_KEYS.length; index -= 1) {
    streak += 1;
  }

  const allDone = done.length === FARD_KEYS.length;
  const toggleAll = () => {
    for (const key of FARD_KEYS) {
      if (allDone || !done.includes(key)) toggle(selected, key);
    }
  };

  return (
    <Panel className="px-4 py-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="text-xs font-medium tracking-[0.12em] text-o-faint uppercase">
          Prayer tracker
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          className="w-36"
        />
      </div>

      {view === "month" ? (
        <div className="mt-3">
          <Constellation
            month={month}
            prayerDay={prayerDay}
            selectedKey={dayKey(selected)}
            getDone={getDone}
            onSelect={(day) => setSelectedKey(dayKey(day))}
            onMonthChange={setMonth}
          />
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <div className="min-w-0 truncate text-[15px] font-semibold">
          {isToday ? "Today" : formatDay(selected, { weekday: "long", day: "numeric", month: "short" })}
          <span className="ml-1.5 font-normal text-o-muted tabular-nums">
            {done.length}/{FARD_KEYS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleAll}
          className="h-8 rounded-full bg-o-surface-2 px-3 text-xs font-medium text-o-muted transition hover:text-o-text active:scale-95"
        >
          {allDone ? "Clear" : "Mark all"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {FARD_KEYS.map((key) => {
          const isDone = done.includes(key);
          const upcoming = isToday && selectedTimes[key].getTime() > now.getTime();

          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(selected, key)}
              aria-pressed={isDone}
              aria-label={`${prayerLabel(key, selected)} ${isDone ? "prayed" : "not prayed"}`}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl py-2.5 transition active:scale-95",
                isDone ? "bg-o-accent-soft" : "bg-o-surface-2/60 hover:bg-o-surface-2"
              )}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full border-[1.5px] transition-colors",
                  isDone
                    ? "border-o-accent bg-o-accent text-o-on-accent"
                    : upcoming
                      ? "border-dashed border-o-faint/50 text-transparent"
                      : "border-o-faint/70 text-transparent"
                )}
              >
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
              <span
                className={cn(
                  "max-w-full truncate px-1 text-[12px] font-medium",
                  isDone ? "text-o-accent" : "text-o-text"
                )}
              >
                {prayerLabel(key, selected)}
              </span>
              <span className="-mt-1 text-[10px] text-o-faint tabular-nums">
                {formatClock(selectedTimes[key], timeZone, hour12)}
              </span>
            </button>
          );
        })}
      </div>

      {view === "week" ? (
        <>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isSelected = dayKey(day) === selectedKey || (index === 6 && !days.some((d) => dayKey(d) === selectedKey));

              return (
                <button
                  key={dayKey(day)}
                  type="button"
                  onClick={() => setSelectedKey(dayKey(day))}
                  aria-pressed={isSelected}
                  aria-label={`${formatDay(day, { weekday: "long" })}: ${counts[index]} of 5 prayed`}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl py-1.5 transition",
                    isSelected ? "bg-o-surface-2" : "hover:bg-o-surface-2/60"
                  )}
                >
                  <Ring ratio={counts[index] / FARD_KEYS.length} />
                  <span
                    className={cn(
                      "text-[11px]",
                      isSelected ? "font-semibold text-o-text" : "text-o-faint",
                      index === 6 && !isSelected && "text-o-accent"
                    )}
                  >
                    {formatDay(day, { weekday: "narrow" })}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between px-1 text-xs text-o-muted tabular-nums">
            <span>
              {total}/{days.length * FARD_KEYS.length} this week
            </span>
            {streak > 0 ? (
              <span className="flex items-center gap-1 font-medium text-o-accent">
                <Flame className="h-3.5 w-3.5" />
                {streak}-day streak
              </span>
            ) : (
              <span className="text-o-faint">Tap a day to edit it</span>
            )}
          </div>
        </>
      ) : null}
    </Panel>
  );
}
