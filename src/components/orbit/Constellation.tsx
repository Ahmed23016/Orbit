import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { FARD_KEYS, dayKey, getMonthDays, type FardKey } from "@/lib/orbit/schedule";
import { formatDay } from "@/lib/orbit/time";

type ConstellationProps = {
  month: Date;
  prayerDay: Date;
  selectedKey: string;
  getDone: (day: Date) => FardKey[];
  onSelect: (day: Date) => void;
  onMonthChange: (month: Date) => void;
};

/** Small deterministic PRNG so each month always draws the same sky. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 320;
const H = 190;

function sparkle(x: number, y: number, r: number) {
  const k = r * 0.28;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
}

export function Constellation({
  month,
  prayerDay,
  selectedKey,
  getDone,
  onSelect,
  onMonthChange,
}: ConstellationProps) {
  const days = getMonthDays(month);
  const todayValue = prayerDay.getTime();

  const monthIndex = month.getFullYear() * 12 + month.getMonth();
  const dayCount = days.length;
  const points = useMemo(() => {
    const random = mulberry32(monthIndex + 7);
    const phase = random() * Math.PI * 2;
    return Array.from({ length: dayCount }, (_, index) => ({
      x: 22 + (index / Math.max(1, dayCount - 1)) * (W - 44) + (random() - 0.5) * 12,
      y: H / 2 + Math.sin(index * 0.85 + phase) * 44 + (random() - 0.5) * 34,
    }));
  }, [monthIndex, dayCount]);

  const counts = days.map((day) => getDone(day).length);
  const future = days.map((day) => day.getTime() > todayValue);
  const fullDays = counts.filter((count) => count === FARD_KEYS.length).length;
  const pastDays = future.filter((isFuture) => !isFuture).length;
  const prayed = counts.reduce((sum, count, index) => sum + (future[index] ? 0 : count), 0);
  const percent = pastDays > 0 ? Math.round((prayed / (pastDays * FARD_KEYS.length)) * 100) : 0;
  const isCurrentMonth =
    month.getFullYear() === prayerDay.getFullYear() && month.getMonth() === prayerDay.getMonth();

  return (
    <div
      className="overflow-hidden rounded-2xl text-white"
      style={{ background: "linear-gradient(165deg, #0c1330 0%, #1a2150 55%, #2c2558 100%)" }}
    >
      <div className="flex items-center justify-between px-3 pt-3">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1, 12))}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition active:scale-90"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{formatDay(month, { month: "long", year: "numeric" })}</div>
          <div className="text-[11px] text-white/60 tabular-nums">
            {fullDays} bright {fullDays === 1 ? "star" : "stars"} · {percent}% prayed
          </div>
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1, 12))}
          className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition active:scale-90 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="group" aria-label="Prayer constellation">
        <defs>
          <radialGradient id="star-glow">
            <stop offset="0%" stopColor="#f6d38a" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#f6d38a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {points.slice(1).map((point, index) => {
          const previous = points[index];
          const bothFull = counts[index] === FARD_KEYS.length && counts[index + 1] === FARD_KEYS.length;
          if (future[index + 1]) return null;
          return (
            <line
              key={index}
              x1={previous.x}
              y1={previous.y}
              x2={point.x}
              y2={point.y}
              stroke={bothFull ? "#e3bd72" : "#fff"}
              strokeOpacity={bothFull ? 0.7 : 0.08}
              strokeWidth={bothFull ? 1.4 : 1}
              strokeDasharray={bothFull ? undefined : "2 4"}
            />
          );
        })}

        {days.map((day, index) => {
          const { x, y } = points[index];
          const count = counts[index];
          const key = dayKey(day);
          const isSelected = key === selectedKey;
          const isFuture = future[index];

          return (
            <g
              key={key}
              role="button"
              tabIndex={isFuture ? -1 : 0}
              aria-label={`${formatDay(day, { weekday: "long", day: "numeric", month: "long" })}: ${count} of 5 prayed`}
              onClick={() => !isFuture && onSelect(day)}
              onKeyDown={(event) => {
                if (!isFuture && (event.key === "Enter" || event.key === " ")) onSelect(day);
              }}
              className={isFuture ? undefined : "cursor-pointer"}
            >
              <circle cx={x} cy={y} r="12" fill="transparent" />
              {isSelected ? (
                <circle cx={x} cy={y} r="9" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1" />
              ) : null}
              {isFuture ? (
                <circle cx={x} cy={y} r="1.6" fill="none" stroke="#fff" strokeOpacity="0.2" />
              ) : count === FARD_KEYS.length ? (
                <>
                  <circle cx={x} cy={y} r="11" fill="url(#star-glow)" />
                  <path d={sparkle(x, y, 6.5)} fill="#f6d38a" />
                </>
              ) : (
                <circle cx={x} cy={y} r={1.2 + count * 0.7} fill="#fff" fillOpacity={0.25 + count * 0.13} />
              )}
            </g>
          );
        })}
      </svg>

      <p className="px-4 pb-3 text-center text-[11px] text-white/55">
        Every day you pray all five lights a star. Unbroken days join into a constellation.
      </p>
    </div>
  );
}
