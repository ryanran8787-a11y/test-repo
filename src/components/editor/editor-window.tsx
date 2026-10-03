import { Bot, Files, GitBranch, Search } from "lucide-react";
import { FileTree } from "./file-tree";
import { MonacoPane } from "./monaco-pane";
import { SearchPanel } from "./search-panel";
import { StatusBar } from "./status-bar";
import { TabBar } from "./tab-bar";
import { BottomPanel } from "./bottom-panel";
import { useUi } from "@/lib/ui-store";
import { useWorkspace } from "@/lib/workspace/store";
import { cn } from "@/lib/utils";

const ACTIVITIES = [
  { id: "files" as const, label: "Explorer", icon: Files },
  { id: "search" as const, label: "Search", icon: Search },
  { id: "source" as const, label: "Changes", icon: GitBranch },
  { id: "agents" as const, label: "Agents", icon: Bot },
];

export function EditorWindow() {
  const activity = useWorkspace((s) => s.activity);
  const sidebarOpen = useWorkspace((s) => s.sidebarOpen);

  return (
    <div className="relative flex min-h-0 flex-1">
      <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-2">
        {ACTIVITIES.map((item) => {
          const Icon = item.icon;
          const active = activity === item.id && sidebarOpen;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              aria-label={item.label}
              onClick={() => {
                if (item.id === "agents") {
                  useUi.getState().setWindowMode("agents");
                  return;
                }
                if (activity === item.id) useWorkspace.getState().toggleSidebar();
                else useWorkspace.getState().setActivity(item.id);
              }}
              className={cn(
                "flex size-10 items-center justify-center rounded-sm",
                active ? "text-fg" : "text-subtle hover:text-fg",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
            </button>
          );
        })}
      </nav>

      {sidebarOpen ? (
        <>
          <button
            type="button"
            className="absolute inset-0 left-12 z-10 bg-bg/50 sm:hidden"
            aria-label="Close sidebar"
            onClick={() => useWorkspace.getState().toggleSidebar()}
          />
          <aside className="absolute inset-y-0 left-12 z-20 flex w-56 flex-col border-r border-border bg-surface sm:static sm:z-0">
            {activity === "files" ? <FileTree /> : null}
            {activity === "search" ? <SearchPanel /> : null}
            {activity === "source" ? <ChangesPanel /> : null}
          </aside>
        </>
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col">
        <TabBar />
        <div className="min-h-0 flex-1">
          <MonacoPane />
        </div>
        <BottomPanel />
        <StatusBar />
      </section>
    </div>
  );
}

function ChangesPanel() {
  const dirty = useWorkspace((s) => s.dirty);
  const paths = Object.keys(dirty).filter((p) => dirty[p]);
  return (
    <div className="px-3 py-3">
      <p className="text-2xs font-medium uppercase tracking-wider text-subtle">Local changes</p>
      {paths.length === 0 ? (
        <p className="mt-3 text-xs text-muted">No unsaved edits in this session.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {paths.map((path) => (
            <li key={path}>
              <button
                type="button"
                className="w-full truncate rounded-sm px-1 py-1 text-left font-mono text-2xs text-fg hover:bg-elevated"
                onClick={() => useWorkspace.getState().openFile(path)}
              >
                {path}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
