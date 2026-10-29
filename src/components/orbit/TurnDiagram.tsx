import { shortestAngleDelta } from "@/lib/orbit/math";

export type Landmark = "sun" | "shadow" | "moon" | "star";

const SIZE = 280;
const C = SIZE / 2;
const R = 108;

/** Point at a bearing (0 = up, clockwise) and radius around the centre. */
function at(angle: number, radius: number) {
  const a = (angle * Math.PI) / 180;
  return { x: C + radius * Math.sin(a), y: C - radius * Math.cos(a) };
}

function LandmarkIcon({ kind }: { kind: Landmark }) {
  const { x, y } = at(0, R);
  if (kind === "sun") {
    return (
      <g>
        <circle cx={x} cy={y} r="22" fill="#f6d38a" fillOpacity="0.25" />
        <circle cx={x} cy={y} r="12" fill="#f6b73c" />
      </g>
    );
  }
  if (kind === "moon") {
    return (
      <g>
        <circle cx={x} cy={y} r="20" fill="#c7d2fe" fillOpacity="0.2" />
        <circle cx={x} cy={y} r="11" fill="#e0e7ff" />
        <circle cx={x + 5} cy={y - 3} r="9.5" className="fill-o-surface" />
      </g>
    );
  }
  if (kind === "star") {
    const r = 12;
    const k = r * 0.3;
    return (
      <g>
        <circle cx={x} cy={y} r="20" fill="#e0e7ff" fillOpacity="0.15" />
        <path
          d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`}
          fill="#e0e7ff"
        />
      </g>
    );
  }
  // Shadow: the person's shadow stretching ahead.
  return (
    <g>
      <rect x={x - 6} y={y - 6} width="12" height="12" rx="6" className="fill-o-text" opacity="0.35" />
    </g>
  );
}

/**
 * Top-down view of you facing a landmark (always at the top). The gold arrow shows where the
 * Qibla is and the arc shows how far to turn.
 */
export function TurnDiagram({
  landmark,
  landmarkBearing,
  qibla,
}: {
  landmark: Landmark;
  landmarkBearing: number;
  qibla: number;
}) {
  const turn = shortestAngleDelta(landmarkBearing, qibla);
  const abs = Math.abs(turn);
  const target = at(turn, R);
  const arcRadius = 62;
  const arcStart = at(0, arcRadius);
  const arcEnd = at(turn, arcRadius);
  const sweep = turn > 0 ? 1 : 0;
  // Arrowhead along the direction of travel at the end of the arc.
  const tangent = turn + (turn > 0 ? 90 : -90);
  const tip = at(turn, arcRadius);
  const back1 = { x: tip.x - 9 * Math.sin(((tangent - 25) * Math.PI) / 180), y: tip.y + 9 * Math.cos(((tangent - 25) * Math.PI) / 180) };
  const back2 = { x: tip.x - 9 * Math.sin(((tangent + 25) * Math.PI) / 180), y: tip.y + 9 * Math.cos(((tangent + 25) * Math.PI) / 180) };
  const label = at(turn / 2, arcRadius - 22);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[300px]" aria-hidden="true">
      <circle cx={C} cy={C} r={R + 18} className="fill-o-surface-2" />
      <circle cx={C} cy={C} r={R} fill="none" strokeDasharray="2 6" className="stroke-o-line" strokeWidth="1.5" />

      {/* Where you're facing: the landmark. */}
      {landmark === "shadow" ? (
        <line x1={C} y1={C} x2={C} y2={C - R + 6} strokeWidth="12" strokeLinecap="round" className="stroke-o-text" opacity="0.18" />
      ) : (
        <line x1={C} y1={C} x2={C} y2={C - R + 22} strokeDasharray="4 6" strokeWidth="2" className="stroke-o-muted" />
      )}
      <LandmarkIcon kind={landmark} />

      {/* The turn. */}
      {abs >= 3 ? (
        <g>
          <path
            d={`M${arcStart.x} ${arcStart.y} A${arcRadius} ${arcRadius} 0 0 ${sweep} ${arcEnd.x} ${arcEnd.y}`}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            className="stroke-o-accent"
          />
          <path d={`M${tip.x} ${tip.y} L${back1.x} ${back1.y} L${back2.x} ${back2.y} Z`} className="fill-o-accent" />
          <text x={label.x} y={label.y + 5} textAnchor="middle" fontSize="15" fontWeight="700" className="fill-o-accent">
            {Math.round(abs)}°
          </text>
        </g>
      ) : null}

      {/* The Qibla. */}
      <line x1={C} y1={C} x2={target.x} y2={target.y} strokeWidth="4" strokeLinecap="round" className="stroke-o-accent" />
      <g>
        <circle cx={target.x} cy={target.y} r="20" className="fill-o-accent-soft" />
        <rect x={target.x - 10} y={target.y - 10} width="20" height="20" rx="2.5" className="fill-o-text" />
        <rect x={target.x - 10} y={target.y - 5} width="20" height="3" className="fill-o-accent" />
      </g>

      {/* You, seen from above, facing up. */}
      <ellipse cx={C} cy={C + 2} rx="17" ry="9" className="fill-o-muted" />
      <circle cx={C} cy={C} r="9" className="fill-o-text" />
      <path d={`M${C - 5} ${C - 12} L${C} ${C - 19} L${C + 5} ${C - 12} Z`} className="fill-o-text" />
    </svg>
  );
}
