import { useCallback, useEffect, useState } from "react";
import { Preferences } from "@capacitor/preferences";

import { dayKey, type FardKey } from "@/lib/orbit/schedule";

const STORAGE_KEY = "orbit:tracker";
const KEEP_DAYS = 120;

export type TrackerLog = Record<string, FardKey[]>;

function prune(log: TrackerLog) {
  const cutoff = Date.now() - KEEP_DAYS * 86400000;

  return Object.fromEntries(
    Object.entries(log).filter(([key, prayers]) => {
      const [year, month, day] = key.split("-").map(Number);
      return prayers.length > 0 && new Date(year, month - 1, day).getTime() >= cutoff;
    })
  );
}

export function usePrayerTracker() {
  const [log, setLog] = useState<TrackerLog>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (!cancelled && value) {
          setLog(JSON.parse(value) as TrackerLog);
        }
      } catch {
        // A broken log should never block the app.
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(prune(log)) }).catch(() => {});
  }, [log, isLoaded]);

  const toggle = useCallback((day: Date, prayer: FardKey) => {
    const key = dayKey(day);

    setLog((current) => {
      const done = current[key] ?? [];
      return {
        ...current,
        [key]: done.includes(prayer) ? done.filter((item) => item !== prayer) : [...done, prayer],
      };
    });
  }, []);

  const getDone = useCallback((day: Date) => log[dayKey(day)] ?? [], [log]);

  return { getDone, toggle };
}
