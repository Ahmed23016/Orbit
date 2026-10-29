import { useMemo } from "react";
import { BookOpen, ChevronRight, Moon, MoonStar, PartyPopper, Sparkles, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Panel } from "@/components/orbit/primitives";
import { getIslamicEvents, isRamadan, isWhiteDay } from "@/lib/orbit/events";
import { dayKey, isSameDay, shiftDay, type PrayerCalculator } from "@/lib/orbit/schedule";
import { getCrescentWatch } from "@/lib/orbit/sighting";
import { formatClock, formatCountdown, getHijriParts } from "@/lib/orbit/time";
import type { HijriMethodKey } from "@/lib/orbit/types";
import { cn } from "@/lib/utils";

type DayBannersProps = {
  now: Date;
  today: Date;
  calc: PrayerCalculator;
  timeZone: string;
  hour12: boolean;
  hijriMethod: HijriMethodKey;
  hijriAdjustment: number;
  latitude: number;
  longitude: number;
  onOpenSky: () => void;
};

type Banner = { key: string; icon: LucideIcon; title: string; body: string; strong?: boolean };

function RamadanCard({
  now,
  today,
  calc,
  timeZone,
  hour12,
  ramadanDay,
}: Pick<DayBannersProps, "now" | "today" | "calc" | "timeZone" | "hour12"> & { ramadanDay: number | null }) {
  const nowMs = now.getTime();
  // On the eve of Ramadan, show the first fast (tomorrow); otherwise today's.
  const fastDay = ramadanDay === null ? shiftDay(today, 1) : today;
  const fastTimes = calc(fastDay);
  const afterIftar = nowMs >= fastTimes.maghrib.getTime();
  const suhoor = afterIftar ? calc(shiftDay(fastDay, 1)).fajr : fastTimes.fajr;
  const iftar = afterIftar ? calc(shiftDay(fastDay, 1)).maghrib : fastTimes.maghrib;
  const fasting = nowMs >= fastTimes.fajr.getTime() && !afterIftar;
  const items = [
    { label: "Suhoor ends", time: suhoor, active: !fasting },
    { label: "Iftar", time: iftar, active: fasting },
  ];

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-2 px-5 pt-4 text-xs font-medium tracking-[0.12em] text-o-faint uppercase">
        <MoonStar className="h-3.5 w-3.5 text-o-accent" />
        {ramadanDay === null ? "Ramadan starts tomorrow" : `Ramadan · day ${ramadanDay}`}
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              "rounded-2xl px-4 py-3",
              item.active ? "bg-o-accent-soft" : "bg-o-surface-2"
            )}
          >
            <div className="text-xs text-o-muted">{item.label}</div>
            <div className="mt-0.5 text-xl font-semibold tabular-nums">
              {formatClock(item.time, timeZone, hour12)}
            </div>
            <div className="mt-0.5 text-xs text-o-faint tabular-nums">
              {item.time.getTime() > nowMs ? `in ${formatCountdown(item.time, now)}` : "Done"}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CrescentBanner({
  now,
  today,
  calc,
  timeZone,
  hour12,
  latitude,
  longitude,
  onOpenSky,
}: DayBannersProps) {
  const todayKey = dayKey(today);
  // Recomputed at most every ten minutes.
  const tenMinutes = Math.floor(now.getTime() / 600000);
  const tonight = useMemo(() => {
    const watch = getCrescentWatch(new Date(tenMinutes * 600000), calc, latitude, longitude, timeZone);
    return watch.evenings.find((evening) => isSameDay(evening.day, today)) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey, tenMinutes, calc, latitude, longitude, timeZone]);

  if (!tonight || tonight.forecast.verdict === "impossible" || now.getTime() > tonight.sunset.getTime() + 2 * 3600000) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onOpenSky}
      className="flex items-center gap-3.5 rounded-3xl border border-o-line bg-o-surface p-4 text-left transition active:scale-[0.99]"
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-o-accent-soft text-o-accent">
        <Moon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Crescent watch tonight · {tonight.forecast.title}</span>
        <span className="mt-0.5 block text-sm text-o-muted">
          Look low in the west after Maghrib ({formatClock(tonight.sunset, timeZone, hour12)}).
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-o-faint" />
    </button>
  );
}

export function DayBanners(props: DayBannersProps) {
  const { today, hijriMethod, hijriAdjustment } = props;
  const hijri = getHijriParts(today, hijriMethod, hijriAdjustment);
  const hijriTomorrow = getHijriParts(shiftDay(today, 1), hijriMethod, hijriAdjustment);
  const banners: Banner[] = [];

  for (const event of getIslamicEvents(hijri)) {
    banners.push({
      key: `today-${event.name}`,
      icon: event.kind === "eid" ? PartyPopper : Sparkles,
      title: event.kind === "eid" ? `${event.name} Mubarak` : event.name,
      body: event.note ?? "Today",
      strong: true,
    });
  }

  for (const event of getIslamicEvents(hijriTomorrow)) {
    if (event.name === "Ramadan begins") continue;
    banners.push({
      key: `tomorrow-${event.name}`,
      icon: Sparkles,
      title: `Tomorrow: ${event.name}`,
      body: event.note ?? "Prepare tonight.",
    });
  }

  if (today.getDay() === 5) {
    banners.push({
      key: "jumuah",
      icon: BookOpen,
      title: "Jumuʿah Mubarak",
      body: "A good day to read Sūrat al-Kahf and send salawat.",
    });
  }

  if (isWhiteDay(hijri)) {
    banners.push({
      key: "white-day",
      icon: UtensilsCrossed,
      title: `White day · ${hijri.day} ${hijri.monthName}`,
      body: "Voluntary fasting on the 13th–15th is recommended.",
    });
  }

  const ramadanTomorrow = !isRamadan(hijri) && isRamadan(hijriTomorrow);

  return (
    <>
      <CrescentBanner {...props} />

      {isRamadan(hijri) || ramadanTomorrow ? (
        <RamadanCard {...props} ramadanDay={ramadanTomorrow ? null : hijri.day} />
      ) : null}

      {banners.slice(0, 2).map(({ key, icon: Icon, title, body, strong }) => (
        <Panel key={key} className="flex items-center gap-3.5 p-4">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
              strong ? "bg-o-accent text-o-on-accent" : "bg-o-accent-soft text-o-accent"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold">{title}</div>
            <div className="mt-0.5 text-sm text-o-muted">{body}</div>
          </div>
        </Panel>
      ))}
    </>
  );
}
