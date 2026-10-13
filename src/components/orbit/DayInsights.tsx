import { useState, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Panel, Segmented } from "@/components/orbit/primitives";
import { formatDaysAway, type UpcomingEvent } from "@/lib/orbit/events";
import { getDayLength, getMoonInsights, getSunnahTimes } from "@/lib/orbit/insights";
import { getNightTimes, shiftDay, type PrayerCalculator } from "@/lib/orbit/schedule";
import { formatClock, formatDay, formatDuration, minuteDiff } from "@/lib/orbit/time";

type InsightTab = "prayers" | "sun" | "night" | "moon";

type DayInsightsProps = {
  day: Date;
  calc: PrayerCalculator;
  /** Same location and method with the other Asr convention. */
  altAsrCalc: PrayerCalculator;
  madhabLabel: string;
  altMadhabLabel: string;
  timeZone: string;
  hour12: boolean;
  nextEvent?: UpcomingEvent;
};

function InfoRow({
  label,
  hint,
  value,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm text-o-text">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-o-faint">{hint}</div> : null}
      </div>
      <div className="shrink-0 text-right text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

/** A lit moon disc for a phase in [0, 1): 0 new, 0.5 full (northern-hemisphere view). */
function MoonGlyph({ phase, size = 64 }: { phase: number; size?: number }) {
  const r = 28;
  const k = Math.cos(2 * Math.PI * phase);
  const waxing = phase < 0.5;
  const rx = Math.abs(k) * r;
  const limbSweep = waxing ? 1 : 0;
  const terminatorSweep = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r={r} className="fill-o-surface-2" />
      <path
        d={`M32 4 A${r} ${r} 0 0 ${limbSweep} 32 60 A${rx.toFixed(2)} ${r} 0 0 ${terminatorSweep} 32 4 Z`}
        className="fill-o-accent"
        opacity="0.9"
      />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="1" className="stroke-o-line" />
    </svg>
  );
}

function Range({ start, end, timeZone, hour12 }: { start: Date; end: Date; timeZone: string; hour12: boolean }) {
  return (
    <>
      {formatClock(start, timeZone, hour12)}
      <span className="text-o-faint"> – </span>
      {formatClock(end, timeZone, hour12)}
    </>
  );
}

export function DayInsights({
  day,
  calc,
  altAsrCalc,
  madhabLabel,
  altMadhabLabel,
  timeZone,
  hour12,
  nextEvent,
}: DayInsightsProps) {
  const [tab, setTab] = useState<InsightTab>("prayers");
  const times = calc(day);
  const sunnah = getSunnahTimes(day, calc);
  const night = getNightTimes(day, calc);
  const nextFajr = calc(shiftDay(day, 1)).fajr;
  const dayLength = getDayLength(day, calc);
  const moon = getMoonInsights(day);
  const clock = (date: Date) => formatClock(date, timeZone, hour12);

  return (
    <Panel className="px-4 pt-4 pb-2">
      <div className="flex items-center justify-between px-1">
        <div className="text-xs font-medium tracking-[0.12em] text-o-faint uppercase">Day insights</div>
        <div className="text-xs text-o-faint">
          {formatDay(day, { weekday: "short", day: "numeric", month: "short" })}
        </div>
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "prayers", label: "Prayers" },
          { value: "sun", label: "Sun" },
          { value: "night", label: "Night" },
          { value: "moon", label: "Moon" },
        ]}
        className="mt-3"
      />

      <div className="orbit-fade mt-1 divide-y divide-o-line px-1" key={tab}>
        {tab === "prayers" ? (
          <>
            <InfoRow
              label="Duha"
              hint={`Best around ${clock(sunnah.duhaBest)}`}
              value={<Range {...sunnah.duha} timeZone={timeZone} hour12={hour12} />}
            />
            <InfoRow
              label="Tahajjud"
              hint="Last third of the night"
              value={<Range {...sunnah.tahajjud} timeZone={timeZone} hour12={hour12} />}
            />
            <InfoRow
              label={`Asr · ${altMadhabLabel}`}
              hint={`You use ${madhabLabel}: ${clock(times.asr)}`}
              value={clock(altAsrCalc(day).asr)}
            />
            <div className="py-3">
              <div className="text-sm text-o-text">Avoid voluntary prayer</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {sunnah.forbidden.map((range) => (
                  <div key={range.label} className="rounded-xl bg-o-danger/10 px-2 py-2 text-center">
                    <div className="text-[11px] font-medium text-o-danger">{range.label}</div>
                    <div className="mt-0.5 text-[12px] font-medium tabular-nums">
                      {clock(range.start)}–{clock(range.end)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {tab === "sun" ? (
          <>
            <InfoRow label="Sunrise" value={clock(times.sunrise)} />
            <InfoRow label="Solar noon" hint="The sun is at its highest" value={clock(times.dhuhr)} />
            <InfoRow label="Sunset" value={clock(times.maghrib)} />
            <InfoRow
              label="Day length"
              hint={
                dayLength.change === 0 ? (
                  "Same as yesterday"
                ) : (
                  <span className="inline-flex items-center gap-1">
                    {dayLength.change > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(dayLength.change)} min {dayLength.change > 0 ? "longer" : "shorter"} than yesterday
                  </span>
                )
              }
              value={formatDuration(dayLength.minutes)}
            />
            <InfoRow
              label="Fasting length"
              hint="Fajr to Maghrib"
              value={formatDuration(minuteDiff(times.maghrib, times.fajr))}
            />
          </>
        ) : null}

        {tab === "night" ? (
          <>
            <InfoRow
              label="Night length"
              hint="Maghrib to Fajr"
              value={formatDuration(minuteDiff(nextFajr, times.maghrib))}
            />
            <InfoRow
              label="Islamic midnight"
              hint="Preferred end of Isha"
              value={clock(night.midnight)}
            />
            <InfoRow label="Last third begins" hint="Best time for Tahajjud" value={clock(night.lastThird)} />
            <InfoRow label="Next Fajr" value={clock(nextFajr)} />
          </>
        ) : null}

        {tab === "moon" ? (
          <>
            <div className="flex items-center gap-4 py-3">
              <MoonGlyph phase={moon.phase} />
              <div>
                <div className="text-[15px] font-semibold">{moon.phaseName}</div>
                <div className="mt-0.5 text-sm text-o-muted">
                  {moon.illumination}% lit · {moon.age} days old
                </div>
              </div>
            </div>
            <InfoRow
              label="Next full moon"
              hint={formatDay(moon.nextFull, { weekday: "long", day: "numeric", month: "long" })}
              value={formatDaysAway(moon.daysToFull)}
            />
            <InfoRow
              label="Next new moon"
              hint={formatDay(moon.nextNew, { weekday: "long", day: "numeric", month: "long" })}
              value={formatDaysAway(moon.daysToNew)}
            />
            {nextEvent ? (
              <InfoRow
                label={nextEvent.name}
                hint={`${nextEvent.hijri.day} ${nextEvent.hijri.monthName}`}
                value={formatDaysAway(nextEvent.daysAway)}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </Panel>
  );
}
