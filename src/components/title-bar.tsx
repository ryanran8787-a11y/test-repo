import type { ReactNode } from "react";
import { Bot, Code2, Settings } from "lucide-react";
import { ForgeMark } from "@/components/mark";
import { Button } from "@/components/ui/button";
import { useUi, type WindowMode } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { WORKSPACE_NAME } from "@/lib/workspace/seed";

function ModeButton({
  mode,
  current,
  icon,
  label,
}: {
  mode: WindowMode;
  current: WindowMode;
  icon: ReactNode;
  label: string;
}) {
  const active = mode === current;
  return (
    <button
      type="button"
      onClick={() => useUi.getState().setWindowMode(mode)}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-sm px-3 text-xs font-medium transition-colors duration-150",
        active ? "bg-panel text-fg" : "text-muted hover:text-fg",
      )}
      aria-pressed={active}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function TitleBar() {
  const windowMode = useUi((s) => s.windowMode);

  return (
    <header className="flex h-11 shrink-0 items-center gap-3 border-b border-border bg-surface px-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <ForgeMark className="size-5 text-accent" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none tracking-tight">Forge</p>
          <p className="hidden truncate text-2xs text-subtle sm:block">{WORKSPACE_NAME}</p>
        </div>
      </div>

      <div className="mx-auto flex items-center rounded-md bg-bg p-0.5">
        <ModeButton mode="editor" current={windowMode} icon={<Code2 className="size-3.5" />} label="Editor" />
        <ModeButton mode="agents" current={windowMode} icon={<Bot className="size-3.5" />} label="Agents" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Settings"
          onClick={() => useUi.getState().setSettingsOpen(true)}
        >
          <Settings className="size-4 text-muted" />
        </Button>
      </div>
    </header>
  );
}
