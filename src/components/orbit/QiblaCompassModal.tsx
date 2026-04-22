import { Compass, LoaderCircle, Navigation, Smartphone, SunMedium, X } from "lucide-react";

import { useDeviceHeading } from "@/hooks/orbit/useDeviceHeading";
import { useNow } from "@/hooks/orbit/useNow";
import {
  bearingToCompassPoint,
  describeBearingFromCardinal,
  relativeDirectionLabel,
  solarAltitude,
  solarAzimuth,
} from "@/lib/orbit/astronomy";
import { normalizeDegrees, shortestAngleDelta } from "@/lib/orbit/math";
import { getDateInTimeZone, getTimeZoneOffsetMinutes, minutesSinceMidnight } from "@/lib/orbit/time";

type MoonData = {
  illumination: number;
  phaseName: string;
};

type QiblaCompassModalProps = {
  open: boolean;
  onClose: () => void;
  qibla: number;
  latitude: number;
  longitude: number;
  timeZone: string;
  moon: MoonData;
  compact?: boolean;
};

function turnInstruction(delta: number) {
  const rounded = Math.round(Math.abs(delta));

  if (rounded < 4) {
    return "You are aligned.";
  }

  return `Turn ${rounded} deg ${delta > 0 ? "right" : "left"}.`;
}

function relativeCue(delta: number) {
  const label = relativeDirectionLabel(delta);

  if (label === "straight ahead") {
    return "straight ahead";
  }

  if (label === "behind you") {
    return "behind you";
  }

  return label.replace("-", " ");
}

