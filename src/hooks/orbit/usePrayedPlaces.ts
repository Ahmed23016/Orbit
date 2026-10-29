import { useCallback } from "react";

import { useStoredState } from "@/hooks/orbit/useStoredState";
import { distanceKm, distanceToMakkahKm, qiblaDirection } from "@/lib/orbit/astronomy";
import type { LocationPreset } from "@/lib/orbit/types";

export type PrayedPlace = {
  label: string;
  latitude: number;
  longitude: number;
  qibla: number;
  distanceKm: number;
  firstAt: string;
  lastAt: string;
  prayers: number;
};

const SAME_PLACE_KM = 15;
const MAX_PLACES = 60;
/** Recently counted "day:prayer" keys, so un-ticking and re-ticking doesn't count twice. */
const MAX_COUNTED = 40;

/** A travel diary: every place you've marked a prayer from, merged within 15 km. */
export function usePrayedPlaces() {
  const [store, setStore] = useStoredState<{ places: PrayedPlace[]; counted: string[] }>("orbit:places", {
    places: [],
    counted: [],
  });

  const record = useCallback(
    /** `prayerKey` identifies the prayer (e.g. "2026-10-15:asr") so it's only counted once. */
    (location: LocationPreset, prayerKey: string) => {
      const now = new Date().toISOString();
      setStore((current) => {
        if (current.counted.includes(prayerKey)) return current;
        const places = [...current.places];
        const index = places.findIndex(
          (place) => distanceKm(place.latitude, place.longitude, location.latitude, location.longitude) < SAME_PLACE_KM
        );

        if (index >= 0) {
          const place = places[index];
          places[index] = {
            ...place,
            // Prefer a real place name over a generic one.
            label: place.label === "Current location" ? location.label : place.label,
            lastAt: now,
            prayers: place.prayers + 1,
          };
        } else {
          places.push({
            label: location.label,
            latitude: location.latitude,
            longitude: location.longitude,
            qibla: qiblaDirection(location.latitude, location.longitude),
            distanceKm: distanceToMakkahKm(location.latitude, location.longitude),
            firstAt: now,
            lastAt: now,
            prayers: 1,
          });
        }

        places.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
        return {
          places: places.slice(0, MAX_PLACES),
          counted: [prayerKey, ...current.counted].slice(0, MAX_COUNTED),
        };
      });
    },
    [setStore]
  );

  const remove = useCallback(
    (place: PrayedPlace) =>
      setStore((current) => ({
        ...current,
        places: current.places.filter((item) => item.firstAt !== place.firstAt),
      })),
    [setStore]
  );

  return { places: store.places, record, remove };
}
