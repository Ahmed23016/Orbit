import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_SETTINGS,
  mergeSettings,
  type AppSettings,
  type SettingsPatch,
} from "@/lib/orbit/settings";
import { SettingsContext, type SettingsContextValue } from "@/contexts/settings-context";
import {
  getSettings as loadStoredSettings,
  resetSettings as resetStoredSettings,
  saveSettings,
} from "@/services/settingsStorage";

function applyTheme(theme: AppSettings["theme"]) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  root.dataset.theme = theme;
  root.classList.toggle("dark", resolvedTheme === "dark");
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const stored = await loadStoredSettings();
      if (!cancelled) {
        setSettings(stored);
        setIsReady(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    void saveSettings(settings);
    applyTheme(settings.theme);
  }, [settings, isReady]);

  const updateSettings = useCallback(async (patch: SettingsPatch) => {
    setSettings((current) => mergeSettings(current, patch));
  }, []);

  const resetSettings = useCallback(async () => {
    const defaults = await resetStoredSettings();
    setSettings(defaults);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      isReady,
      updateSettings,
      resetSettings,
    }),
    [settings, isReady, updateSettings, resetSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
