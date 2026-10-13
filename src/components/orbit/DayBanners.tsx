import { BookOpen, MoonStar, PartyPopper, Sparkles, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Panel } from "@/components/orbit/primitives";
import { getIslamicEvents, isRamadan, isWhiteDay } from "@/lib/orbit/events";
import { shiftDay, type PrayerCalculator } from "@/lib/orbit/schedule";
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
};

type Banner = { key: string; icon: LucideIcon; title: string; body: string; strong?: boolean };

function RamadanCard({
  now,
  today,
  calc,
  timeZone,
  hour12,
  ramadanDay,
}: Omit<DayBannersProps, "hijriMethod" | "hijriAdjustment"> & { ramadanDay: number | null }) {
  const todayTimes = calc(today);
  const nowMs = now.getTime();
  const afterIftar = nowMs >= todayTimes.maghrib.getTime();
  const suhoor = afterIftar ? calc(shiftDay(today, 1)).fajr : todayTimes.fajr;
  const iftar = todayTimes.maghrib;
  const fasting = nowMs >= todayTimes.fajr.getTime() && !afterIftar;
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
