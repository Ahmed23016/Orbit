import { moonPhaseAngle, previousNewMoon } from "./celestial";
import type { MoonData } from "./types";

/** Moon phase from the actual sun–moon positions (not an average cycle). */
export function computeMoonData(date: Date): MoonData {
  const angle = moonPhaseAngle(date);
  const phase = angle / 360;
  const illumination = (1 - Math.cos((angle * Math.PI) / 180)) / 2;
  const age = (date.getTime() - previousNewMoon(date).getTime()) / 86400000;

  let phaseName: string;
  if (angle < 8 || angle >= 352) phaseName = "New Moon";
  else if (angle < 82) phaseName = "Waxing Crescent";
  else if (angle < 98) phaseName = "First Quarter";
  else if (angle < 172) phaseName = "Waxing Gibbous";
  else if (angle < 188) phaseName = "Full Moon";
  else if (angle < 262) phaseName = "Waning Gibbous";
  else if (angle < 278) phaseName = "Last Quarter";
  else phaseName = "Waning Crescent";

  return {
    age: Number(age.toFixed(1)),
    illumination: Math.round(illumination * 100),
    phaseName,
    phase,
  };
}
