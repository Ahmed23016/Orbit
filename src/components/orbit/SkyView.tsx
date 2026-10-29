import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

import { MoonGlyph } from "@/components/orbit/MoonGlyph";
import { SkyWindow } from "@/components/orbit/SkyWindow";
import { Panel, SectionLabel } from "@/components/orbit/primitives";
import { useNow } from "@/hooks/orbit/useNow";
import { bearingToCompassPoint, distanceToMakkahKm, qiblaDirection } from "@/lib/orbit/astronomy";
import { moonPosition, sunPosition } from "@/lib/orbit/celestial";
import { type PrayerCalculator } from "@/lib/orbit/schedule";
import { getCrescentWatch, type SightingVerdict } from "@/lib/orbit/sighting";
import { formatClock, formatDay, getDateInTimeZone } from "@/lib/orbit/time";
import type { MadhabKey } from "@/lib/orbit/types";
import { cn } from "@/lib/utils";

type SkyViewProps = {
  onClose: () => void;
  calc: PrayerCalculator;
  latitude: number;
  longitude: number;
  timeZone: string;
  locationLabel: string;
  hour12: boolean;
  madhab: MadhabKey;
  methodLabel: string;
  fajrAngle: number;
  ishaAngle: number;
  ishaInterval: number;
};

function twilightStage(altitude: number) {
  if (altitude > -0.833) return { name: "Daytime", hint: "The sun is above the horizon." };
  if (altitude > -6) return { name: "Civil twilight", hint: "Bright sky; the brightest stars appear." };
  if (altitude > -12) return { name: "Nautical twilight", hint: "The horizon fades; the sky darkens to blue." };
  if (altitude > -18) return { name: "Astronomical twilight", hint: "Almost dark; the faintest glow remains." };
  return { name: "Night", hint: "The sky is fully dark." };
}

const VERDICT_STYLES: Record<SightingVerdict, string> = {
  easy: "bg-o-accent text-o-on-accent",
  likely: "bg-o-accent-soft text-o-accent",
  optics: "bg-o-surface-2 text-o-text",
  unlikely: "bg-o-surface-2 text-o-muted",
  impossible: "bg-o-surface-2 text-o-faint",
};

