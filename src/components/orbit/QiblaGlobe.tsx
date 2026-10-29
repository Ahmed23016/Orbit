import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  geoDistance,
  geoGraticule10,
  geoInterpolate,
  geoOrthographic,
  geoPath,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { FeatureCollection } from "geojson";
import { RotateCcw } from "lucide-react";

import type { PrayedPlace } from "@/hooks/orbit/usePrayedPlaces";

const MAKKAH: [number, number] = [39.8262, 21.4225];
const SIZE = 320;

type QiblaGlobeProps = {
  places?: PrayedPlace[];
  latitude: number;
  longitude: number;
  locationLabel: string;
};

/** An orthographic globe showing the great-circle path from the user to the Kaaba. */
export function QiblaGlobe({ latitude, longitude, locationLabel, places = [] }: QiblaGlobeProps) {
  const [land, setLand] = useState<FeatureCollection | null>(null);
  const home: [number, number] = [longitude, latitude];
  const midpoint = geoInterpolate(home, MAKKAH)(0.5);
  const initialRotation: [number, number] = [-midpoint[0], -midpoint[1]];
  const [rotation, setRotation] = useState<[number, number]>(initialRotation);
  const drag = useRef<{ x: number; y: number; rotation: [number, number] } | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Re-centre when the location changes.
  const locationKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
  const [lastLocation, setLastLocation] = useState(locationKey);
  if (lastLocation !== locationKey) {
    setLastLocation(locationKey);
    setRotation(initialRotation);
  }

  useEffect(() => {
    let cancelled = false;
    void import("world-atlas/land-110m.json").then((module) => {
      if (cancelled) return;
      const topology = (module.default ?? module) as unknown as Topology;
      setLand(feature(topology, topology.objects.land) as unknown as FeatureCollection);
    });
    const timeoutId = window.setTimeout(() => setRevealed(true), 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(SIZE / 2 - 8)
        .translate([SIZE / 2, SIZE / 2])
        .rotate(rotation)
        .clipAngle(90),
    [rotation]
  );
  const path = geoPath(projection);
  const route: GeoPermissibleObjects = { type: "LineString", coordinates: [home, MAKKAH] };
  const distanceKm = Math.round(geoDistance(home, MAKKAH) * 6371);
  const visible = (point: [number, number]) =>
    geoDistance(point, [-rotation[0], -rotation[1]]) < Math.PI / 2;
  const homePoint = visible(home) ? projection(home) : null;
  const kaabaPoint = visible(MAKKAH) ? projection(MAKKAH) : null;
  const routeLength = 900;

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, rotation };
  };
  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    const sensitivity = 0.35;
    setRotation([
      drag.current.rotation[0] + dx * sensitivity,
      Math.max(-90, Math.min(90, drag.current.rotation[1] - dy * sensitivity)),
    ]);
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div
      className="relative overflow-hidden rounded-[28px] p-4 text-white"
      style={{ background: "linear-gradient(165deg, #0c1330 0%, #1a2150 55%, #2c2558 100%)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium tracking-[0.14em] text-white/60 uppercase">Path to the Kaaba</div>
          <div className="mt-0.5 text-[15px] font-semibold">
            {distanceKm.toLocaleString("en-GB")} km along the Earth
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRotation(initialRotation)}
          aria-label="Re-centre the globe"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 transition active:scale-90"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto mt-2 w-full max-w-[320px] cursor-grab touch-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`Globe showing the shortest path from ${locationLabel} to Makkah, ${distanceKm} kilometres`}
      >
        <defs>
          <radialGradient id="globe-ocean" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#24346e" />
            <stop offset="100%" stopColor="#0b1230" />
          </radialGradient>
          <radialGradient id="globe-halo" r="50%">
            <stop offset="85%" stopColor="#6b7bd6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6b7bd6" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#globe-halo)" />
        <path d={path({ type: "Sphere" }) ?? ""} fill="url(#globe-ocean)" />
        <path d={path(geoGraticule10()) ?? ""} fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="0.6" />
        {land ? (
          <path d={path(land) ?? ""} fill="#3a4a8c" fillOpacity="0.9" stroke="#6b7bd6" strokeOpacity="0.35" strokeWidth="0.5" />
        ) : null}

        {/* Places you've prayed from, each with its own path to the Kaaba. */}
        {places.map((place) => {
          const point: [number, number] = [place.longitude, place.latitude];
          const projected = visible(point) ? projection(point) : null;
          return (
            <g key={place.firstAt}>
              <path
                d={path({ type: "LineString", coordinates: [point, MAKKAH] }) ?? ""}
                fill="none"
                stroke="#fff4cf"
                strokeOpacity="0.18"
                strokeWidth="1"
              />
              {projected ? (
                <circle cx={projected[0]} cy={projected[1]} r={2.5 + Math.min(3, Math.log2(place.prayers + 1) * 0.6)} fill="#fff4cf" fillOpacity="0.75" />
              ) : null}
            </g>
          );
        })}

        <path
          d={path(route) ?? ""}
          fill="none"
          stroke="#e3bd72"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={routeLength}
          strokeDashoffset={revealed ? 0 : routeLength}
          style={{ transition: "stroke-dashoffset 1.6s ease-out" }}
        />

        {homePoint ? (
          <g>
            <circle cx={homePoint[0]} cy={homePoint[1]} r="9" fill="#fff4cf" fillOpacity="0.2" />
            <circle cx={homePoint[0]} cy={homePoint[1]} r="4" fill="#fff4cf" />
          </g>
        ) : null}
        {kaabaPoint ? (
          <g>
            <circle cx={kaabaPoint[0]} cy={kaabaPoint[1]} r="12" fill="#e3bd72" fillOpacity="0.22" />
            <rect x={kaabaPoint[0] - 5} y={kaabaPoint[1] - 5} width="10" height="10" rx="1.5" fill="#0b0d12" stroke="#e3bd72" />
            <rect x={kaabaPoint[0] - 5} y={kaabaPoint[1] - 2.5} width="10" height="1.8" fill="#e3bd72" />
          </g>
        ) : null}
      </svg>

      <p className="mt-2 text-center text-[11px] leading-relaxed text-white/55">
        The Qibla follows the shortest path over the globe, which is why it can look curved on a flat
        map. Drag to spin.
      </p>
    </div>
  );
}
