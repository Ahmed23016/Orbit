import { isValidTime, shiftDay, type PrayerCalculator, type PrayerKey } from "./schedule";

export type SkyPhase = "night" | "dawn" | "morning" | "day" | "golden" | "dusk";

export const SKY_GRADIENTS: Record<SkyPhase, { background: string; glow: string }> = {
  night: {
    background: "linear-gradient(165deg, #0c1330 0%, #1a2150 55%, #2c2558 100%)",
    glow: "rgba(91, 104, 196, 0.32)",
  },
  dawn: {
    background: "linear-gradient(165deg, #1f2a55 0%, #5b4b85 52%, #d98a7a 100%)",
    glow: "rgba(217, 138, 122, 0.30)",
  },
  morning: {
    background: "linear-gradient(165deg, #2a64b0 0%, #4f90d4 55%, #8cc1ea 100%)",
    glow: "rgba(79, 144, 212, 0.30)",
  },
  day: {
    background: "linear-gradient(165deg, #1f5fa8 0%, #3f86cf 55%, #79b6e6 100%)",
    glow: "rgba(63, 134, 207, 0.30)",
  },
  golden: {
    background: "linear-gradient(165deg, #34508f 0%, #b9784f 60%, #eab063 100%)",
    glow: "rgba(234, 176, 99, 0.32)",
  },
  dusk: {
    background: "linear-gradient(165deg, #241f4d 0%, #6f3d68 55%, #d56d58 100%)",
    glow: "rgba(213, 109, 88, 0.30)",
  },
};

const GOLDEN_MINUTES = 45;

export function getSkyPhase(currentKey: PrayerKey, now: Date, maghrib: Date): SkyPhase {
  switch (currentKey) {
    case "fajr":
      return "dawn";
    case "sunrise":
      return "morning";
    case "dhuhr":
      return "day";
    case "asr":
      return maghrib.getTime() - now.getTime() < GOLDEN_MINUTES * 60000 ? "golden" : "day";
    case "maghrib":
      return "dusk";
    default:
      return "night";
  }
}

export type SkyArcMarker = { label: string; time: Date; t: number };

export type SkyArc = {
  kind: "sun" | "moon";
  start: Date;
  end: Date;
  /** 0 → 1 position of the sun/moon along the arc. */
  t: number;
  startLabel: string;
  endLabel: string;
  markers: SkyArcMarker[];
};

/** The sun's arc from sunrise to Maghrib, or the moon's from Maghrib to the next sunrise. */
export function getSkyArc(now: Date, today: Date, calc: PrayerCalculator): SkyArc | null {
  const todayTimes = calc(today);
  const nowMs = now.getTime();
  let arc: Omit<SkyArc, "t" | "markers"> & { markers: Array<{ label: string; time: Date }> };

  if (nowMs < todayTimes.sunrise.getTime()) {
    const yesterday = calc(shiftDay(today, -1));
    arc = {
      kind: "moon",
      start: yesterday.maghrib,
      end: todayTimes.sunrise,
      startLabel: "Maghrib",
      endLabel: "Sunrise",
      markers: [
        { label: "Isha", time: yesterday.isha },
        { label: "Fajr", time: todayTimes.fajr },
      ],
    };
  } else if (nowMs < todayTimes.maghrib.getTime()) {
    arc = {
      kind: "sun",
      start: todayTimes.sunrise,
      end: todayTimes.maghrib,
      startLabel: "Sunrise",
      endLabel: "Maghrib",
      markers: [
        { label: "Dhuhr", time: todayTimes.dhuhr },
        { label: "Asr", time: todayTimes.asr },
      ],
    };
  } else {
    const tomorrow = calc(shiftDay(today, 1));
    arc = {
      kind: "moon",
      start: todayTimes.maghrib,
      end: tomorrow.sunrise,
      startLabel: "Maghrib",
      endLabel: "Sunrise",
      markers: [
        { label: "Isha", time: todayTimes.isha },
        { label: "Fajr", time: tomorrow.fajr },
      ],
    };
  }

  if (!isValidTime(arc.start) || !isValidTime(arc.end)) {
    return null;
  }

  const span = arc.end.getTime() - arc.start.getTime();
  const position = (time: Date) => Math.min(1, Math.max(0, (time.getTime() - arc.start.getTime()) / span));

  return {
    ...arc,
    t: position(now),
    markers: arc.markers
      .filter((marker) => isValidTime(marker.time))
      .map((marker) => ({ ...marker, t: position(marker.time) })),
  };
}
