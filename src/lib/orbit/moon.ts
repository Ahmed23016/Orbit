import type { MoonData } from "./types";

export function computeMoonData(date: Date): MoonData {
  const cycle = 29.53058867;
  const knownNewMoon = new Date("2024-01-11T11:57:00Z").getTime();
  const daysSince = (date.getTime() - knownNewMoon) / 86400000;
  const age = ((daysSince % cycle) + cycle) % cycle;
  const phase = age / cycle;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  let phaseName = "New Moon";
  if (phase < 0.03 || phase > 0.97) phaseName = "New Moon";
  else if (phase < 0.22) phaseName = "Waxing Crescent";
  else if (phase < 0.28) phaseName = "First Quarter";
  else if (phase < 0.47) phaseName = "Waxing Gibbous";
  else if (phase < 0.53) phaseName = "Full Moon";
  else if (phase < 0.72) phaseName = "Waning Gibbous";
  else if (phase < 0.78) phaseName = "Last Quarter";
  else phaseName = "Waning Crescent";

  return {
    age: Number(age.toFixed(1)),
    illumination: Math.round(illumination * 100),
    phaseName,
    phase,
  };
}