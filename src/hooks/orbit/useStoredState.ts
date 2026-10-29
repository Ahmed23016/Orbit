import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Preferences } from "@capacitor/preferences";

/**
 * useState that is restored from and saved to device storage (Capacitor Preferences).
 * Returns the initial value until the stored one has loaded.
 */
export function useStoredState<T>(key: string, initial: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await Preferences.get({ key });
        if (!cancelled && stored.value) {
          setValue({ ...initial, ...(JSON.parse(stored.value) as T) });
        }
      } catch {
        // Corrupt or unavailable storage: keep the initial value.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // The initial value only seeds the first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (loaded) {
      void Preferences.set({ key, value: JSON.stringify(value) }).catch(() => {});
    }
  }, [key, value, loaded]);

  return [value, setValue, loaded];
}

export function todayStamp(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Not supported.
  }
}
