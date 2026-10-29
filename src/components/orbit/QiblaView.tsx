import { lazy, Suspense, useEffect, useRef } from "react";
import { MapPin, Smartphone, X } from "lucide-react";

import { Panel } from "@/components/orbit/primitives";
import { QiblaGuide } from "@/components/orbit/QiblaGuide";
import { SkyWindow } from "@/components/orbit/SkyWindow";
import { useDeviceHeading } from "@/hooks/orbit/useDeviceHeading";
import { useNow } from "@/hooks/orbit/useNow";
import type { PrayedPlace } from "@/hooks/orbit/usePrayedPlaces";
import { vibrate } from "@/hooks/orbit/useStoredState";
import {
  bearingToCompassPoint,
  describeBearingFromCardinal,
  distanceToMakkahKm,
  qiblaDirection,
} from "@/lib/orbit/astronomy";
import { moonPosition, sunPosition } from "@/lib/orbit/celestial";
import { normalizeDegrees, shortestAngleDelta } from "@/lib/orbit/math";
import { magneticDeclination } from "@/lib/orbit/qiblaGuide";
import { cn } from "@/lib/utils";

const QiblaGlobe = lazy(() =>
  import("@/components/orbit/QiblaGlobe").then((module) => ({ default: module.QiblaGlobe }))
);

type QiblaViewProps = {
  latitude: number;
  longitude: number;
  timeZone: string;
  locationLabel: string;
  hour12: boolean;
  places: PrayedPlace[];
  onRemovePlace: (place: PrayedPlace) => void;
};

const TICKS = Array.from({ length: 72 }, (_, index) => index * 5);
const CARDINALS = [
  { label: "N", angle: 0 },
  { label: "E", angle: 90 },
  { label: "S", angle: 180 },
  { label: "W", angle: 270 },
];
const ALIGNED_DEGREES = 3;

/** A point on the dial for a true bearing, at a given radius (dial rotates with the phone). */
function dialPoint(bearing: number, radius: number) {
  const a = (bearing * Math.PI) / 180;
  return { x: 150 + radius * Math.sin(a), y: 150 - radius * Math.cos(a) };
}

