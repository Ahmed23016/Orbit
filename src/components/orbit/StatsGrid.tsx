import { memo, useState } from "react";
import { Compass } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QiblaCompassModal } from "@/components/orbit/QiblaCompassModal";
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
  latitude: number;
  longitude: number;
  timeZone: string;
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

function StatsGridInner({
  stats,
  moon,
  latitude,
  longitude,
  timeZone,
  compact = false,
}: StatsGridProps) {
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

      <QiblaCompassModal
        open={showCompass}
        onClose={() => setShowCompass(false)}
        qibla={stats.qibla}
        latitude={latitude}
        longitude={longitude}
        timeZone={timeZone}
        moon={moon}
        compact={compact}
      />
    </>
  );
}

export const StatsGrid = memo(StatsGridInner);
