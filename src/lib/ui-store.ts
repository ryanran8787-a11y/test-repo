import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WindowMode = "editor" | "agents";

type UiState = {
  windowMode: WindowMode;
  commandOpen: boolean;
  settingsOpen: boolean;
  agentView: "focus" | "tile";
  setWindowMode: (mode: WindowMode) => void;
  toggleWindow: () => void;
  setCommandOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setAgentView: (view: UiState["agentView"]) => void;
};

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      windowMode: "editor",
      commandOpen: false,
      settingsOpen: false,
      agentView: "focus",
      setWindowMode: (windowMode) => set({ windowMode }),
      toggleWindow: () => set({ windowMode: get().windowMode === "editor" ? "agents" : "editor" }),
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      setAgentView: (agentView) => set({ agentView }),
    }),
    { name: "forge-ui-v1", partialize: (s) => ({ windowMode: s.windowMode, agentView: s.agentView }) },
  ),
);
