import { useState } from "react";

import { Panel } from "@/components/orbit/primitives";
import { TurnDiagram, type Landmark } from "@/components/orbit/TurnDiagram";
import { bearingToCompassPoint } from "@/lib/orbit/astronomy";
import { moonPosition, sunPosition } from "@/lib/orbit/celestial";
import { normalizeDegrees, shortestAngleDelta } from "@/lib/orbit/math";
import { turnFraction } from "@/lib/orbit/qiblaGuide";
import { formatClock } from "@/lib/orbit/time";
import { cn } from "@/lib/utils";

type QiblaGuideProps = {
  now: Date;
  qibla: number;
  latitude: number;
  longitude: number;
  timeZone: string;
  hour12: boolean;
};

type Option = {
  key: Landmark;
  label: string;
  available: boolean;
  /** Why it can't be used right now. */
  unavailable: string;
  bearing: number;
  face: string;
  detail: string;
};

/** The clock position of the Qibla when you face a landmark (12 = straight ahead). */
function clockFrom(landmarkBearing: number, qibla: number) {
  const hour = Math.round(normalizeDegrees(qibla - landmarkBearing) / 30) % 12;
  return hour === 0 ? 12 : hour;
}

export function QiblaGuide({ now, qibla, latitude, longitude, timeZone, hour12 }: QiblaGuideProps) {
  const sun = sunPosition(now, latitude, longitude);
  const moon = moonPosition(now, latitude, longitude);
  const northern = latitude >= 0;
  const shadowBearing = normalizeDegrees(sun.azimuth + 180);

  const options: Option[] = [
    {
      key: "sun",
      label: "Sun",
      available: sun.altitude > 1,
      unavailable: "Sun is down",
      bearing: sun.azimuth,
      face: "Face the sun",
      detail: `It is ${Math.round(sun.altitude)}° above the horizon in the ${bearingToCompassPoint(sun.azimuth)} (${Math.round(sun.azimuth)}°). Don't look straight at it — just face its direction.`,
    },
    {
      key: "shadow",
      label: "Shadow",
      available: sun.altitude > 3 && sun.altitude < 70,
      unavailable: sun.altitude >= 70 ? "Sun too high" : "No shadows",
      bearing: shadowBearing,
      face: "Put the sun at your back and face along your shadow",
      detail: `Your shadow points ${bearingToCompassPoint(shadowBearing)} (${Math.round(shadowBearing)}°). A low sun gives a long, precise shadow.`,
    },
    {
      key: "moon",
      label: "Moon",
      available: moon.altitude > 1,
      unavailable: "Moon is down",
      bearing: moon.azimuth,
      face: "Face the moon",
      detail: `It is ${Math.round(moon.illumination * 100)}% lit, ${Math.round(moon.altitude)}° above the horizon in the ${bearingToCompassPoint(moon.azimuth)} (${Math.round(moon.azimuth)}°).`,
    },
    {
      key: "star",
      label: northern ? "Pole star" : "S. Cross",
      available: sun.altitude < -6,
      unavailable: "After dark",
      bearing: northern ? 0 : 180,
      face: northern ? "Face Polaris, the North Star" : "Face due south using the Southern Cross",
      detail: northern
        ? `Follow the two end stars of the Big Dipper's bowl upward about five times their gap. Polaris sits ${Math.max(0, Math.round(latitude))}° up and marks true north.${latitude < 10 ? " This close to the equator it is very low." : ""}`
        : "Extend the long bar of the Southern Cross about 4½ times its length; straight below that point is due south.",
    },
  ];

  const firstAvailable = options.find((option) => option.available)?.key ?? "star";
  const [choice, setChoice] = useState<Landmark | null>(null);
  const selectedKey =
    choice && options.find((option) => option.key === choice)?.available ? choice : firstAvailable;
  const selected = options.find((option) => option.key === selectedKey) ?? options[3];

  const turn = shortestAngleDelta(selected.bearing, qibla);
  const abs = Math.round(Math.abs(turn));
  const side = turn > 0 ? "right" : "left";
  const moves = selected.key !== "star";

  return (
    <Panel className="p-4">
      <div className="px-1">
        <div className="text-xs font-medium tracking-[0.12em] text-o-faint uppercase">Find it from the sky</div>
        <p className="mt-1 text-sm text-o-muted">No compass? Pick what you can see, face it, then turn.</p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="What can you see?">
        {options.map((option) => {
          const active = option.key === selectedKey;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!option.available}
              onClick={() => setChoice(option.key)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 py-2 text-center transition",
                active
                  ? "bg-o-accent text-o-on-accent"
                  : option.available
                    ? "bg-o-surface-2 text-o-text active:scale-95"
                    : "bg-o-surface-2/50 text-o-faint"
              )}
            >
              <span className="text-[13px] leading-tight font-semibold">{option.label}</span>
              {!option.available ? (
                <span className="mt-0.5 text-[10px] leading-tight">{option.unavailable}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="orbit-fade mt-4" key={selected.key}>
        <TurnDiagram landmark={selected.key} landmarkBearing={selected.bearing} qibla={qibla} />

        <ol className="mt-4 grid gap-2">
          <li className="flex gap-3 rounded-2xl bg-o-surface-2 px-4 py-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-o-text text-xs font-bold text-o-bg">
              1
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{selected.face}.</span>
              <span className="mt-0.5 block text-sm text-o-muted">{selected.detail}</span>
            </span>
          </li>
          <li className="flex gap-3 rounded-2xl bg-o-accent-soft px-4 py-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-o-accent text-xs font-bold text-o-on-accent">
              2
            </span>
            <span className="min-w-0">
              {abs < 3 ? (
                <span className="block text-[15px] font-semibold">That's the Qibla — no need to turn.</span>
              ) : (
                <>
                  <span className="block text-[15px] font-semibold">
                    Turn {abs}° to your {side}
                  </span>
                  <span className="mt-0.5 block text-sm text-o-muted">
                    That's {turnFraction(abs)}. On a clock face, the Qibla is at{" "}
                    <span className="font-semibold text-o-text">{clockFrom(selected.bearing, qibla)} o'clock</span>.
                  </span>
                </>
              )}
            </span>
          </li>
        </ol>

        <p className="mt-3 px-1 text-xs text-o-faint">
          {moves
            ? `Worked out for your location at ${formatClock(now, timeZone, hour12)}. The ${
                selected.key === "moon" ? "moon" : "sun"
              } moves about 1° every 4 minutes; this updates as it does.`
            : "The pole stays put all night, so this works at any hour."}
        </p>
      </div>
    </Panel>
  );
}
