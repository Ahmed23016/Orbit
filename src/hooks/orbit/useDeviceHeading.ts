import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { normalizeDegrees, shortestAngleDelta } from "@/lib/orbit/math";

type PermissionState = "idle" | "granted" | "denied" | "unsupported";
type HeadingSource = "ios-compass" | "alpha" | null;

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
};

type DeviceOrientationConstructorWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

function smoothHeading(previous: number, next: number, factor = 0.22) {
  const delta = shortestAngleDelta(previous, next);
  return normalizeDegrees(previous + delta * factor);
}

export function useDeviceHeading(enabled: boolean) {
  const support = useMemo(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      return { supported: false, needsPermission: false };
    }

    const constructor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
    return {
      supported: true,
      needsPermission: typeof constructor.requestPermission === "function",
    };
  }, []);
  const [heading, setHeading] = useState<number | null>(null);
  const [source, setSource] = useState<HeadingSource>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState>(() => {
    if (!support.supported) {
      return "unsupported";
    }

    return support.needsPermission ? "idle" : "granted";
  });
  const headingRef = useRef<number | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEventWithCompass) => {
    let nextHeading: number | null = null;
    let nextSource: HeadingSource = null;
    let nextAccuracy: number | null = null;

    if (
      typeof event.webkitCompassHeading === "number" &&
      Number.isFinite(event.webkitCompassHeading)
    ) {
      nextHeading = normalizeDegrees(event.webkitCompassHeading);
      nextSource = "ios-compass";
      nextAccuracy =
        typeof event.webkitCompassAccuracy === "number" && Number.isFinite(event.webkitCompassAccuracy)
          ? event.webkitCompassAccuracy
          : null;
    } else if (typeof event.alpha === "number" && Number.isFinite(event.alpha)) {
      const legacyOrientation = window as Window & { orientation?: number };
      const screenAngle =
        window.screen.orientation?.angle ??
        (typeof legacyOrientation.orientation === "number" ? legacyOrientation.orientation : 0);
      nextHeading = normalizeDegrees(360 - event.alpha + screenAngle);
      nextSource = "alpha";
    }

    if (nextHeading === null) {
      return;
    }

    setPermissionState("granted");
    setSource(nextSource);
    setAccuracy(nextAccuracy);

    const smoothed =
      headingRef.current === null ? nextHeading : smoothHeading(headingRef.current, nextHeading);
    headingRef.current = smoothed;
    setHeading(smoothed);
  }, []);

  useEffect(() => {
    if (!enabled || permissionState !== "granted") {
      return;
    }

    const listener = (event: Event) => handleOrientation(event as DeviceOrientationEventWithCompass);
    window.addEventListener("deviceorientation", listener, true);
    window.addEventListener("deviceorientationabsolute", listener, true);

    return () => {
      window.removeEventListener("deviceorientation", listener, true);
      window.removeEventListener("deviceorientationabsolute", listener, true);
    };
  }, [enabled, handleOrientation, permissionState]);

  const requestPermission = useCallback(async () => {
    if (!support.supported) {
      setPermissionState("unsupported");
      return;
    }

    if (!support.needsPermission) {
      setPermissionState("granted");
      return;
    }

    try {
      const constructor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
      const result = await constructor.requestPermission?.();
      setPermissionState(result === "granted" ? "granted" : "denied");
    } catch {
      setPermissionState("denied");
    }
  }, [support]);

  return {
    heading,
    source,
    accuracy,
    permissionState,
    isSupported: support.supported,
    requestPermission,
  };
}
