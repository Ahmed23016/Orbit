/** A lit moon disc for a phase in [0, 1): 0 new, 0.5 full (northern-hemisphere view). */
export function MoonGlyph({ phase, size = 64 }: { phase: number; size?: number }) {
  const r = 28;
  const k = Math.cos(2 * Math.PI * phase);
  const waxing = phase < 0.5;
  const rx = Math.abs(k) * r;
  const limbSweep = waxing ? 1 : 0;
  const terminatorSweep = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <circle cx="32" cy="32" r={r} className="fill-o-surface-2" />
      <path
        d={`M32 4 A${r} ${r} 0 0 ${limbSweep} 32 60 A${rx.toFixed(2)} ${r} 0 0 ${terminatorSweep} 32 4 Z`}
        className="fill-o-accent"
        opacity="0.9"
      />
      <circle cx="32" cy="32" r={r} fill="none" strokeWidth="1" className="stroke-o-line" />
    </svg>
  );
}
