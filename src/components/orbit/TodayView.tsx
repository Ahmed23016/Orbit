import { ChevronRight, LoaderCircle, MapPin } from "lucide-react";

import { DayBanners } from "@/components/orbit/DayBanners";
import { DayInsights } from "@/components/orbit/DayInsights";
import { Panel } from "@/components/orbit/primitives";
import { PrayerTimesList } from "@/components/orbit/PrayerTimesList";
import { PrayerTracker } from "@/components/orbit/PrayerTracker";
import { SkyHero } from "@/components/orbit/SkyHero";
import { useNow } from "@/hooks/orbit/useNow";
import { getUpcomingEvents } from "@/lib/orbit/events";
import { getPrayerWindows } from "@/lib/orbit/insights";
import {
  dayKey,
  getPrayerDay,
  getPrayerTimeline,
  shiftDay,
  type FardKey,
  type PrayerCalculator,
} from "@/lib/orbit/schedule";
import { getSkyArc, getSkyPhase } from "@/lib/orbit/sky";
import { formatDay, formatHijri, getDateInTimeZone, getHijriParts } from "@/lib/orbit/time";
import type { HijriMethodKey, MadhabKey } from "@/lib/orbit/types";

type TodayViewProps = {
  calc: PrayerCalculator;
  altAsrCalc: PrayerCalculator;
  madhab: MadhabKey;
  timeZone: string;
  locationLabel: string;
  hijriMethod: HijriMethodKey;
  hijriAdjustment: number;
  hour12: boolean;
  isLocating: boolean;
  onOpenLocation: () => void;
  tracker: {
    enabled: boolean;
    getDone: (day: Date) => FardKey[];
    toggle: (day: Date, prayer: FardKey) => void;
  };
};

const MADHAB_LABELS: Record<MadhabKey, string> = { shafi: "Standard", hanafi: "Hanafi" };

export function TodayView({
  calc,
  altAsrCalc,
  madhab,
  timeZone,
  locationLabel,
  hijriMethod,
  hijriAdjustment,
  hour12,
  isLocating,
  onOpenLocation,
  tracker,
}: TodayViewProps) {
  const now = useNow(1000);
  const today = getDateInTimeZone(now, timeZone);
  const { current, next, times, day, rolledOver } = getPrayerTimeline(now, today, calc);
  const todayTimes = calc(today);
  const prayerDay = getPrayerDay(now, today, calc);
  const phase = getSkyPhase(current.key, now, todayTimes.maghrib);
  const arc = getSkyArc(now, today, calc);

  // Local moon sighting starts the Hijri day at Maghrib.
  const hijriDay =
    hijriMethod === "local" && now.getTime() >= todayTimes.maghrib.getTime()
      ? shiftDay(today, 1)
      : today;
  const hijri = getHijriParts(hijriDay, hijriMethod, hijriAdjustment);

  const currentIsFard = current.key !== "sunrise";
  const doneToday = tracker.getDone(prayerDay);

  const [nextEvent] = getUpcomingEvents(shiftDay(today, 1), hijriMethod, hijriAdjustment, 1);

  return (
    <div className="orbit-fade grid grid-cols-1 gap-4">
      <header className="pt-1">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm font-medium text-o-accent">{formatHijri(hijri)}</p>
          <button
            type="button"
            onClick={onOpenLocation}
            className="flex h-8 max-w-[50%] shrink-0 items-center gap-1.5 rounded-full border border-o-line bg-o-surface/80 pr-2 pl-2.5 text-[13px] text-o-text backdrop-blur transition active:scale-[0.97]"
          >
            {isLocating ? (
              <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-o-accent" />
            ) : (
              <MapPin className="h-3.5 w-3.5 shrink-0 text-o-accent" />
            )}
            <span className="truncate">{locationLabel}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-o-faint" />
          </button>
        </div>
        <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
          {formatDay(today, { weekday: "long", day: "numeric", month: "long" })}
        </h1>
      </header>

      <SkyHero
        now={now}
        phase={phase}
        arc={arc}
        next={next}
        nextDay={day}
        current={current}
        currentDay={prayerDay}
        rolledOver={rolledOver}
        timeZone={timeZone}
        hour12={hour12}
        prayed={
          tracker.enabled && currentIsFard
            ? {
                done: doneToday.includes(current.key as FardKey),
                onToggle: () => tracker.toggle(prayerDay, current.key as FardKey),
              }
            : undefined
        }
      />

      <DayBanners
        now={now}
        today={today}
        calc={calc}
        timeZone={timeZone}
        hour12={hour12}
        hijriMethod={hijriMethod}
        hijriAdjustment={hijriAdjustment}
      />

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 text-xs font-medium tracking-[0.12em] text-o-faint uppercase">
          <span>{rolledOver ? "Tomorrow" : "Today"}</span>
          <span className="tracking-normal normal-case">
            {formatDay(day, { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>
        <PrayerTimesList
          times={times}
          day={day}
          timeZone={timeZone}
          hour12={hour12}
          highlight={next.key}
          now={rolledOver ? undefined : now}
          windows={getPrayerWindows(day, calc)}
        />
      </Panel>

      {tracker.enabled ? (
        <PrayerTracker
          key={dayKey(prayerDay)}
          now={now}
          prayerDay={prayerDay}
          calc={calc}
          timeZone={timeZone}
          hour12={hour12}
          getDone={tracker.getDone}
          toggle={tracker.toggle}
        />
      ) : null}

      <DayInsights
        day={day}
        calc={calc}
        altAsrCalc={altAsrCalc}
        madhabLabel={MADHAB_LABELS[madhab]}
        altMadhabLabel={MADHAB_LABELS[madhab === "hanafi" ? "shafi" : "hanafi"]}
        timeZone={timeZone}
        hour12={hour12}
        nextEvent={nextEvent ? { ...nextEvent, daysAway: nextEvent.daysAway + 1 } : undefined}
      />
    </div>
  );
}
