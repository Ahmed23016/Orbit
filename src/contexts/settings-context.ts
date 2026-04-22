import { createContext } from "react";

import type { AppSettings, SettingsPatch } from "@/lib/orbit/settings";

export type SettingsContextValue = {
  settings: AppSettings;
  isReady: boolean;
  updateSettings: (patch: SettingsPatch) => Promise<void>;
  resetSettings: () => Promise<void>;
};

export const SettingsContext = createContext<SettingsContextValue | null>(null);