export function SkyView({
  onClose,
  calc,
  latitude,
  longitude,
  timeZone,
  locationLabel,
  hour12,
  madhab,
  methodLabel,
  fajrAngle,
  ishaAngle,
  ishaInterval,
}: SkyViewProps) {
  const now = useNow(15000);
  const clock = (date: Date) => formatClock(date, timeZone, hour12);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const sun = sunPosition(now, latitude, longitude);
  const moon = moonPosition(now, latitude, longitude);
  const qibla = qiblaDirection(latitude, longitude);
  const today = getDateInTimeZone(now, timeZone);
  const times = calc(today);
  const stage = twilightStage(sun.altitude);

  // Recompute every ten minutes at most.
  const tenMinutes = Math.floor(now.getTime() / 600000);
  const watch = useMemo(
    () => getCrescentWatch(new Date(tenMinutes * 600000), calc, latitude, longitude, timeZone),
    [tenMinutes, calc, latitude, longitude, timeZone]
  );

  // Shadow ratio (shadow length ÷ object height) now, at noon, and when Asr begins.
  const noonAltitude = sunPosition(times.dhuhr, latitude, longitude).altitude;
  const noonShadow = 1 / Math.tan((noonAltitude * Math.PI) / 180);
  const asrShadow = noonShadow + (madhab === "hanafi" ? 2 : 1);
  const shadowNow = sun.altitude > 1 ? 1 / Math.tan((sun.altitude * Math.PI) / 180) : null;

  // Depression gauge from +20° to -24°.
  const gaugeTop = 20;
  const gaugeBottom = -24;
  const gaugeY = (altitude: number) =>
    ((gaugeTop - Math.min(gaugeTop, Math.max(gaugeBottom, altitude))) / (gaugeTop - gaugeBottom)) * 100;
  const markers = [
    { label: "Sunrise · Maghrib", altitude: -0.833 },
    { label: `Fajr · ${fajrAngle}°`, altitude: -fajrAngle },
    ...(ishaInterval > 0 ? [] : [{ label: `Isha · ${ishaAngle}°`, altitude: -ishaAngle }]),
  ];

  // Illumination → phase in [0, 1): waxing in the first half of the cycle.
  const halfCycle = Math.acos(1 - 2 * moon.illumination) / (2 * Math.PI);
  const moonPhase = moon.waxing ? halfCycle : 1 - halfCycle;


  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The sky now"
      className="orbit-fade fixed inset-0 z-50 overflow-y-auto bg-o-bg"
    >
      <div className="orbit-main mx-auto grid w-full max-w-xl grid-cols-1 gap-4 !pb-10">
        <header className="flex items-start justify-between gap-3 pt-1">
          <div>
            <h1 className="text-[26px] leading-tight font-semibold tracking-tight">The sky now</h1>
            <p className="mt-0.5 text-sm text-o-muted">
              {locationLabel} · {clock(now)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-o-line bg-o-surface text-o-muted transition active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <SkyWindow
          latitude={latitude}
          longitude={longitude}
          timeZone={timeZone}
          hour12={hour12}
          qibla={qibla}
          distanceKm={distanceToMakkahKm(latitude, longitude)}
        />

        <div>
          <SectionLabel>Twilight</SectionLabel>
          <Panel className="flex gap-4 p-4">
            <div className="relative w-14 shrink-0 overflow-hidden rounded-2xl" style={{ height: 220 }}>
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, #79b6e6 0%, #3f86cf ${gaugeY(0) - 4}%, #d98a7a ${gaugeY(0)}%, #5b4b85 ${gaugeY(-6)}%, #1f2a55 ${gaugeY(-12)}%, #0c1330 ${gaugeY(-18)}%, #05070f 100%)`,
                }}
              />
              {markers.map((marker) => (
                <div
                  key={marker.label}
                  className="absolute inset-x-0 h-px bg-white/50"
                  style={{ top: `${gaugeY(marker.altitude)}%` }}
                />
              ))}
              <div
                className="absolute inset-x-0 flex -translate-y-1/2 justify-center transition-[top] duration-700"
                style={{ top: `${gaugeY(sun.altitude)}%` }}
              >
                <span className="h-4 w-4 rounded-full border-2 border-white bg-[#fff4cf] shadow-[0_0_12px_rgba(255,244,207,0.9)]" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold">{stage.name}</div>
              <div className="mt-0.5 text-sm text-o-muted">{stage.hint}</div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">
                {sun.altitude >= 0
                  ? `${sun.altitude.toFixed(1)}° up`
                  : `${Math.abs(sun.altitude).toFixed(1)}° below`}
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-o-muted">
                <li>
                  <span className="font-medium text-o-text">Fajr</span> begins when the sun is {fajrAngle}°
                  below the horizon before sunrise.
                </li>
                <li>
                  <span className="font-medium text-o-text">Isha</span>{" "}
                  {ishaInterval > 0
                    ? `begins ${ishaInterval} minutes after Maghrib.`
                    : `begins when the sun is ${ishaAngle}° below after sunset.`}
                </li>
                <li className="text-o-faint">Angles from {methodLabel}.</li>
              </ul>
            </div>
          </Panel>
        </div>

        <div>
          <SectionLabel>Shadow & Asr</SectionLabel>
          <Panel className="p-4">
            {shadowNow !== null ? (
              <>
                <div className="flex items-end gap-3">
                  <svg viewBox="0 0 220 60" className="w-full" aria-hidden="true">
                    <line x1="10" x2="210" y1="52" y2="52" className="stroke-o-line" strokeWidth="2" />
                    <line x1="20" x2="20" y1="52" y2="22" className="stroke-o-text" strokeWidth="4" strokeLinecap="round" />
                    {(() => {
                      const scale = 180 / Math.max(asrShadow + 0.5, Math.min(shadowNow, 6) + 0.2, 1);
                      const shadowEnd = 20 + Math.min(shadowNow, 6) * scale;
                      const asrX = 20 + asrShadow * scale;
                      return (
                        <>
                          <line x1="20" x2={Math.min(210, shadowEnd)} y1="52" y2="52" className="stroke-o-accent" strokeWidth="6" strokeLinecap="round" />
                          <line x1={asrX} x2={asrX} y1="40" y2="58" className="stroke-o-danger" strokeWidth="1.5" strokeDasharray="3 2" />
                          <text x={asrX} y="34" textAnchor="middle" fontSize="9" className="fill-o-danger">
                            Asr
                          </text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <p className="mt-2 text-sm text-o-muted">
                  A stick's shadow is now{" "}
                  <span className="font-semibold text-o-text tabular-nums">{shadowNow.toFixed(2)}×</span> its
                  height. Asr begins at{" "}
                  <span className="font-semibold text-o-text tabular-nums">{asrShadow.toFixed(2)}×</span> (
                  {madhab === "hanafi" ? "twice" : "once"} its height plus the noon shadow of{" "}
                  {noonShadow.toFixed(2)}×), at {clock(times.asr)}.
                </p>
              </>
            ) : (
              <p className="text-sm text-o-muted">
                The sun is down, so there are no shadows. Asr began at {clock(times.asr)}, when a stick's
                shadow reached {asrShadow.toFixed(2)}× its height.
              </p>
            )}
          </Panel>
        </div>

        <div>
          <SectionLabel>Moon & crescent watch</SectionLabel>
          <Panel className="overflow-hidden">
            <div className="flex items-center gap-4 p-4">
              <MoonGlyph phase={moonPhase} size={56} />
              <div>
                <div className="text-[15px] font-semibold">
                  {Math.round(moon.illumination * 100)}% lit · {moon.waxing ? "waxing" : "waning"}
                </div>
                <div className="mt-0.5 text-sm text-o-muted">
                  {moon.altitude > 0
                    ? `Above the horizon, ${moon.altitude.toFixed(0)}° up in the ${bearingToCompassPoint(moon.azimuth)}.`
                    : "Below the horizon right now."}
                </div>
              </div>
            </div>

            <div className="border-t border-o-line px-4 pt-3 pb-1 text-xs text-o-faint">
              New moon {formatDay(watch.conjunction, { weekday: "short", day: "numeric", month: "short" })} at{" "}
              {clock(watch.conjunction)}. Look low in the west just after Maghrib.
            </div>
            <ul className="divide-y divide-o-line">
              {watch.evenings.map(({ day, sunset, forecast }) => (
                <li key={day.getTime()} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">
                      {formatDay(day, { weekday: "long", day: "numeric", month: "short" })}
                    </div>
                    <div className="mt-0.5 text-xs text-o-faint tabular-nums">
                      Sunset {clock(sunset)}
                      {forecast.ageHours > 0 && forecast.ageHours < 72
                        ? ` · moon ${Math.round(forecast.ageHours)}h old`
                        : ""}
                      {forecast.lagMinutes > 0 ? ` · sets ${forecast.lagMinutes} min later` : ""}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                      VERDICT_STYLES[forecast.verdict]
                    )}
                  >
                    {forecast.title}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t border-o-line px-4 py-3 text-[11px] text-o-faint">
              Estimates use the Odeh visibility criterion. Follow your local moon-sighting committee for
              the start of the month.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