export function QiblaCompassModal({
  open,
  onClose,
  qibla,
  latitude,
  longitude,
  timeZone,
  moon,
  compact = false,
}: QiblaCompassModalProps) {
  const { heading, source, accuracy, permissionState, isSupported, requestPermission } =
    useDeviceHeading(open);
  const now = useNow(60000);

  if (!open) {
    return null;
  }

  const liveDay = getDateInTimeZone(now, timeZone);
  const minuteOfDay = minutesSinceMidnight(now, timeZone);
  const offsetMinutes = getTimeZoneOffsetMinutes(now, timeZone);
  const sunAltitudeNow = solarAltitude(
    liveDay,
    latitude,
    longitude,
    minuteOfDay,
    offsetMinutes
  );
  const sunAzimuthNow = solarAzimuth(
    liveDay,
    latitude,
    longitude,
    minuteOfDay,
    offsetMinutes
  );
  const shadowAzimuth = normalizeDegrees(sunAzimuthNow + 180);
  const turnDelta = heading === null ? null : shortestAngleDelta(heading, qibla);
  const qiblaPoint = bearingToCompassPoint(qibla);
  const headingPoint = heading === null ? null : bearingToCompassPoint(heading);
  const qiblaRelativeToSun = relativeCue(shortestAngleDelta(sunAzimuthNow, qibla));
  const sunRelativeToQibla = relativeCue(shortestAngleDelta(qibla, sunAzimuthNow));
  const shadowRelativeToQibla = relativeCue(shortestAngleDelta(qibla, shadowAzimuth));
  const northTurn = shortestAngleDelta(0, qibla);
  const southTurn = shortestAngleDelta(180, qibla);
  const liveSupported = isSupported && permissionState !== "unsupported";

  return (
    <div className="orbit-modal-scrim fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-slate-950/95 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-white">
              {compact ? "Qibla" : "Qibla compass"}
            </div>
            <div className="mt-1 text-sm text-slate-400">
              Qibla is {qibla} deg from true north toward Makkah.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Qibla</div>
            <div className="mt-2 text-xl font-semibold text-white">{qiblaPoint}</div>
            <div className="mt-1 text-sm text-slate-500">{qibla} deg</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Facing</div>
            <div className="mt-2 text-xl font-semibold text-white">
              {headingPoint ?? "Waiting"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {heading === null ? "No reading yet" : `${Math.round(heading)} deg`}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Turn</div>
            <div className="mt-2 text-xl font-semibold text-white">
              {turnDelta === null ? "Enable" : Math.round(Math.abs(turnDelta))}
              {turnDelta === null ? "" : " deg"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {turnDelta === null ? "Live compass" : turnDelta > 0 ? "Right" : turnDelta < 0 ? "Left" : "Aligned"}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center">
          <div className="relative h-72 w-72 rounded-full border border-white/10 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),rgba(15,23,42,0.92)_60%)] shadow-[inset_0_0_40px_rgba(255,255,255,0.03)]">
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

            <svg viewBox="0 0 288 288" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient
                  id="qiblaTargetArrow"
                  x1="144"
                  y1="144"
                  x2="144"
                  y2="44"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#f8fafc" />
                </linearGradient>
              </defs>

              <g transform={`rotate(${qibla} 144 144)`}>
                <line
                  x1="144"
                  y1="144"
                  x2="144"
                  y2="50"
                  stroke="url(#qiblaTargetArrow)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path d="M144 34 L156 58 L144 52 L132 58 Z" fill="#f8fafc" />
              </g>

              {heading !== null ? (
                <g transform={`rotate(${heading} 144 144)`}>
                  <line
                    x1="144"
                    y1="144"
                    x2="144"
                    y2="74"
                    stroke="#f59e0b"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path d="M144 58 L152 76 L144 71 L136 76 Z" fill="#f59e0b" />
                </g>
              ) : null}
            </svg>

            <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-slate-950 shadow-[0_0_0_6px_rgba(255,255,255,0.04)]" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-slate-300" />
            <span>Qibla</span>
          </div>
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-amber-300" />
            <span>You</span>
          </div>
        </div>

        {!liveSupported ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            This device does not expose a live compass sensor here. Use the bearing and sky cues
            below.
          </div>
        ) : permissionState === "idle" ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-slate-300" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-white">Enable live compass</div>
                <div className="mt-1 text-sm text-slate-400">
                  Allow motion/orientation access so Orbit can show where your phone is pointing.
                </div>
              </div>
            </div>
            <ButtonRow onClick={requestPermission} label="Enable compass" />
          </div>
        ) : permissionState === "denied" ? (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] p-4 text-sm text-rose-200">
            Motion/orientation access was denied. Enable it in browser or app settings to use the
            live compass.
          </div>
        ) : heading === null ? (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Waiting for compass. Hold the phone flat and move it slowly in a figure-eight if needed.
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
            <div className="font-medium text-white">{turnInstruction(turnDelta ?? 0)}</div>
            <div className="mt-1 text-slate-400">
              Facing {Math.round(heading)} deg {headingPoint}. Qibla stays at {qibla} deg {qiblaPoint}.
            </div>
            {source === "ios-compass" && accuracy !== null ? (
              <div className="mt-2 text-slate-500">Sensor accuracy: about {Math.round(accuracy)} deg.</div>
            ) : (
              <div className="mt-2 text-slate-500">
                If the arrows drift, move the phone in a slow figure-eight to help recalibrate.
              </div>
            )}
          </div>
        )}

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-sm font-medium text-white">Direction cue</div>
            <div className="mt-1 text-sm text-slate-400">
              From your location, Qibla is {qiblaPoint} at {describeBearingFromCardinal(qibla)}.
            </div>
          </div>

          {sunAltitudeNow > 4 ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <SunMedium className="h-4 w-4 text-amber-300" />
                  Sun cue
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  The sun is {bearingToCompassPoint(sunAzimuthNow)} now. When you face Qibla, keep
                  the sun {sunRelativeToQibla}.
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  If you can already see the sun, Qibla sits {qiblaRelativeToSun} from it.
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="text-sm font-medium text-white">Shadow cue</div>
                <div className="mt-1 text-sm text-slate-400">
                  Your shadow should fall {shadowRelativeToQibla} when you are facing the right
                  way.
                </div>
              </div>
            </>
          ) : latitude >= 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-medium text-white">Night cue</div>
              <div className="mt-1 text-sm text-slate-400">
                If you can find Polaris, that gives you north. From north, turn{" "}
                {Math.round(Math.abs(northTurn))} deg {northTurn > 0 ? "right" : "left"} to face
                Qibla.
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-medium text-white">Night cue</div>
              <div className="mt-1 text-sm text-slate-400">
                If you can estimate south, turn {Math.round(Math.abs(southTurn))} deg{" "}
                {southTurn > 0 ? "right" : "left"} from south to face Qibla.
              </div>
            </div>
          )}

          {sunAltitudeNow <= 4 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="text-sm font-medium text-white">Sky note</div>
              <div className="mt-1 text-sm text-slate-400">
                {moon.illumination >= 35
                  ? `The moon may be visible tonight (${moon.phaseName}), but its direction changes through the night, so use it only as a rough reference and follow the live compass when possible.`
                  : "After sunset, the sun cue disappears, so the live compass or a north reference will be more reliable."}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ButtonRow({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 h-11 rounded-2xl border border-white/10 bg-white px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
    >
      {label}
    </button>
  );
}
