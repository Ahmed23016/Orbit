export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function normalizeDegrees(deg: number) {
  return ((deg % 360) + 360) % 360;
}

export function shortestAngleDelta(from: number, to: number) {
  const normalized = normalizeDegrees(to - from);
  return normalized > 180 ? normalized - 360 : normalized;
}
