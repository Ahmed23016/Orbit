import { useEffect, useRef } from "react";
import { Smartphone, SunMedium } from "lucide-react";

import { Panel } from "@/components/orbit/primitives";
import { useDeviceHeading } from "@/hooks/orbit/useDeviceHeading";
import { useNow } from "@/hooks/orbit/useNow";
import {
  bearingToCompassPoint,
  describeBearingFromCardinal,
  distanceToMakkahKm,
  qiblaDirection,
  relativeDirectionLabel,
  solarAltitude,
  solarAzimuth,
} from "@/lib/orbit/astronomy";
import { normalizeDegrees, shortestAngleDelta } from "@/lib/orbit/math";
import {
  getDateInTimeZone,
  getTimeZoneOffsetMinutes,
  minutesSinceMidnight,
} from "@/lib/orbit/time";
import { cn } from "@/lib/utils";

type QiblaViewProps = {
  latitude: number;
  longitude: number;
  timeZone: string;
  locationLabel: string;
};

const TICKS = Array.from({ length: 72 }, (_, index) => index * 5);
const CARDINALS = [
  { label: "N", angle: 0 },
  { label: "E", angle: 90 },
  { label: "S", angle: 180 },
  { label: "W", angle: 270 },
];

export function QiblaView({ latitude, longitude, timeZone, locationLabel }: QiblaViewProps) {
  const qibla = qiblaDirection(latitude, longitude);
  const distance = distanceToMakkahKm(latitude, longitude);
  const { heading, permissionState, isSupported, requestPermission, source, accuracy } =
    useDeviceHeading(true);
  const now = useNow(60000);

  const delta = heading === null ? null : shortestAngleDelta(heading, qibla);
  const aligned = delta !== null && Math.abs(delta) < 4;
  const wasAligned = useRef(false);

  useEffect(() => {
    if (aligned && !wasAligned.current && typeof navigator !== "undefined") {
      navigator.vibrate?.(30);
    }
    wasAligned.current = aligned;
  }, [aligned]);

  const liveDay = getDateInTimeZone(now, timeZone);
  const minuteOfDay = minutesSinceMidnight(now, timeZone);
  const offsetMinutes = getTimeZoneOffsetMinutes(now, timeZone);
  const sunAltitude = solarAltitude(liveDay, latitude, longitude, minuteOfDay, offsetMinutes);
  const sunAzimuth = solarAzimuth(liveDay, latitude, longitude, minuteOfDay, offsetMinutes);
  const sunCue = relativeDirectionLabel(shortestAngleDelta(qibla, sunAzimuth)).replace("-", " ");
  const shadowCue = relativeDirectionLabel(
    shortestAngleDelta(qibla, normalizeDegrees(sunAzimuth + 180))
  ).replace("-", " ");

  const dialRotation = heading === null ? 0 : -heading;
  const needsPermission = isSupported && permissionState === "idle";

  let instruction: string;
  if (!isSupported || permissionState === "unsupported") {
    instruction = `Face ${describeBearingFromCardinal(qibla)}.`;
  } else if (permissionState === "denied") {
    instruction = "Motion access was denied. Enable it in your settings to use the live compass.";
  } else if (needsPermission) {
    instruction = "Enable the compass to point your phone toward the Qibla.";
  } else if (delta === null) {
    instruction = `Hold your phone flat. No reading? Face ${describeBearingFromCardinal(qibla)}.`;
  } else if (aligned) {
    instruction = "You are facing the Qibla.";
  } else {
    instruction = `Turn ${Math.round(Math.abs(delta))}° ${delta > 0 ? "right" : "left"}`;
  }

  return (
    <div className="orbit-fade grid grid-cols-1 gap-4">
      <header className="pt-1">
        <h1 className="text-[22px] leading-tight font-semibold tracking-tight">Qibla</h1>
        <p className="mt-0.5 text-sm text-o-muted">
          {locationLabel} · {distance.toLocaleString("en-GB")} km to Makkah
        </p>
      </header>

      <Panel className="flex flex-col items-center px-5 pt-6 pb-5">
        <div className="relative w-full max-w-[300px]">
          <svg viewBox="0 0 300 300" className="w-full" aria-hidden="true">
            {/* Fixed marker showing where the top of the phone points. */}
            <path
              d="M150 6 L158 22 L142 22 Z"
              className={cn(aligned ? "fill-o-accent" : "fill-o-text")}
            />

            <g transform={`rotate(${dialRotation} 150 150)`}>
              <circle
                cx="150"
                cy="150"
                r="124"
                strokeWidth="3"
                className={cn("fill-o-surface-2 transition-colors", aligned ? "stroke-o-accent" : "stroke-transparent")}
              />
              {TICKS.map((angle) => (
                <line
                  key={angle}
                  x1="150"
                  y1={angle % 30 === 0 ? 32 : 36}
                  x2="150"
                  y2="42"
                  transform={`rotate(${angle} 150 150)`}
                  className={angle % 30 === 0 ? "stroke-o-muted" : "stroke-o-faint"}
                  strokeWidth={angle % 30 === 0 ? 2 : 1}
                  strokeLinecap="round"
                />
              ))}
              {CARDINALS.map(({ label, angle }) => (
                <text
                  key={label}
                  x="150"
                  y="64"
                  transform={`rotate(${angle} 150 150)`}
                  textAnchor="middle"
                  className={cn(
                    "text-[15px] font-semibold",
                    label === "N" ? "fill-o-text" : "fill-o-faint"
                  )}
                >
                  {label}
                </text>
              ))}

              <g transform={`rotate(${qibla} 150 150)`}>
                <line
                  x1="150"
                  y1="150"
                  x2="150"
                  y2="86"
                  className="stroke-o-accent"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <rect
                  x="139"
                  y="68"
                  width="22"
                  height="22"
                  rx="3"
                  className="fill-o-text"
                />
                <rect x="139" y="74" width="22" height="3" className="fill-o-accent" />
              </g>
            </g>

            <circle cx="150" cy="150" r="7" className="fill-o-accent" />
            <circle cx="150" cy="150" r="3" className="fill-o-surface" />
          </svg>
        </div>

        <div className="mt-4 text-center">
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            {qibla}° <span className="text-o-muted">{bearingToCompassPoint(qibla)}</span>
          </div>
          <p
            className={cn(
              "mt-1.5 text-sm",
              aligned ? "font-medium text-o-accent" : "text-o-muted",
              permissionState === "denied" && "text-o-danger"
            )}
            aria-live="polite"
          >
            {instruction}
          </p>
          {source === "ios-compass" && accuracy !== null && accuracy > 20 ? (
            <p className="mt-1 text-xs text-o-faint">
              Low accuracy (±{Math.round(accuracy)}°). Move your phone in a figure-eight.
            </p>
          ) : null}
        </div>

        {needsPermission ? (
          <button
            type="button"
            onClick={() => void requestPermission()}
            className="mt-4 flex h-11 items-center gap-2 rounded-xl bg-o-accent px-5 text-sm font-medium text-o-on-accent transition active:scale-[0.98]"
          >
            <Smartphone className="h-4 w-4" />
            Enable compass
          </button>
        ) : null}
      </Panel>

      {sunAltitude > 4 ? (
        <Panel className="flex gap-3 p-4">
          <SunMedium className="mt-0.5 h-5 w-5 shrink-0 text-o-accent" />
          <p className="text-sm text-o-muted">
            No compass? The sun is {bearingToCompassPoint(sunAzimuth)} right now. Facing the Qibla,
            it should be <span className="text-o-text">{sunCue}</span> and your shadow{" "}
            <span className="text-o-text">{shadowCue}</span>.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
