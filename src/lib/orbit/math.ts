export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function radToDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}