export function QiblaView({
  latitude,
  longitude,
  timeZone,
  locationLabel,
  hour12,
  places,
  onRemovePlace,
}: QiblaViewProps) {
  const now = useNow(30000);
  const qibla = qiblaDirection(latitude, longitude);
  const distance = distanceToMakkahKm(latitude, longitude);
  const declination = magneticDeclination(latitude, longitude, now);
  const { heading: magneticHeading, permissionState, isSupported, requestPermission, source, accuracy } =
    useDeviceHeading(true);

  // Phone compasses point to magnetic north; the Qibla bearing is from true north.
  const heading = magneticHeading === null ? null : normalizeDegrees(magneticHeading + declination);
  const delta = heading === null ? null : shortestAngleDelta(heading, qibla);
  const aligned = delta !== null && Math.abs(delta) < ALIGNED_DEGREES;
  const wasAligned = useRef(false);

  useEffect(() => {
    if (aligned && !wasAligned.current) vibrate(30);
    wasAligned.current = aligned;
  }, [aligned]);

  const sun = sunPosition(now, latitude, longitude);
  const moon = moonPosition(now, latitude, longitude);
  const dialRotation = heading === null ? 0 : -heading;
  const needsPermission = isSupported && permissionState === "idle";
  const live = heading !== null;

  let instruction: string;
  if (!isSupported || permissionState === "unsupported") {
    instruction = `No compass here. Face ${describeBearingFromCardinal(qibla)}, or use the sky below.`;
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

  const sunMarker = sun.altitude > -1 ? dialPoint(sun.azimuth, 104) : null;
  const moonMarker = moon.altitude > 0 ? dialPoint(moon.azimuth, 104) : null;
  const declinationText = `${Math.abs(declination).toFixed(1)}° ${declination >= 0 ? "E" : "W"}`;

  return (
    <div className="orbit-fade grid grid-cols-1 gap-4">
      <header className="pt-1">
        <h1 className="text-[26px] leading-tight font-semibold tracking-tight">Qibla</h1>
        <p className="mt-0.5 text-sm text-o-muted">
          {locationLabel} · {distance.toLocaleString("en-GB")} km to Makkah
        </p>
      </header>

      <Panel className="flex flex-col items-center px-5 pt-6 pb-5">
        <div className="relative w-full max-w-[300px]">
          <svg viewBox="0 0 300 300" className="w-full" aria-hidden="true">
            {/* Fixed marker: where the top of the phone points. */}
            <path d="M150 6 L158 22 L142 22 Z" className={cn(aligned ? "fill-o-accent" : "fill-o-text")} />

            <g transform={`rotate(${dialRotation} 150 150)`}>
              <circle
                cx="150"
                cy="150"
                r="124"
                strokeWidth="3"
                className={cn("fill-o-surface-2 transition-colors", aligned ? "stroke-o-accent" : "stroke-transparent")}
              />
              {/* Acceptable band: within a few degrees of the Qibla. */}
              <path
                d={(() => {
                  const a = dialPoint(qibla - ALIGNED_DEGREES * 2, 124);
                  const b = dialPoint(qibla + ALIGNED_DEGREES * 2, 124);
                  return `M150 150 L${a.x} ${a.y} A124 124 0 0 1 ${b.x} ${b.y} Z`;
                })()}
                className="fill-o-accent-soft"
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
                  className={cn("text-[15px] font-semibold", label === "N" ? "fill-o-text" : "fill-o-faint")}
                >
                  {label}
                </text>
              ))}

              {/* The real sun and moon, so the dial can be checked against the sky. */}
              {sunMarker ? (
                <g>
                  <circle cx={sunMarker.x} cy={sunMarker.y} r="12" fill="#f6d38a" fillOpacity="0.3" />
                  <circle cx={sunMarker.x} cy={sunMarker.y} r="6.5" fill="#f6b73c" />
                </g>
              ) : null}
              {moonMarker ? (
                <g>
                  <circle cx={moonMarker.x} cy={moonMarker.y} r="10" fill="#c7d2fe" fillOpacity="0.25" />
                  <circle cx={moonMarker.x} cy={moonMarker.y} r="5.5" fill="#e0e7ff" />
                </g>
              ) : null}

              <g transform={`rotate(${qibla} 150 150)`}>
                <line x1="150" y1="150" x2="150" y2="86" className="stroke-o-accent" strokeWidth="4" strokeLinecap="round" />
                <rect x="139" y="68" width="22" height="22" rx="3" className="fill-o-text" />
                <rect x="139" y="74" width="22" height="3" className="fill-o-accent" />
              </g>
            </g>

            <circle cx="150" cy="150" r="7" className="fill-o-accent" />
            <circle cx="150" cy="150" r="3" className="fill-o-surface" />
          </svg>
        </div>

        <div className="mt-4 text-center">
          <div className="text-3xl font-semibold tracking-tight tabular-nums">
            {qibla.toFixed(1)}° <span className="text-o-muted">{bearingToCompassPoint(qibla)}</span>
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
          <p className="mt-2 text-xs text-o-faint">
            From true north · {describeBearingFromCardinal(qibla)}
            {live ? ` · magnetic correction ${declinationText} applied` : ""}
          </p>
          {live && (sunMarker || moonMarker) ? (
            <p className="mt-1 text-xs text-o-faint">
              Check it: the {sunMarker ? "sun" : "moon"} on the dial should point at the real{" "}
              {sunMarker ? "sun" : "moon"}.
            </p>
          ) : null}
          {source === "ios-compass" && accuracy !== null && accuracy > 15 ? (
            <p className="mt-1 text-xs text-o-danger">
              Low accuracy (±{Math.round(accuracy)}°). Move your phone in a figure-eight, away from metal.
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

      <div>
        <div className="px-1 pb-2 text-xs font-medium tracking-[0.12em] text-o-faint uppercase">
          Sky window
        </div>
        <SkyWindow
          latitude={latitude}
          longitude={longitude}
          timeZone={timeZone}
          hour12={hour12}
          qibla={qibla}
          distanceKm={distance}
        />
      </div>

      <QiblaGuide
        now={now}
        qibla={qibla}
        latitude={latitude}
        longitude={longitude}
        timeZone={timeZone}
        hour12={hour12}
      />

      <Suspense fallback={<div className="h-[420px] rounded-[28px] bg-o-surface-2" />}>
        <QiblaGlobe latitude={latitude} longitude={longitude} locationLabel={locationLabel} places={places} />
      </Suspense>

      <div>
        <div className="flex items-baseline justify-between px-1 pb-2">
          <span className="text-xs font-medium tracking-[0.12em] text-o-faint uppercase">Places you've prayed</span>
          {places.length > 0 ? (
            <span className="text-xs text-o-faint tabular-nums">
              {places.length} {places.length === 1 ? "place" : "places"} ·{" "}
              {(() => {
                const total = places.reduce((sum, place) => sum + place.prayers, 0);
                return `${total} ${total === 1 ? "prayer" : "prayers"}`;
              })()}
            </span>
          ) : null}
        </div>
        <Panel className="overflow-hidden">
          {places.length === 0 ? (
            <p className="px-4 py-4 text-sm text-o-muted">
              Each time you mark a prayer as prayed, the place is saved here and appears as a dot on the
              globe: a diary of where you have faced the Kaaba from.
            </p>
          ) : (
            <ul className="divide-y divide-o-line">
              {places.map((place) => (
                <li key={place.firstAt} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-o-accent-soft text-o-accent">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{place.label}</span>
                    <span className="block text-xs text-o-faint tabular-nums">
                      Qibla {place.qibla.toFixed(1)}° {bearingToCompassPoint(place.qibla)} ·{" "}
                      {place.distanceKm.toLocaleString("en-GB")} km · {place.prayers}{" "}
                      {place.prayers === 1 ? "prayer" : "prayers"}
                    </span>
                    <span className="block text-[11px] text-o-faint">
                      {new Date(place.firstAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {place.firstAt.slice(0, 10) !== place.lastAt.slice(0, 10)
                        ? ` – ${new Date(place.lastAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemovePlace(place)}
                    aria-label={`Remove ${place.label}`}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-o-faint transition hover:bg-o-surface-2 hover:text-o-text"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
