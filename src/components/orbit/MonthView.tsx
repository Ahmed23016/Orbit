import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

import { Panel, Segmented } from "@/components/orbit/primitives";
import { PrayerTimesList } from "@/components/orbit/PrayerTimesList";
import { useNow } from "@/hooks/orbit/useNow";
import {
  formatDaysAway,
  getIslamicEvents,
  getUpcomingEvents,
  isWhiteDay,
} from "@/lib/orbit/events";
import {
  PRAYER_KEYS,
  PRAYER_LABELS,
  dayKey,
  getMonthDays,
  getNightTimes,
  isSameDay,
  type PrayerCalculator,
} from "@/lib/orbit/schedule";
import {
  formatClock,
  formatDay,
  formatHijri,
  getDateInTimeZone,
  getHijriParts,
} from "@/lib/orbit/time";
import type { HijriMethodKey } from "@/lib/orbit/types";
import { cn } from "@/lib/utils";

type MonthViewProps = {
  calc: PrayerCalculator;
  timeZone: string;
  hijriMethod: HijriMethodKey;
  hijriAdjustment: number;
  hour12: boolean;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function monthStartOf(day: Date) {
  return new Date(day.getFullYear(), day.getMonth(), 1, 12, 0, 0);
}

export function MonthView({ calc, timeZone, hijriMethod, hijriAdjustment, hour12 }: MonthViewProps) {
  const now = useNow(60000);
  const today = getDateInTimeZone(now, timeZone);
  const [monthStart, setMonthStart] = useState(() => monthStartOf(today));
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<"calendar" | "list">("calendar");
  const touchStartX = useRef<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (mode === "list") {
      tableRef.current
        ?.querySelector('[aria-current="date"]')
        ?.scrollIntoView({ block: "center" });
    }
  }, [mode, monthStart]);

  const days = useMemo(
    () =>
      getMonthDays(monthStart).map((date) => {
        const hijri = getHijriParts(date, hijriMethod, hijriAdjustment);
        return { date, times: calc(date), hijri, events: getIslamicEvents(hijri) };
      }),
    [monthStart, calc, hijriMethod, hijriAdjustment]
  );

  const firstHijri = days[0].hijri;
  const lastHijri = days[days.length - 1].hijri;
  const hijriRange =
    firstHijri.month === lastHijri.month
      ? `${firstHijri.monthName} ${firstHijri.year}`
      : firstHijri.year === lastHijri.year
        ? `${firstHijri.monthName} – ${lastHijri.monthName} ${lastHijri.year}`
        : `${firstHijri.monthName} ${firstHijri.year} – ${lastHijri.monthName} ${lastHijri.year}`;

  const leadingBlanks = (monthStart.getDay() + 6) % 7;
  const isCurrentMonth = monthStart.getMonth() === today.getMonth() && monthStart.getFullYear() === today.getFullYear();

  const changeMonth = (delta: number) => {
    const nextStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1, 12, 0, 0);
    setMonthStart(nextStart);
    const containsToday =
      nextStart.getMonth() === today.getMonth() && nextStart.getFullYear() === today.getFullYear();
    setSelected(containsToday ? today : nextStart);
  };

  const goToDay = (day: Date) => {
    setMonthStart(monthStartOf(day));
    setSelected(day);
    setMode("calendar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToToday = () => goToDay(today);

  const todayKey = dayKey(today);
  const upcoming = useMemo(() => {
    const [year, month, date] = todayKey.split("-").map(Number);
    return getUpcomingEvents(new Date(year, month - 1, date, 12), hijriMethod, hijriAdjustment, 5);
  }, [todayKey, hijriMethod, hijriAdjustment]);

  const selectedEntry = days.find((entry) => isSameDay(entry.date, selected)) ?? days[0];
  const selectedNight = getNightTimes(selectedEntry.date, calc);

  return (
    <div className="orbit-fade grid grid-cols-1 gap-4">
      <header className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Previous month"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-o-line bg-o-surface text-o-muted transition active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 text-center">
          <h1 className="text-[20px] leading-tight font-semibold tracking-tight">
            {formatDay(monthStart, { month: "long", year: "numeric" })}
          </h1>
          <p className="mt-0.5 truncate text-xs text-o-muted">{hijriRange} AH</p>
        </div>

        <button
          type="button"
          onClick={() => changeMonth(1)}
          aria-label="Next month"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-o-line bg-o-surface text-o-muted transition active:scale-95"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </header>

      <div className="flex items-center gap-2">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "calendar", label: "Calendar" },
            { value: "list", label: "Timetable" },
          ]}
          className="flex-1"
        />
        <button
          type="button"
          onClick={goToToday}
          disabled={isCurrentMonth && isSameDay(selected, today)}
          className="h-10 rounded-xl border border-o-line bg-o-surface px-4 text-sm font-medium text-o-accent transition disabled:text-o-faint disabled:opacity-60"
        >
          Today
        </button>
      </div>

      {mode === "calendar" ? (
        <>
          <Panel className="p-3">
            <div
              onTouchStart={(event) => {
                touchStartX.current = event.touches[0].clientX;
              }}
              onTouchEnd={(event) => {
                if (touchStartX.current === null) return;
                const dx = event.changedTouches[0].clientX - touchStartX.current;
                touchStartX.current = null;
                if (Math.abs(dx) > 60) changeMonth(dx < 0 ? 1 : -1);
              }}
            >
              <div className="grid grid-cols-7 pb-1">
                {WEEKDAYS.map((label) => (
                  <div
                    key={label}
                    className={cn(
                      "py-1.5 text-center text-[11px] font-medium",
                      label === "Fri" ? "text-o-accent" : "text-o-faint"
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: leadingBlanks }, (_, index) => (
                  <div key={`blank-${index}`} />
                ))}

                {days.map(({ date, hijri, events }) => {
                  const isToday = isSameDay(date, today);
                  const isSelected = isSameDay(date, selected);
                  const isEid = events.some((event) => event.kind === "eid");

                  return (
                    <button
                      key={dayKey(date)}
                      type="button"
                      onClick={() => setSelected(date)}
                      aria-pressed={isSelected}
                      aria-label={`${formatDay(date, { weekday: "long", day: "numeric", month: "long" })}, ${formatHijri(hijri)}`}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-xl transition active:scale-95",
                        isSelected
                          ? "bg-o-accent text-o-on-accent shadow-sm"
                          : isToday
                            ? "bg-o-accent-soft text-o-accent"
                            : isEid
                              ? "ring-1 ring-o-accent/50 ring-inset"
                              : "hover:bg-o-surface-2"
                      )}
                    >
                      <span className="text-[15px] leading-none font-medium tabular-nums">
                        {date.getDate()}
                      </span>
                      <span
                        className={cn(
                          "mt-1 text-[10px] leading-none tabular-nums",
                          isSelected ? "text-o-on-accent/75" : "text-o-faint",
                          hijri.day === 1 && !isSelected && "font-semibold text-o-accent"
                        )}
                      >
                        {hijri.day}
                      </span>
                      {events.length > 0 || isWhiteDay(hijri) ? (
                        <span
                          className={cn(
                            "absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full",
                            isSelected
                              ? "bg-o-on-accent"
                              : events.length > 0
                                ? "bg-o-accent"
                                : "bg-o-faint"
                          )}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <div className="text-[15px] font-semibold">
                {formatDay(selectedEntry.date, { weekday: "long", day: "numeric", month: "long" })}
              </div>
              <div className="mt-0.5 text-xs text-o-muted">{formatHijri(selectedEntry.hijri)}</div>
              {selectedEntry.events.length > 0 || isWhiteDay(selectedEntry.hijri) ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedEntry.events.map((event) => (
                    <span
                      key={event.name}
                      className="inline-flex h-6 items-center gap-1 rounded-full bg-o-accent-soft px-2.5 text-xs font-medium text-o-accent"
                    >
                      <Sparkles className="h-3 w-3" />
                      {event.name}
                    </span>
                  ))}
                  {isWhiteDay(selectedEntry.hijri) ? (
                    <span className="inline-flex h-6 items-center rounded-full bg-o-surface-2 px-2.5 text-xs text-o-muted">
                      White day · sunnah fast
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <PrayerTimesList
              times={selectedEntry.times}
              day={selectedEntry.date}
              timeZone={timeZone}
              hour12={hour12}
            />
            <div className="grid grid-cols-2 gap-2 border-t border-o-line p-3">
              <div className="rounded-2xl bg-o-surface-2 px-3.5 py-2.5">
                <div className="text-xs text-o-faint">Islamic midnight</div>
                <div className="mt-0.5 text-sm font-medium tabular-nums">
                  {formatClock(selectedNight.midnight, timeZone, hour12)}
                </div>
              </div>
              <div className="rounded-2xl bg-o-surface-2 px-3.5 py-2.5">
                <div className="text-xs text-o-faint">Last third</div>
                <div className="mt-0.5 text-sm font-medium tabular-nums">
                  {formatClock(selectedNight.lastThird, timeZone, hour12)}
                </div>
              </div>
            </div>
          </Panel>

          {upcoming.length > 0 ? (
            <div>
              <div className="px-1 pb-2 text-xs font-medium tracking-[0.12em] text-o-faint uppercase">
                Upcoming
              </div>
              <Panel className="overflow-hidden">
                <ul className="divide-y divide-o-line">
                  {upcoming.map((event) => (
                    <li key={`${dayKey(event.date)}-${event.name}`}>
                      <button
                        type="button"
                        onClick={() => goToDay(event.date)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-o-surface-2"
                      >
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-o-surface-2 text-center leading-none">
                          <span>
                            <span className="block text-[15px] font-semibold tabular-nums">
                              {event.date.getDate()}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-o-faint uppercase">
                              {formatDay(event.date, { month: "short" })}
                            </span>
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-medium">{event.name}</span>
                          <span className="block truncate text-xs text-o-faint">
                            {event.hijri.day} {event.hijri.monthName}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-medium",
                            event.daysAway <= 7 ? "text-o-accent" : "text-o-muted"
                          )}
                        >
                          {formatDaysAway(event.daysAway)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          ) : null}
        </>
      ) : (
        <Panel className="overflow-clip">
          <table ref={tableRef} className="w-full table-fixed text-center text-[13px] tabular-nums">
            <thead className="sticky top-0 bg-o-surface">
              <tr className="border-b border-o-line text-[11px] text-o-faint">
                <th className="w-[15%] py-2.5 pl-2 text-left font-medium">Day</th>
                {PRAYER_KEYS.map((key) => (
                  <th key={key} className="py-2.5 font-medium">
                    {key === "sunrise" ? "Rise" : PRAYER_LABELS[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(({ date, times, hijri }) => {
                const isToday = isSameDay(date, today);
                const isFriday = date.getDay() === 5;

                return (
                  <tr
                    key={dayKey(date)}
                    aria-current={isToday ? "date" : undefined}
                    className={cn(
                      "border-b border-o-line last:border-b-0",
                      isToday && "bg-o-accent-soft font-semibold text-o-accent"
                    )}
                  >
                    <td className="py-2 pl-2 text-left leading-tight">
                      <div className={cn(isFriday && !isToday && "text-o-accent")}>
                        {date.getDate()}{" "}
                        <span className="text-[10px] font-normal text-o-faint">
                          {formatDay(date, { weekday: "narrow" })}
                        </span>
                      </div>
                      <div className="text-[10px] font-normal text-o-faint">{hijri.day}</div>
                    </td>
                    {PRAYER_KEYS.map((key) => (
                      <td
                        key={key}
                        className={cn("py-2", key === "sunrise" && !isToday && "text-o-muted")}
                      >
                        {formatClock(times[key], timeZone, false)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
