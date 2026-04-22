import { memo, useState } from "react";
import { Compass, X } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/orbit/time";

type MoonData = {
  age: number;
  illumination: number;
  phaseName: string;
};

type Stats = {
  daylightMinutes: number;
  fastingMinutes: number;
  nightMinutes: number;
  qibla: number;
  solarNoon: string;
};

type StatsGridProps = {
  stats: Stats;
  moon: MoonData;
  compact?: boolean;
};

function StatCard({
  title,
  children,
  className = "",
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Card
      className={cn(
        "orbit-card h-full rounded-[28px] border border-white/10 bg-slate-950/68",
        compact && "rounded-[22px] bg-slate-950/92",
        className
      )}
    >
      <CardHeader className={cn(compact && "pb-2")}>
        <CardTitle className={cn("text-white", compact && "text-sm font-medium text-slate-300")}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatsGridInner({ stats, moon, compact = false }: StatsGridProps) {
  const [showCompass, setShowCompass] = useState(false);

  return (
    <>
      <div className={cn("mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4", compact && "mt-0 grid-cols-2 gap-3")}>
        <StatCard title={compact ? "Light" : "Daylight window"} compact={compact}>
          <div className="text-3xl font-semibold text-white">
            {formatDuration(stats.daylightMinutes)}
          </div>
          {!compact ? <p className="mt-2 text-sm text-slate-400">From sunrise to maghrib.</p> : null}
        </StatCard>

        <StatCard title={compact ? "Fast" : "Fasting window"} compact={compact}>
          <div className="text-3xl font-semibold text-white">
            {formatDuration(stats.fastingMinutes)}
          </div>
          {!compact ? <p className="mt-2 text-sm text-slate-400">From fajr to maghrib.</p> : null}
        </StatCard>

        <button type="button" onClick={() => setShowCompass(true)} className="h-full text-left">
          <StatCard
            title={compact ? "Qibla" : "Qibla bearing"}
            compact={compact}
            className={cn(
              "cursor-pointer transition",
              compact
                ? "hover:border-white/20 hover:bg-white/[0.04]"
                : "hover:border-cyan-300/35 hover:bg-slate-950/80 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {!compact ? (
                  <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/[0.08] p-2.5">
                    <Compass className="h-6 w-6 text-cyan-300" />
                  </div>
                ) : null}
                <div className="text-4xl font-semibold text-white">{stats.qibla} deg</div>
              </div>

              {!compact ? (
                <div className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-amber-100">
                  Open
                </div>
              ) : null}
            </div>

            <div className={cn("mt-4 text-sm", compact ? "text-slate-500" : "text-slate-400")}>
              {compact ? "Compass" : "Open compass"}
            </div>
          </StatCard>
        </button>

        <StatCard title={compact ? "Moon" : "Moon data"} compact={compact}>
          {compact ? (
            <div className="space-y-2">
              <div className="text-xl font-semibold text-white">{moon.phaseName}</div>
              <div className="text-sm text-slate-500">{moon.illumination}% light</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                <span className="text-slate-400">Phase</span>
                <span className="font-medium text-white">{moon.phaseName}</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                <span className="text-slate-400">Illumination</span>
                <span className="font-medium text-white">{moon.illumination}%</span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-3">
                <span className="text-slate-400">Age</span>
                <span className="font-medium text-white">{moon.age} days</span>
              </div>
            </div>
          )}
        </StatCard>
      </div>

      {showCompass ? (
        <div className="orbit-modal-scrim fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/95 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold text-white">{compact ? "Qibla" : "Qibla compass"}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {compact
                    ? `${stats.qibla} deg from north`
                    : `Qibla is ${stats.qibla} deg clockwise from true north toward Makkah.`}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCompass(false)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <div className="relative h-72 w-72 rounded-full border border-white/10 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.12),rgba(15,23,42,0.92)_60%)] shadow-[inset_0_0_40px_rgba(255,255,255,0.03)]">
                <div className="absolute left-1/2 top-4 -translate-x-1/2 text-xs font-medium tracking-[0.35em] text-white">
                  N
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium tracking-[0.35em] text-slate-500">
                  S
                </div>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium tracking-[0.35em] text-slate-500">
                  W
                </div>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium tracking-[0.35em] text-slate-500">
                  E
                </div>

                <div className="absolute inset-5 rounded-full border border-dashed border-white/10" />
                <div className="absolute inset-10 rounded-full border border-white/6" />

                <svg
                  viewBox="0 0 288 288"
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="qiblaArrow" x1="144" y1="144" x2="144" y2="44" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="70%" stopColor="#9ae6b4" />
                      <stop offset="100%" stopColor="#fde68a" />
                    </linearGradient>
                    <filter id="qiblaGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g transform={`rotate(${stats.qibla} 144 144)`} filter="url(#qiblaGlow)">
                    <line
                      x1="144"
                      y1="144"
                      x2="144"
                      y2="56"
                      stroke="url(#qiblaArrow)"
                      strokeWidth="7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M144 38 L156 62 L144 56 L132 62 Z"
                      fill="#fde68a"
                    />
                  </g>
                </svg>

                <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950 shadow-[0_0_0_6px_rgba(255,255,255,0.04)]" />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
              {compact
                ? "Face north, then turn until the arrow matches."
                : "Face north, then turn until the arrow matches."}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export const StatsGrid = memo(StatsGridInner);
