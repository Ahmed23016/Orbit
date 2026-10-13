import { Check } from "lucide-react";

import { prayerLabel, type PrayerMoment } from "@/lib/orbit/schedule";
import { SKY_GRADIENTS, type SkyArc, type SkyPhase } from "@/lib/orbit/sky";
import { formatClock, formatCountdown } from "@/lib/orbit/time";
import { cn } from "@/lib/utils";

type SkyHeroProps = {
  now: Date;
  phase: SkyPhase;
  arc: SkyArc | null;
  next: PrayerMoment;
  nextDay: Date;
  current: PrayerMoment;
  currentDay: Date;
  rolledOver: boolean;
  timeZone: string;
  hour12: boolean;
  /** Present when the current prayer can be marked as prayed. */
  prayed?: { done: boolean; onToggle: () => void };
};

// Arc geometry inside a 320×120 viewBox: half-ellipse centred at (160, 96).
const CX = 160;
const BASE = 96;
const RX = 136;
const RY = 78;

function arcPoint(t: number) {
  return {
    x: CX - RX * Math.cos(Math.PI * t),
    y: BASE - RY * Math.sin(Math.PI * t),
  };
}

function arcPath(from: number, to: number) {
  const steps = Math.max(2, Math.round((to - from) * 48));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const { x, y } = arcPoint(from + ((to - from) * index) / steps);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

const STARS = [
  [34, 22, 0.9],
  [62, 50, 0.6],
  [98, 14, 0.7],
  [212, 18, 0.8],
  [252, 44, 0.5],
  [288, 16, 0.7],
  [140, 8, 0.5],
  [184, 40, 0.4],
] as const;

export function SkyHero({
  now,
  phase,
  arc,
  next,
  nextDay,
  current,
  currentDay,
  rolledOver,
  timeZone,
  hour12,
  prayed,
}: SkyHeroProps) {
  const isNight = phase === "night" || phase === "dusk" || phase === "dawn";
  const body = arc ? arcPoint(arc.t) : null;
  const nextName = prayerLabel(next.key, nextDay);

  return (
    <section
      className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-[0_18px_40px_-18px_rgba(10,20,50,0.55)] transition-[background] duration-1000"
      style={{ background: SKY_GRADIENTS[phase].background }}
      aria-label={`Next prayer ${nextName} at ${formatClock(next.time, timeZone, hour12)}`}
    >
      <div className="flex items-center justify-between text-[11px] font-medium tracking-[0.14em] text-white/70 uppercase">
        <span>
          {next.key === "sunrise" ? "Fajr ends" : "Next prayer"}
          {rolledOver ? " · tomorrow" : ""}
        </span>
        <span className="tracking-normal tabular-nums normal-case">
          {formatClock(now, timeZone, hour12)}
        </span>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h2 className="text-[40px] leading-none font-semibold tracking-tight">{nextName}</h2>
        <div className="text-[40px] leading-none font-semibold tracking-tight tabular-nums">
          {formatClock(next.time, timeZone, hour12)}
        </div>
      </div>

      <div className="mt-3 inline-flex h-7 items-center rounded-full bg-white/15 px-3 text-sm font-medium tabular-nums backdrop-blur-sm">
        in {formatCountdown(next.time, now)}
      </div>

      {arc ? (
        <svg viewBox="0 0 320 118" className="-mx-1 mt-1 w-[calc(100%+0.5rem)]" aria-hidden="true">
          <defs>
            <radialGradient id="sky-glow">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {isNight
            ? STARS.map(([x, y, opacity]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="#fff" opacity={opacity * 0.7} />
              ))
            : null}

          <line x1="8" x2="312" y1={BASE} y2={BASE} stroke="#fff" strokeOpacity="0.22" />
          <path
            d={arcPath(0, 1)}
            fill="none"
            stroke="#fff"
            strokeOpacity="0.25"
            strokeWidth="1.5"
            strokeDasharray="2 5"
            strokeLinecap="round"
          />
          {arc.t > 0 ? (
            <path
              d={arcPath(0, arc.t)}
              fill="none"
              stroke="#fff"
              strokeOpacity="0.75"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : null}

          {arc.markers.map((marker) => {
            const point = arcPoint(marker.t);
            // Hide a label the sun/moon is sitting on.
            const covered = Math.abs(marker.t - arc.t) < 0.07;
            return (
              <g key={marker.label} opacity={marker.t <= arc.t ? 0.55 : 0.85}>
                <circle cx={point.x} cy={point.y} r="2.5" fill="#fff" />
                <text
                  opacity={covered ? 0 : 1}
                  x={point.x}
                  y={point.y + 14}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="9"
                  fontWeight="500"
                >
                  {marker.label}
                </text>
              </g>
            );
          })}

          {body ? (
            <g>
              <circle cx={body.x} cy={body.y} r="18" fill="url(#sky-glow)" />
              {arc.kind === "sun" ? (
                <circle cx={body.x} cy={body.y} r="7" fill="#fff4cf" />
              ) : (
                <>
                  <circle cx={body.x} cy={body.y} r="6.5" fill="#eef2ff" />
                  <circle cx={body.x + 3} cy={body.y - 2} r="5.5" fill="#000" fillOpacity="0.28" />
                </>
              )}
            </g>
          ) : null}

          <text x="10" y="112" fill="#fff" fillOpacity="0.6" fontSize="9.5">
            {arc.startLabel} {formatClock(arc.start, timeZone, hour12)}
          </text>
          <text x="310" y="112" fill="#fff" fillOpacity="0.6" fontSize="9.5" textAnchor="end">
            {arc.endLabel} {formatClock(arc.end, timeZone, hour12)}
          </text>
        </svg>
      ) : (
        <div className="h-4" />
      )}

      <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/15 pt-3">
        <div className="min-w-0 text-sm text-white/80">
          <span className="font-medium text-white">{prayerLabel(current.key, currentDay)}</span>{" "}
          since {formatClock(current.time, timeZone, hour12)}
        </div>

        {prayed ? (
          <button
            type="button"
            onClick={prayed.onToggle}
            aria-pressed={prayed.done}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition active:scale-95",
              prayed.done ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/25"
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            {prayed.done ? "Prayed" : "Mark prayed"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
