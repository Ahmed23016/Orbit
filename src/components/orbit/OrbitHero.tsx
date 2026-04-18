import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock3, MapPin, Radar } from "lucide-react";
import { formatTime } from "@/lib/orbit/time";

type OrbitHeroProps = {
  label: string;
  latitude: number;
  longitude: number;
  now: Date;
};

export function OrbitHero({
  label,
  latitude,
  longitude,
  now,
}: OrbitHeroProps) {
  return (
    <div className="rounded-[28px] border border-cyan-500/10 bg-cyan-400/5 p-4 shadow-[0_0_0_1px_rgba(6,182,212,0.04),0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl md:p-5">
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.45em] text-cyan-300/80">
          <Radar className="h-4 w-4" />
          Orbital prayer intelligence
        </div>

        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Orbit
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
            Gebedstijden, qibla en dagelijkse overzicht op één plek.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
            <MapPin className="mr-1 h-3.5 w-3.5" />
            {label}
          </Badge>

          <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Badge>

          <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            {now.toLocaleDateString()}
          </Badge>

          <Badge className="rounded-full border border-cyan-500/20 bg-slate-950/50 px-3 py-1 text-cyan-100 hover:bg-slate-950/50">
            <Clock3 className="mr-1 h-3.5 w-3.5" />
            Now {formatTime(now)}
          </Badge>
        </div>
      </div>
    </div>
  );
}