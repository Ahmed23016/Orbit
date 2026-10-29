import { lazy, Suspense, useEffect, useState } from "react";
import { ChevronRight, LoaderCircle, MapPin, Sparkles } from "lucide-react";

import { DayBanners } from "@/components/orbit/DayBanners";
import { DayInsights } from "@/components/orbit/DayInsights";
import { Panel } from "@/components/orbit/primitives";
import { PrayerTimesList } from "@/components/orbit/PrayerTimesList";
import { PrayerTracker } from "@/components/orbit/PrayerTracker";
import { SkyHero } from "@/components/orbit/SkyHero";
import { useNextOccasion } from "@/hooks/orbit/useNextOccasion";
import { useNow } from "@/hooks/orbit/useNow";
import { getPrayerWindows } from "@/lib/orbit/insights";
import { getJamaahTime } from "@/lib/orbit/jamaah";
import {
  dayKey,
  getPrayerDay,
  getPrayerTimeline,
  FARD_KEYS,
  shiftDay,
  type FardKey,
  type PrayerCalculator,
  type PrayerKey,
} from "@/lib/orbit/schedule";
import { getSeason } from "@/lib/orbit/seasons";
import type { JamaahSettings } from "@/lib/orbit/settings";
import { getSkyArc, getSkyPhase } from "@/lib/orbit/sky";
import { formatDay, formatHijri, getDateInTimeZone, getHijriParts } from "@/lib/orbit/time";
import type { HijriMethodKey, MadhabKey } from "@/lib/orbit/types";

const SkyView = lazy(() =>
  import("@/components/orbit/SkyView").then((module) => ({ default: module.SkyView }))
);

export type MethodInfo = {
  label: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval: number;
};

type TodayViewProps = {
  latitude: number;
  longitude: number;
  jamaah: JamaahSettings;
  method: MethodInfo;
  onStartTasbih: () => void;
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
  latitude,
  longitude,
  jamaah,
  method,
  onStartTasbih,
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
  const [skyOpen, setSkyOpen] = useState(false);
  const [tasbihPrompt, setTasbihPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (!tasbihPrompt) return;
    const timeoutId = window.setTimeout(() => setTasbihPrompt(null), 15000);
    return () => window.clearTimeout(timeoutId);
  }, [tasbihPrompt]);

  const season = getSeason(hijri, now.getTime() >= todayTimes.maghrib.getTime());
  const jamaahFor = (key: PrayerKey, onDay: Date, adhan: Date) =>
    key === "sunrise" ? null : getJamaahTime(key, onDay, adhan, jamaah, timeZone);
  const listJamaah = Object.fromEntries(
    FARD_KEYS.map((key) => [key, jamaahFor(key, day, times[key])])
  ) as Partial<Record<PrayerKey, Date | null>>;

  const nextEvent = useNextOccasion(dayKey(today), hijriMethod, hijriAdjustment);

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
        jamaah={jamaahFor(next.key, day, next.time)}
        season={season}
        onOpenSky={() => setSkyOpen(true)}
        prayed={
          tracker.enabled && currentIsFard
            ? {
                done: doneToday.includes(current.key as FardKey),
                onToggle: () => {
                  const wasDone = doneToday.includes(current.key as FardKey);
                  tracker.toggle(prayerDay, current.key as FardKey);
                  setTasbihPrompt(wasDone ? null : current.key);
                },
              }
            : undefined
        }
      />

      {tasbihPrompt ? (
        <button
          type="button"
          onClick={() => {
            setTasbihPrompt(null);
            onStartTasbih();
          }}
          className="orbit-fade flex items-center gap-3 rounded-3xl border border-o-line bg-o-accent-soft p-4 text-left transition active:scale-[0.99]"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-o-accent text-o-on-accent">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">Start the after-prayer tasbīḥ</span>
            <span className="block text-sm text-o-muted">SubḥānAllāh, Alḥamdulillāh, Allāhu akbar</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-o-accent" />
        </button>
      ) : null}

      <DayBanners
        now={now}
        today={today}
        calc={calc}
        timeZone={timeZone}
        hour12={hour12}
        hijriMethod={hijriMethod}
        hijriAdjustment={hijriAdjustment}
        latitude={latitude}
        longitude={longitude}
        onOpenSky={() => setSkyOpen(true)}
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
          jamaah={listJamaah}
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

      {skyOpen ? (
        <Suspense fallback={null}>
          <SkyView
            onClose={() => setSkyOpen(false)}
            calc={calc}
            latitude={latitude}
            longitude={longitude}
            timeZone={timeZone}
            locationLabel={locationLabel}
            hour12={hour12}
            madhab={madhab}
            methodLabel={method.label}
            fajrAngle={method.fajrAngle}
            ishaAngle={method.ishaAngle}
            ishaInterval={method.ishaInterval}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
