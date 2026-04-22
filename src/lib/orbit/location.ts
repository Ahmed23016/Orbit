import { Capacitor } from "@capacitor/core";
import {
  Geolocation,
  type PermissionStatus,
  type PositionOptions,
} from "@capacitor/geolocation";

const timeZoneCache = new Map<string, string>();
const inFlightTimeZoneRequests = new Map<string, Promise<string>>();

const TIME_ZONE_TIMEOUT_MS = 3500;
const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 300000,
  minimumUpdateInterval: 5000,
  enableLocationFallback: true,
};

export type AppLocationPosition = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function hasGrantedLocationPermission(status: PermissionStatus) {
  return status.location === "granted" || status.coarseLocation === "granted";
}

async function getNativeCurrentPosition(
  options: PositionOptions = {}
): Promise<AppLocationPosition> {
  let permissionStatus = await Geolocation.checkPermissions();

  if (!hasGrantedLocationPermission(permissionStatus)) {
    permissionStatus = await Geolocation.requestPermissions();
  }

  if (!hasGrantedLocationPermission(permissionStatus)) {
    const deniedError = new Error("Location permission request was denied.");
    (deniedError as Error & { code?: string }).code = "OS-PLUG-GLOC-0003";
    throw deniedError;
  }

  const position = await Geolocation.getCurrentPosition({
    ...DEFAULT_GEOLOCATION_OPTIONS,
    ...options,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? null,
    timestamp: position.timestamp,
  };
}

async function getBrowserCurrentPosition(
  options: PositionOptions = {}
): Promise<AppLocationPosition> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not available.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          timestamp: position.timestamp,
        });
      },
      reject,
      {
        ...DEFAULT_GEOLOCATION_OPTIONS,
        ...options,
      }
    );
  });
}

export function isNativeLocationPlatform() {
  return Capacitor.isNativePlatform();
}

export async function getCurrentPosition(
  options: PositionOptions = {}
): Promise<AppLocationPosition> {
  if (isNativeLocationPlatform()) {
    return getNativeCurrentPosition(options);
  }

  return getBrowserCurrentPosition(options);
}

export function getLocationErrorMessage(error: unknown) {
  const locationError = error as Error & { code?: number | string; message?: string };

  if (locationError.code === 1 || locationError.code === "OS-PLUG-GLOC-0003") {
    return "Location permission was denied.";
  }

  if (locationError.code === 2 || locationError.code === "OS-PLUG-GLOC-0002") {
    return "Location is unavailable right now.";
  }

  if (locationError.code === 3) {
    return "Location request timed out. Try again in a moment.";
  }

  if (
    locationError.code === "OS-PLUG-GLOC-0007" ||
    locationError.code === "OS-PLUG-GLOC-0009"
  ) {
    return "Location services are turned off on this device.";
  }

  return "Could not get your current location.";
}

export async function resolveTimeZone(latitude: number, longitude: number) {
  const cacheKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  const cached = timeZoneCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const inFlight = inFlightTimeZoneRequests.get(cacheKey);

  if (inFlight) {
    return inFlight;
  }

  const request = (async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), TIME_ZONE_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://timeapi.io/api/TimeZone/coordinate?latitude=${latitude}&longitude=${longitude}`,
        {
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error("Could not resolve time zone");
      }

      const payload = (await response.json()) as { timeZone?: string };

      if (!payload.timeZone) {
        throw new Error("No time zone returned");
      }

      timeZoneCache.set(cacheKey, payload.timeZone);
      return payload.timeZone;
    } finally {
      window.clearTimeout(timeoutId);
      inFlightTimeZoneRequests.delete(cacheKey);
    }
  })();

  inFlightTimeZoneRequests.set(cacheKey, request);
  return request;
}
