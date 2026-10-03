import type { ReactNode } from "react";
import { Command } from "cmdk";
import { useMemo } from "react";
import { Bot, Code2, FileCode, FlaskConical, Plus, RotateCcw, Search, Settings, SquareTerminal } from "lucide-react";
import { useAgents } from "@/lib/agent/store";
import { useUi } from "@/lib/ui-store";
import { useWorkspace } from "@/lib/workspace/store";
import { runWorkspaceTests } from "@/lib/test-runner";

export function CommandPalette() {
  const open = useUi((s) => s.commandOpen);
  const files = useWorkspace((s) => s.files);
  const fileItems = useMemo(
    () => Object.keys(files).filter((p) => !p.endsWith("/.gitkeep")).sort(),
    [files],
  );

  if (!open) return null;

  const close = () => useUi.getState().setCommandOpen(false);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-3 pt-24">
      <button type="button" className="absolute inset-0 bg-bg/70" aria-label="Close palette" onClick={close} />
      <Command
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-lg border border-border bg-surface shadow-2xl"
        loop
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="size-4 text-subtle" />
          <Command.Input
            autoFocus
            placeholder="Search files and commands…"
            className="h-11 w-full bg-transparent text-sm text-fg outline-none placeholder:text-subtle"
          />
        </div>
        <Command.List className="forge-scroll max-h-80 overflow-y-auto p-1">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">No results</Command.Empty>
          <Command.Group heading="Window" className="px-1 py-1 text-2xs font-medium text-subtle">
            <Item
              icon={<Code2 className="size-4" />}
              label="Open Editor Window"
              onSelect={() => {
                useUi.getState().setWindowMode("editor");
                close();
              }}
            />
            <Item
              icon={<Bot className="size-4" />}
              label="Open Agents Window"
              onSelect={() => {
                useUi.getState().setWindowMode("agents");
                close();
              }}
            />
            <Item
              icon={<Plus className="size-4" />}
              label="New agent"
              onSelect={() => {
                useAgents.getState().createSession();
                useUi.getState().setWindowMode("agents");
                close();
              }}
            />
            <Item
              icon={<SquareTerminal className="size-4" />}
              label="Toggle terminal"
              onSelect={() => {
                useWorkspace.getState().toggleTerminal();
                close();
              }}
            />
            <Item
              icon={<FlaskConical className="size-4" />}
              label="Run tests"
              onSelect={() => {
                const ws = useWorkspace.getState();
                ws.setTestRun(runWorkspaceTests(ws.files));
                useUi.getState().setWindowMode("editor");
                close();
              }}
            />
            <Item
              icon={<Settings className="size-4" />}
              label="Model settings"
              onSelect={() => {
                useUi.getState().setSettingsOpen(true);
                close();
              }}
            />
            <Item
              icon={<RotateCcw className="size-4" />}
              label="Reset workspace"
              onSelect={() => {
                useWorkspace.getState().resetWorkspace();
                close();
              }}
            />
          </Command.Group>
          <Command.Group heading="Files" className="px-1 py-1 text-2xs font-medium text-subtle">
            {fileItems.map((path) => (
              <Item
                key={path}
                icon={<FileCode className="size-4" />}
                label={path}
                onSelect={() => {
                  useWorkspace.getState().openFile(path);
                  useUi.getState().setWindowMode("editor");
                  close();
                }}
              />
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

function Item({
  icon,
  label,
  onSelect,
}: {
  icon: ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm text-fg aria-selected:bg-elevated"
    >
      <span className="text-muted">{icon}</span>
      <span className="truncate font-mono text-xs">{label}</span>
    </Command.Item>
  );
}
