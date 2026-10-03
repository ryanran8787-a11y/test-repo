import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderMode = "hosted" | "custom";

export type ModelSettings = {
  mode: ProviderMode;
  model: string;
  baseUrl: string;
  apiKey: string;
};

type SettingsState = ModelSettings & {
  setMode: (mode: ProviderMode) => void;
  setModel: (model: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setApiKey: (apiKey: string) => void;
};

export const DEFAULT_HOSTED_MODEL = "grok-4.5";

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      mode: "hosted",
      model: DEFAULT_HOSTED_MODEL,
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      setMode: (mode) => set({ mode }),
      setModel: (model) => set({ model }),
      setBaseUrl: (baseUrl) => set({ baseUrl }),
      setApiKey: (apiKey) => set({ apiKey }),
    }),
    { name: "forge-settings-v1" },
  ),
);
