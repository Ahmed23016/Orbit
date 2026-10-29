import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Camera, CameraOff, Compass, Moon, Smartphone, Sun } from "lucide-react";

import { useCameraOrientation } from "@/hooks/orbit/useCameraOrientation";
import { useDeviceHeading } from "@/hooks/orbit/useDeviceHeading";
import { useNow } from "@/hooks/orbit/useNow";
import { vibrate } from "@/hooks/orbit/useStoredState";
import { bearingToCompassPoint } from "@/lib/orbit/astronomy";
import { moonPosition, sunPosition, type MoonPosition, type SkyPosition } from "@/lib/orbit/celestial";
import { normalizeDegrees, shortestAngleDelta } from "@/lib/orbit/math";
import { magneticDeclination } from "@/lib/orbit/qiblaGuide";
import { formatClock } from "@/lib/orbit/time";
import { cn } from "@/lib/utils";

type SkyWindowProps = {
  latitude: number;
  longitude: number;
  timeZone: string;
  hour12: boolean;
  qibla: number;
  distanceKm: number;
};

/** Horizontal field of view in degrees: roughly what a phone held at arm's length covers. */
const FOV = 96;
/** Fallback horizontal field of view before the camera stream reports its size. */
const CAMERA_FOV = 52;
/** A typical phone main camera covers about this many degrees across its long side. */
const SENSOR_LONG_FOV = 66;

/**
 * Horizontal degrees actually visible in a `w`×`h` box showing the stream with object-fit: cover.
 * Streams often arrive landscape even in portrait, and cover-cropping narrows the view further.
 */
function cameraFov(video: HTMLVideoElement | null, w: number, h: number) {
  const vw = video?.videoWidth ?? 0;
  const vh = video?.videoHeight ?? 0;
  if (!vw || !vh) return CAMERA_FOV;
  const tanPerPixel = Math.tan((SENSOR_LONG_FOV / 2) * (Math.PI / 180)) / (Math.max(vw, vh) / 2);
  const scale = Math.max(w / vw, h / vh);
  const visibleSourceWidth = w / scale;
  return (2 * Math.atan(tanPerPixel * (visibleSourceWidth / 2)) * 180) / Math.PI;
}
const TAPE = 26;
const ALIGNED = 3;

type Rgb = [number, number, number];

const SKY_STOPS: Array<{ alt: number; zenith: Rgb; horizon: Rgb }> = [
  { alt: -90, zenith: [4, 6, 14], horizon: [12, 16, 34] },
  { alt: -18, zenith: [5, 7, 16], horizon: [16, 21, 46] },
  { alt: -12, zenith: [10, 14, 40], horizon: [42, 40, 86] },
  { alt: -6, zenith: [20, 28, 72], horizon: [118, 76, 112] },
  { alt: -1, zenith: [40, 58, 120], horizon: [226, 128, 92] },
  { alt: 4, zenith: [52, 100, 170], horizon: [246, 186, 120] },
  { alt: 12, zenith: [44, 112, 196], horizon: [168, 208, 238] },
  { alt: 90, zenith: [34, 102, 192], horizon: [176, 214, 240] },
];

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function skyColors(sunAlt: number) {
  for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
    const a = SKY_STOPS[i];
    const b = SKY_STOPS[i + 1];
    if (sunAlt <= b.alt) {
      const t = Math.max(0, Math.min(1, (sunAlt - a.alt) / (b.alt - a.alt)));
      return { zenith: mix(a.zenith, b.zenith, t), horizon: mix(a.horizon, b.horizon, t) };
    }
  }
  const last = SKY_STOPS[SKY_STOPS.length - 1];
  return { zenith: last.zenith, horizon: last.horizon };
}

const rgba = (c: Rgb, alpha = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;

/** Rolling hills as a function of direction, so the land turns with the view. */
function hillHeight(azimuth: number, layer: 0 | 1) {
  const a = (azimuth * Math.PI) / 180;
  // Kept close to the true horizon (≈ −0.5° to 1.5°) so a rising or setting sun touches the land.
  return layer === 0
    ? 0.5 + 0.5 * Math.sin(a * 3 + 0.4) + 0.3 * Math.sin(a * 7 + 1.3) + 0.15 * Math.sin(a * 17 + 2)
    : 0.6 + 0.4 * Math.sin(a * 5 + 2.1) + 0.3 * Math.sin(a * 11 + 0.2) + 0.15 * Math.sin(a * 29);
}

/** A fixed star field, generated once (positions in azimuth/altitude). */
function makeStars() {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 240 }, () => ({
    az: random() * 360,
    alt: Math.asin(random()) * (180 / Math.PI), // more stars low, like a real dome
    size: random() < 0.08 ? 1.6 : 0.5 + random() * 0.8,
    phase: random() * Math.PI * 2,
  }));
}

