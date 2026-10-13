import {
  CloudSun,
  Moon,
  MoonStar,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from "lucide-react";

import { PRAYER_KEYS, prayerLabel, type PrayerKey } from "@/lib/orbit/schedule";
import { formatClock } from "@/lib/orbit/time";
import type { PrayerSet } from "@/lib/orbit/types";
import { cn } from "@/lib/utils";

const PRAYER_ICONS: Record<PrayerKey, LucideIcon> = {
  fajr: MoonStar,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: Moon,
};

type PrayerTimesListProps = {
  times: PrayerSet;
  day: Date;
  timeZone: string;
  hour12: boolean;
  highlight?: PrayerKey;
  /** When set, prayers before this moment are dimmed. */
  now?: Date;
  /** When each time ends, shown under its name. */
  windows?: Record<PrayerKey, Date>;
};

export function PrayerTimesList({
  times,
  day,
  timeZone,
  hour12,
  highlight,
  now,
  windows,
}: PrayerTimesListProps) {
  return (
    <ul className="px-2 pb-2">
      {PRAYER_KEYS.map((key) => {
        const Icon = PRAYER_ICONS[key];
        const isHighlighted = key === highlight;
        const hasStarted = now ? times[key].getTime() <= now.getTime() : false;
        const isPast = hasStarted && !isHighlighted;
        const isSunrise = key === "sunrise";

        return (
          <li
            key={key}
            aria-current={isHighlighted ? "time" : undefined}
            className={cn(
              "flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-1.5 transition-colors",
              isHighlighted && "bg-o-accent-soft"
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                isHighlighted ? "bg-o-accent text-o-on-accent" : "bg-o-surface-2 text-o-muted",
                isPast && "opacity-60"
              )}
            >
              <Icon className="h-4 w-4" />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-[15px]",
                  isSunrise ? "text-o-muted" : "font-medium text-o-text",
                  isHighlighted && "font-semibold text-o-accent",
                  isPast && "text-o-muted"
                )}
              >
                {prayerLabel(key, day)}
              </span>
              {windows ? (
                <span className="block text-[11px] text-o-faint tabular-nums">
                  {isSunrise
                    ? `Duha from ${formatClock(windows.sunrise, timeZone, hour12)}`
                    : `until ${formatClock(windows[key], timeZone, hour12)}`}
                </span>
              ) : null}
            </span>

            <span
              className={cn(
                "text-[15px] tabular-nums",
                isSunrise ? "text-o-muted" : "font-medium text-o-text",
                isHighlighted && "font-semibold text-o-accent",
                isPast && "text-o-muted"
              )}
            >
              {formatClock(times[key], timeZone, hour12)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
