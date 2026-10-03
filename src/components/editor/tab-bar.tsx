import { X } from "lucide-react";
import { fileName } from "@/lib/workspace/language";
import { useWorkspace } from "@/lib/workspace/store";
import { cn } from "@/lib/utils";

export function TabBar() {
  const tabs = useWorkspace((s) => s.openTabs);
  const active = useWorkspace((s) => s.activePath);
  const dirty = useWorkspace((s) => s.dirty);

  if (!tabs.length) {
    return <div className="h-9 border-b border-border bg-surface" />;
  }

  return (
    <div className="forge-scroll flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-border bg-surface">
      {tabs.map((path) => {
        const isActive = path === active;
        return (
          <div
            key={path}
            className={cn(
              "group flex min-w-32 max-w-52 shrink-0 items-center gap-1 border-r border-border px-2",
              isActive ? "bg-bg text-fg" : "bg-surface text-muted hover:text-fg",
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left font-mono text-2xs"
              onClick={() => useWorkspace.getState().openFile(path)}
            >
              {dirty[path] ? "• " : ""}
              {fileName(path)}
            </button>
            <button
              type="button"
              className="rounded-xs p-0.5 hover:bg-elevated"
              aria-label={`Close ${fileName(path)}`}
              onClick={(e) => {
                e.stopPropagation();
                useWorkspace.getState().closeTab(path);
              }}
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
