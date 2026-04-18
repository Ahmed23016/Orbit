import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass } from "lucide-react";
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
};

export function StatsGrid({ stats, moon }: StatsGridProps) {
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
      <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
        <CardHeader>
          <CardTitle className="text-white">Daylight window</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-white">
            {formatDuration(stats.daylightMinutes)}
          </div>
          <p className="mt-2 text-sm text-slate-400">From sunrise to maghrib.</p>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
        <CardHeader>
          <CardTitle className="text-white">Fasting window</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold text-white">
            {formatDuration(stats.fastingMinutes)}
          </div>
          <p className="mt-2 text-sm text-slate-400">From fajr to maghrib.</p>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
        <CardHeader>
          <CardTitle className="text-white">Qibla bearing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Compass className="h-7 w-7 text-cyan-300" />
            <div className="text-3xl font-semibold text-white">{stats.qibla}°</div>
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Approximate bearing from true north toward Makkah.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-cyan-500/10 bg-slate-950/75">
        <CardHeader>
          <CardTitle className="text-white">Moon data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-3">
            <span className="text-slate-400">Phase</span>
            <span className="font-medium text-white">{moon.phaseName}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-3">
            <span className="text-slate-400">Illumination</span>
            <span className="font-medium text-white">{moon.illumination}%</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-slate-900/60 p-3">
            <span className="text-slate-400">Age</span>
            <span className="font-medium text-white">{moon.age} days</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}