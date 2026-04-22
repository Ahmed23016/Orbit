import { memo } from "react";

import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock3, MapPin, Orbit, Radar } from "lucide-react";
import { useNow } from "@/hooks/orbit/useNow";
import { cn } from "@/lib/utils";

import {
  formatCoordinate,
  formatDate,
  formatTime,
  formatTimeZoneLabel,
} from "@/lib/orbit/time";

type OrbitHeroProps = {
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  compact?: boolean;
};

function OrbitHeroInner({
  label,
  latitude,
  longitude,
  timeZone,
  compact = false,
}: OrbitHeroProps) {
  const now = useNow(60000);

  if (compact) {
    return (
      <div className="orbit-hero orbit-hero--compact relative overflow-hidden rounded-[24px] p-4">
        <div className="relative">
          <div className="text-xs font-medium tracking-[0.24em] text-slate-500">ORBIT</div>

          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <div className="text-4xl font-semibold tracking-tight text-white">
                {formatTime(now, timeZone)}
              </div>
              <div className="mt-1 text-sm text-slate-400">{formatDate(now, timeZone)}</div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium text-white">{label}</div>
              <div className="mt-1 text-xs text-slate-500">{formatTimeZoneLabel(timeZone)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orbit-hero relative overflow-hidden rounded-[24px] p-4 md:rounded-[32px] md:p-6">
      <div className="orbit-hero__orb absolute -right-10 top-0 h-44 w-44 rounded-full bg-amber-300/20 blur-3xl" />
      <div className="orbit-hero__orb absolute left-10 top-20 h-32 w-32 rounded-full bg-cyan-300/15 blur-3xl" />

      <div className="relative space-y-4 md:space-y-5">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.45em] text-cyan-200/80">
          <Radar className="h-4 w-4" />
          Orbital prayer intelligence
        </div>

        <div className="grid gap-4 md:grid-cols-[1.3fr_0.8fr] md:items-end md:gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-6xl">
              Orbit
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 md:mt-3 md:text-base">
              Prayer times for your location.
            </p>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-white/10 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-amber-100/75">
              <Orbit className="h-4 w-4" />
              Live mode
            </div>
            <div className="text-2xl font-semibold text-white md:text-3xl">{formatTime(now, timeZone)}</div>
            <div className="text-sm text-slate-400">{formatDate(now, timeZone)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            className={cn(
              "rounded-full border border-white/12 bg-slate-950/45 px-3 py-1 text-cyan-100 hover:bg-slate-950/45"
            )}
          >
            <MapPin className="mr-1 h-3.5 w-3.5" />
            {label}
          </Badge>

          <Badge className="rounded-full border border-white/12 bg-slate-950/45 px-3 py-1 text-cyan-100 hover:bg-slate-950/45">
            {formatCoordinate(latitude, "lat")} / {formatCoordinate(longitude, "lng")}
          </Badge>

          <Badge className="rounded-full border border-white/12 bg-slate-950/45 px-3 py-1 text-cyan-100 hover:bg-slate-950/45">
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            {formatTimeZoneLabel(timeZone)}
          </Badge>

          <Badge className="rounded-full border border-white/12 bg-slate-950/45 px-3 py-1 text-cyan-100 hover:bg-slate-950/45">
            <Clock3 className="mr-1 h-3.5 w-3.5" />
            Now {formatTime(now, timeZone)}
          </Badge>
        </div>
      </div>
    </div>
  );
}

export const OrbitHero = memo(OrbitHeroInner);
