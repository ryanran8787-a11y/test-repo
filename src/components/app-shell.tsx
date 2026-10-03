import { useEffect } from "react";
import { AgentsWindow } from "@/components/agents/agents-window";
import { CommandPalette } from "@/components/command-palette";
import { EditorWindow } from "@/components/editor/editor-window";
import { SettingsDialog } from "@/components/settings-dialog";
import { TitleBar } from "@/components/title-bar";
import { isModKey } from "@/lib/utils";
import { useUi } from "@/lib/ui-store";
import { useWorkspace } from "@/lib/workspace/store";

export function AppShell() {
  const windowMode = useUi((s) => s.windowMode);

  useEffect(() => {
    useWorkspace.getState().hydrateDefaults();
    if (window.innerWidth < 640) {
      useWorkspace.setState({ sidebarOpen: false, terminalOpen: false });
    }

    const onKey = (e: KeyboardEvent) => {
      const mod = isModKey(e);
      if (mod && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        useUi.getState().setCommandOpen(true);
        return;
      }
      if (mod && (e.key === "p" || e.key === "P") && !e.shiftKey) {
        e.preventDefault();
        useUi.getState().setCommandOpen(true);
        return;
      }
      if (mod && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        useUi.getState().setWindowMode("agents");
        return;
      }
      if (mod && e.shiftKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        useUi.getState().setWindowMode("editor");
        return;
      }
      if (mod && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        useWorkspace.getState().toggleTerminal();
        return;
      }
      if (mod && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        useWorkspace.getState().toggleSidebar();
        return;
      }
      if (e.key === "Escape") {
        useUi.getState().setCommandOpen(false);
        useUi.getState().setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <TitleBar />
      {windowMode === "editor" ? <EditorWindow /> : <AgentsWindow />}
      <CommandPalette />
      <SettingsDialog />
    </div>
  );
}