type Scene = {
  target: number;
  view: number;
  centerAlt: number;
  camera: boolean;
  qibla: number;
  distanceKm: number;
  sun: SkyPosition;
  moon: MoonPosition;
  sunPath: Array<{ az: number; alt: number }>;
  aligned: boolean;
  southern: boolean;
};

export function SkyWindow({ latitude, longitude, timeZone, hour12, qibla, distanceKm }: SkyWindowProps) {
  const now = useNow(30000);
  const [offset, setOffset] = useState(0);
  const at = useMemo(() => new Date(now.getTime() + offset * 60000), [now, offset]);
  const [live, setLive] = useState(false);
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const { heading: magneticHeading, permissionState, isSupported, requestPermission } = useDeviceHeading(live && !camera);
  const cameraOrientation = useCameraOrientation(camera);
  const declination = magneticDeclination(latitude, longitude, now);

  // Where the view points, from the phone, corrected from magnetic to true north.
  const liveHeading = camera
    ? cameraOrientation
      ? normalizeDegrees(cameraOrientation.heading + declination)
      : null
    : live && magneticHeading !== null
      ? normalizeDegrees(magneticHeading + declination)
      : null;

  // In camera mode the sky is the real one, so show the real moment.
  const shownAt = camera ? now : at;
  const sun = sunPosition(shownAt, latitude, longitude);
  const moon = moonPosition(shownAt, latitude, longitude);
  const aligned = liveHeading !== null && Math.abs(shortestAngleDelta(liveHeading, qibla)) < ALIGNED;

  const hourKey = Math.floor(now.getTime() / 3600000);
  const sunPath = useMemo(() => {
    const points: Array<{ az: number; alt: number }> = [];
    const start = hourKey * 3600000 - 12 * 3600000;
    for (let minutes = 0; minutes <= 24 * 60; minutes += 12) {
      const position = sunPosition(new Date(start + minutes * 60000), latitude, longitude);
      points.push({ az: position.azimuth, alt: position.altitude });
    }
    return points;
  }, [hourKey, latitude, longitude]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stars = useMemo(() => makeStars(), []);
  const scene = useRef<Scene>({
    target: qibla,
    view: qibla,
    centerAlt: Math.max(12, Math.min(40, sun.altitude * 0.6 + 8)),
    camera: false,
    qibla,
    distanceKm,
    sun,
    moon,
    sunPath,
    aligned,
    southern: latitude < 0,
  });

  // Keep the drawing loop's snapshot current without re-creating it.
  useEffect(() => {
    Object.assign(scene.current, { qibla, distanceKm, sun, moon, sunPath, aligned, camera, southern: latitude < 0 });
    if (liveHeading !== null) scene.current.target = liveHeading;
    if (camera && cameraOrientation) scene.current.centerAlt = cameraOrientation.elevation;
  });

  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) vibrate([30, 40, 30]);
    wasAligned.current = aligned;
  }, [aligned]);

  // Rear camera stream while camera mode is on.
  useEffect(() => {
    if (!camera) return;
    let stream: MediaStream | null = null;
    let cancelled = false;

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        if (!cancelled) {
          setCameraError("Camera access was blocked. Allow it for Orbit in your settings.");
          setCamera(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [camera]);

  // The render loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let visible = true;
    // Only animate while the window is on screen; it's heavy and often scrolled away.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(draw);
    });
    observer.observe(canvas);

    const draw = (time: number) => {
      if (!visible) {
        frame = 0;
        return;
      }
      const s = scene.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Ease the view toward its target.
      s.view = normalizeDegrees(s.view + shortestAngleDelta(s.view, s.target) * (s.camera ? 0.35 : 0.18));

      const fov = s.camera ? cameraFov(videoRef.current, w, h) : FOV;
      const ppd = w / fov;
      const horizonY = (s.camera ? h / 2 : (h + TAPE) / 2) + s.centerAlt * ppd;
      const px = (az: number) => w / 2 + shortestAngleDelta(s.view, az) * ppd;
      const py = (alt: number) => horizonY - alt * ppd;
      const onScreen = (az: number) => Math.abs(shortestAngleDelta(s.view, az)) < fov / 2 + 6;
      const t = time / 1000;
      const colors = skyColors(s.sun.altitude);
      const darkness = Math.max(0, Math.min(1, (-s.sun.altitude - 5) / 11));
      const sunX = px(s.sun.azimuth);

      if (s.camera) {
        // The camera shows the real sky: draw only the overlay.
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(w, horizonY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = "600 10px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.textAlign = "left";
        ctx.fillText("HORIZON", 8, horizonY - 6);
      } else {
        // Sky.
        const sky = ctx.createLinearGradient(0, py(70), 0, horizonY);
        sky.addColorStop(0, rgba(colors.zenith));
        sky.addColorStop(1, rgba(colors.horizon));
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, horizonY + 2);

        // Glow along the horizon near sunrise/sunset.
        const sunOff = Math.abs(shortestAngleDelta(s.view, s.sun.azimuth));
        if (s.sun.altitude > -14 && sunOff < 140) {
          const low = Math.max(0, 1 - Math.abs(s.sun.altitude) / 14);
          ctx.save();
          ctx.translate(sunX, horizonY);
          ctx.scale(1, 0.42);
          const band = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.9);
          band.addColorStop(0, `rgba(255,170,110,${0.55 * low})`);
          band.addColorStop(0.5, `rgba(255,140,120,${0.18 * low})`);
          band.addColorStop(1, "rgba(255,140,120,0)");
          ctx.fillStyle = band;
          ctx.fillRect(-w * 1.2, -w * 2, w * 2.4, w * 2.2);
          ctx.restore();
        }

        // Stars fade in as the sky darkens, and gently twinkle.
        if (darkness > 0) {
          for (const star of stars) {
            if (!onScreen(star.az)) continue;
            const y = py(star.alt);
            if (y < TAPE || y > horizonY) continue;
            const twinkle = 0.75 + 0.25 * Math.sin(t * 1.7 + star.phase);
            ctx.fillStyle = `rgba(255,255,255,${darkness * twinkle * (star.size > 1.2 ? 0.95 : 0.6)})`;
            ctx.beginPath();
            ctx.arc(px(star.az), y, star.size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Today's path of the sun (fades out at night).
      ctx.save();
      ctx.setLineDash([2, 5]);
      ctx.strokeStyle = `rgba(255,240,200,${(s.camera ? 0.7 : 0.4) * (1 - darkness)})`;
      ctx.lineWidth = s.camera ? 1.6 : 1.2;
      ctx.beginPath();
      let drawing = false;
      let lastX = 0;
      for (const point of s.sunPath) {
        const x = px(point.az);
        if (point.alt < 0 || !onScreen(point.az) || (drawing && Math.abs(x - lastX) > w / 2)) {
          drawing = false;
          continue;
        }
        if (drawing) ctx.lineTo(x, py(point.alt));
        else ctx.moveTo(x, py(point.alt));
        drawing = true;
        lastX = x;
      }
      ctx.stroke();
      ctx.restore();

      // The moon, with its real phase.
      if (s.moon.altitude > -1 && onScreen(s.moon.azimuth)) {
        const x = px(s.moon.azimuth);
        const y = py(s.moon.altitude);
        const r = 10;
        if (s.camera) {
          drawTarget(ctx, x, y, "#dfe5ff", "Moon");
        } else {
          const halo = ctx.createRadialGradient(x, y, 0, x, y, 30);
          halo.addColorStop(0, `rgba(220,228,255,${0.25 + 0.25 * s.moon.illumination})`);
          halo.addColorStop(1, "rgba(220,228,255,0)");
          ctx.fillStyle = halo;
          ctx.fillRect(x - 30, y - 30, 60, 60);
          ctx.fillStyle = "rgba(120,130,160,0.35)";
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
          const k = 1 - 2 * s.moon.illumination;
          const litRight = s.moon.waxing !== s.southern;
          ctx.fillStyle = "#eef1ff";
          ctx.beginPath();
          ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !litRight);
          ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, litRight ? k > 0 : k <= 0);
          ctx.fill();
        }
      }

      // The sun.
      if (s.sun.altitude > -1.5 && onScreen(s.sun.azimuth)) {
        const y = py(s.sun.altitude);
        if (s.camera) {
          drawTarget(ctx, sunX, y, "#ffd88a", "Sun");
        } else {
          const halo = ctx.createRadialGradient(sunX, y, 0, sunX, y, 70);
          halo.addColorStop(0, "rgba(255,248,220,0.95)");
          halo.addColorStop(0.15, "rgba(255,236,180,0.55)");
          halo.addColorStop(1, "rgba(255,220,150,0)");
          ctx.fillStyle = halo;
          ctx.fillRect(sunX - 70, y - 70, 140, 140);
          ctx.fillStyle = "#fffaf0";
          ctx.beginPath();
          ctx.arc(sunX, y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // The Qibla beacon: a column of light rising from the Kaaba.
      const qx = px(s.qibla);
      const qGround = s.camera ? horizonY : py(hillHeight(s.qibla, 0));
      if (onScreen(s.qibla)) {
        const pulse = 0.8 + 0.2 * Math.sin(t * 2.4);
        const strength = (s.aligned ? 1 : 0.7) * pulse;
        const top = s.camera ? 0 : TAPE;
        const beam = ctx.createLinearGradient(0, qGround, 0, top);
        beam.addColorStop(0, `rgba(243,215,154,${0.75 * strength})`);
        beam.addColorStop(0.6, `rgba(227,189,114,${0.18 * strength})`);
        beam.addColorStop(1, "rgba(227,189,114,0)");
        for (const [width, alpha] of [
          [34, 0.35],
          [14, 0.7],
          [4, 1],
        ] as const) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = beam;
          ctx.fillRect(qx - width / 2, top, width, Math.max(0, qGround - top));
        }
        ctx.globalAlpha = 1;
        const glow = ctx.createRadialGradient(qx, qGround, 0, qx, qGround, 46);
        glow.addColorStop(0, `rgba(243,215,154,${0.6 * strength})`);
        glow.addColorStop(1, "rgba(243,215,154,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(qx - 46, qGround - 46, 92, 92);
      }

      if (!s.camera) {
        // Hills: a hazy far ridge and a dark near ridge, lit faintly by the sky.
        for (const layer of [1, 0] as const) {
          const tint = layer === 1 ? mix(colors.horizon, [20, 26, 40], 0.65) : mix(colors.horizon, [8, 10, 18], 0.86);
          ctx.fillStyle = rgba(tint);
          ctx.beginPath();
          ctx.moveTo(0, h);
          for (let x = 0; x <= w + 3; x += 3) {
            const az = s.view + (x - w / 2) / ppd;
            ctx.lineTo(x, py(hillHeight(az, layer) + (layer === 1 ? 1.4 : 0)));
          }
          ctx.lineTo(w, h);
          ctx.closePath();
          ctx.fill();
        }
      }

      // The Kaaba.
      if (onScreen(s.qibla)) {
        const size = s.camera ? 18 : 15;
        ctx.fillStyle = "#07080c";
        ctx.fillRect(qx - size / 2, qGround - size, size, size);
        ctx.strokeStyle = "#e3bd72";
        ctx.lineWidth = 1;
        if (s.camera) ctx.strokeRect(qx - size / 2, qGround - size, size, size);
        ctx.fillStyle = "#e3bd72";
        ctx.fillRect(qx - size / 2, qGround - size + 4, size, 2.5);
        ctx.font = "600 10px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,244,214,0.95)";
        ctx.fillText("QIBLA", qx, qGround + 14);
        ctx.font = "500 9px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,244,214,0.7)";
        ctx.fillText(`${s.distanceKm.toLocaleString("en-GB")} km`, qx, qGround + 25);
      }

      // Off-screen pointers at the edges.
      const pointers: Array<{ label: string; az: number; color: string }> = [
        { label: "Qibla", az: s.qibla, color: "#e3bd72" },
        ...(s.sun.altitude > -1 ? [{ label: "Sun", az: s.sun.azimuth, color: "#ffd88a" }] : []),
        ...(s.moon.altitude > -1 ? [{ label: "Moon", az: s.moon.azimuth, color: "#dfe5ff" }] : []),
      ];
      const stacks = { left: 0, right: 0 };
      ctx.font = "600 11px system-ui, sans-serif";
      for (const pointer of pointers) {
        const delta = shortestAngleDelta(s.view, pointer.az);
        if (Math.abs(delta) < fov / 2 - 2) continue;
        const right = delta > 0;
        const text = right
          ? `${pointer.label} ${Math.round(Math.abs(delta))}° ›`
          : `‹ ${pointer.label} ${Math.round(Math.abs(delta))}°`;
        const width = ctx.measureText(text).width + 16;
        const y = TAPE + 14 + (right ? stacks.right++ : stacks.left++) * 28;
        const x = right ? w - width - 8 : 8;
        ctx.fillStyle = "rgba(6,8,16,0.6)";
        ctx.beginPath();
        ctx.roundRect(x, y, width, 22, 11);
        ctx.fill();
        ctx.fillStyle = pointer.color;
        ctx.textAlign = "left";
        ctx.fillText(text, x + 8, y + 15);
      }

      // Centre line: where you're facing.
      ctx.strokeStyle = s.aligned ? "rgba(243,215,154,0.9)" : "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(w / 2, TAPE);
      ctx.lineTo(w / 2, s.camera ? h : horizonY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Heading tape.
      ctx.fillStyle = "rgba(4,6,14,0.55)";
      ctx.fillRect(0, 0, w, TAPE);
      ctx.textAlign = "center";
      const step = 5;
      for (let deg = Math.floor((s.view - fov / 2) / step) * step; deg <= s.view + fov / 2; deg += step) {
        const bearing = normalizeDegrees(deg);
        const x = px(bearing);
        const major = bearing % 15 === 0;
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.moveTo(x, TAPE);
        ctx.lineTo(x, TAPE - (major ? 7 : 4));
        ctx.stroke();
        if (major) {
          const cardinal = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][bearing / 45];
          ctx.font = cardinal ? "700 11px system-ui, sans-serif" : "500 9px system-ui, sans-serif";
          ctx.fillStyle = cardinal === "N" ? "#ff8f7a" : cardinal ? "#ffffff" : "rgba(255,255,255,0.6)";
          ctx.fillText(cardinal && bearing % 45 === 0 ? cardinal : `${bearing}`, x, 12);
        }
      }
      const readout = `${Math.round(normalizeDegrees(s.view))}° ${bearingToCompassPoint(s.view)}`;
      ctx.font = "700 11px system-ui, sans-serif";
      const rw = ctx.measureText(readout).width + 14;
      ctx.fillStyle = s.aligned ? "#e3bd72" : "#ffffff";
      ctx.beginPath();
      ctx.roundRect(w / 2 - rw / 2, TAPE - 2, rw, 18, 9);
      ctx.fill();
      ctx.fillStyle = "#0b0d12";
      ctx.fillText(readout, w / 2, TAPE + 11);

      if (s.aligned) {
        ctx.font = "700 13px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,244,214,0.95)";
        ctx.fillText("You're facing the Qibla", w / 2, h - 12);
      }

      frame = requestAnimationFrame(draw);
    };

    frame = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [stars]);

  // Drag to look around (turns phone and camera modes off).
  const drag = useRef<{ x: number; y: number; view: number; alt: number } | null>(null);
  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (camera) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, view: scene.current.target, alt: scene.current.centerAlt };
    setLive(false);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const ppd = event.currentTarget.clientWidth / FOV;
    const s = scene.current;
    s.target = normalizeDegrees(drag.current.view - (event.clientX - drag.current.x) / ppd);
    s.view = s.target;
    s.centerAlt = Math.max(4, Math.min(62, drag.current.alt + (event.clientY - drag.current.y) / ppd));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const jumpTo = (azimuth: number, altitude?: number) => {
    setLive(false);
    setCamera(false);
    scene.current.target = azimuth;
    if (altitude !== undefined) scene.current.centerAlt = Math.max(8, Math.min(62, altitude * 0.7 + 6));
  };

  const startLive = async () => {
    if (live) {
      setLive(false);
      return;
    }
    if (permissionState === "idle") await requestPermission();
    setCamera(false);
    setLive(true);
  };

  const toggleCamera = async () => {
    setCameraError("");
    if (camera) {
      setCamera(false);
      scene.current.centerAlt = 20;
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This device doesn't offer a camera here.");
      return;
    }
    if (permissionState === "idle") await requestPermission();
    setLive(false);
    setOffset(0);
    setCamera(true);
  };

  const qiblaFromSun = shortestAngleDelta(sun.azimuth, qibla);
  const canUseSensors = isSupported && permissionState !== "unsupported";

  return (
    <section className="overflow-hidden rounded-[28px] bg-o-surface">
      <div className={cn("relative bg-black", camera ? "h-[420px]" : "h-[300px]")}>
        {camera ? (
          <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" playsInline muted autoPlay />
        ) : null}
        <canvas
          ref={canvasRef}
          className={cn(
            "absolute inset-0 block h-full w-full touch-none",
            camera ? "" : "cursor-grab active:cursor-grabbing"
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="img"
          aria-label={`Sky view. The Qibla is at ${Math.round(qibla)} degrees. The sun is ${Math.round(sun.altitude)} degrees up at ${Math.round(sun.azimuth)} degrees.`}
        />
        {camera && !cameraOrientation ? (
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-black/60 px-3 py-2 text-center text-xs text-white">
            Waiting for the compass… hold the phone upright and move it in a figure-eight.
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 p-4">
        {canUseSensors ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => void startLive()}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98]",
                live && !camera ? "bg-o-accent text-o-on-accent" : "bg-o-surface-2 text-o-text"
              )}
            >
              <Smartphone className="h-4 w-4" />
              {live && !camera ? (aligned ? "Facing it" : "Turning…") : "Look around"}
            </button>
            <button
              type="button"
              onClick={() => void toggleCamera()}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98]",
                camera ? "bg-o-accent text-o-on-accent" : "bg-o-surface-2 text-o-text"
              )}
            >
              {camera ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
              {camera ? "Close camera" : "Camera view"}
            </button>
          </div>
        ) : null}
        {cameraError ? <p className="text-xs text-o-danger">{cameraError}</p> : null}
        {camera ? (
          <p className="text-xs text-o-muted">
            Hold your phone upright and turn until the gold beam is centred. The rings mark where the real
            sun and moon are; if they line up with the sky, your compass is accurate.
          </p>
        ) : null}

        {!camera ? (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => jumpTo(qibla, 10)}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-o-accent-soft text-sm font-semibold text-o-accent"
              >
                <Compass className="h-4 w-4" />
                Qibla
              </button>
              <button
                type="button"
                onClick={() => jumpTo(sun.azimuth, sun.altitude)}
                disabled={sun.altitude < -1}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-o-surface-2 text-sm font-semibold disabled:opacity-40"
              >
                <Sun className="h-4 w-4" />
                Sun
              </button>
              <button
                type="button"
                onClick={() => jumpTo(moon.azimuth, moon.altitude)}
                disabled={moon.altitude < -1}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-o-surface-2 text-sm font-semibold disabled:opacity-40"
              >
                <Moon className="h-4 w-4" />
                Moon
              </button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-720}
                max={720}
                step={10}
                value={offset}
                onChange={(event) => setOffset(Number(event.target.value))}
                aria-label="Time of day"
                className="h-8 flex-1 cursor-pointer accent-[var(--o-accent)]"
              />
              <button
                type="button"
                onClick={() => setOffset(0)}
                className="h-8 min-w-16 shrink-0 rounded-full bg-o-surface-2 px-3 text-xs font-semibold tabular-nums"
              >
                {offset === 0 ? "Now" : formatClock(at, timeZone, hour12)}
              </button>
            </div>

            <p className="text-xs text-o-faint">
              {sun.altitude > 0
                ? `The sun is ${Math.round(sun.altitude)}° up in the ${bearingToCompassPoint(sun.azimuth)}; the Qibla is ${Math.round(Math.abs(qiblaFromSun))}° to its ${qiblaFromSun > 0 ? "right" : "left"}. `
                : ""}
              Drag to look around and tilt; slide to see any time today.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}

/** A ring with a label, marking where something should appear in the camera image. */
function drawTarget(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, label: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(label, x, y - 30);
}
