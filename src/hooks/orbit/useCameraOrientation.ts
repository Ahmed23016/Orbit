import { useEffect, useState } from "react";

import { normalizeDegrees, shortestAngleDelta } from "@/lib/orbit/math";

type OrientationEventWithCompass = DeviceOrientationEvent & { webkitCompassHeading?: number };

export type CameraOrientation = {
  /** Magnetic compass direction the back camera points, in degrees. */
  heading: number;
  /** How far above (+) or below (−) the horizon the camera points, in degrees. */
  elevation: number;
};

const RAD = Math.PI / 180;

/**
 * Direction of the back camera from the device's Euler angles (W3C DeviceOrientation spec,
 * "compass heading" example) — correct whether the phone is flat or held upright.
 */
function backCameraHeading(alpha: number, beta: number, gamma: number) {
  const sx = Math.sin(beta * RAD);
  const cy = Math.cos(gamma * RAD);
  const sy = Math.sin(gamma * RAD);
  const cz = Math.cos(alpha * RAD);
  const sz = Math.sin(alpha * RAD);
  const vx = -cz * sy - sz * sx * cy;
  const vy = -sz * sy + cz * sx * cy;
  let heading = Math.atan(vx / vy);
  if (vy < 0) heading += Math.PI;
  else if (vx < 0) heading += 2 * Math.PI;
  return normalizeDegrees(heading / RAD);
}

/** Live back-camera direction while `enabled`; smoothed to steady the overlay. */
export function useCameraOrientation(enabled: boolean) {
  const [orientation, setOrientation] = useState<CameraOrientation | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const eventName =
      "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    let current: CameraOrientation | null = null;

    const listener = (raw: Event) => {
      const event = raw as OrientationEventWithCompass;
      if (event.beta === null || event.gamma === null) return;
      const beta = event.beta;
      const gamma = event.gamma;

      let heading: number | null = null;
      if (typeof event.webkitCompassHeading === "number") {
        // iOS reports the heading of the direction the camera faces when held upright.
        heading = event.webkitCompassHeading;
      } else if (event.alpha !== null && (eventName === "deviceorientationabsolute" || event.absolute)) {
        heading = backCameraHeading(event.alpha, beta, gamma);
      }
      if (heading === null) return;

      // Camera axis elevation: flat screen-up → −90°, upright → 0°, screen-down → +90°.
      const elevation = Math.asin(Math.max(-1, Math.min(1, -Math.cos(beta * RAD) * Math.cos(gamma * RAD)))) / RAD;

      const next: CameraOrientation = current
        ? {
            heading: normalizeDegrees(current.heading + shortestAngleDelta(current.heading, heading) * 0.25),
            elevation: current.elevation + (elevation - current.elevation) * 0.25,
          }
        : { heading, elevation };
      current = next;
      setOrientation(next);
    };

    window.addEventListener(eventName, listener, true);
    return () => {
      window.removeEventListener(eventName, listener, true);
      setOrientation(null);
    };
  }, [enabled]);

  return orientation;
}
