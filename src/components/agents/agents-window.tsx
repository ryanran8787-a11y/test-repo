import { LayoutGrid, Plus, Rows3, Trash2 } from "lucide-react";
import { AgentThread } from "./agent-thread";
import { NewAgent } from "./new-agent";
import { useAgents } from "@/lib/agent/store";
import { useUi } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import type { AgentSession } from "@/lib/agent/types";

const STATUS_COLOR: Record<string, string> = {
  idle: "bg-subtle",
  queued: "bg-warning",
  planning: "bg-running",
  running: "bg-running",
  reviewing: "bg-accent",
  done: "bg-success",
  error: "bg-danger",
  stopped: "bg-subtle",
};

export function AgentsWindow() {
  const sessions = useAgents((s) => s.sessions);
  const activeId = useAgents((s) => s.activeId);
  const agentView = useUi((s) => s.agentView);
  const active = sessions.find((s) => s.id === activeId) ?? null;
  const tileSessions = sessions.slice(0, 4);

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-16 shrink-0 flex-col border-r border-border bg-surface sm:w-64">
        <div className="flex h-11 items-center justify-between gap-2 border-b border-border px-2 sm:px-3">
          <button
            type="button"
            onClick={() => useAgents.getState().selectSession(null)}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm bg-primary px-2 text-xs font-medium text-primary-fg sm:px-3"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">New Agent</span>
          </button>
          <button
            type="button"
            className="hidden rounded-sm p-1.5 text-muted hover:text-fg sm:inline-flex"
            aria-label={agentView === "tile" ? "Focus layout" : "Tiled layout"}
            onClick={() => useUi.getState().setAgentView(agentView === "tile" ? "focus" : "tile")}
          >
            {agentView === "tile" ? <Rows3 className="size-4" /> : <LayoutGrid className="size-4" />}
          </button>
        </div>
        <div className="forge-scroll min-h-0 flex-1 overflow-auto p-1.5">
          {sessions.length === 0 ? (
            <p className="hidden px-2 py-4 text-xs text-muted sm:block">No agents yet. Start one from the composer.</p>
          ) : null}
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} active={session.id === activeId} />
          ))}
        </div>
      </aside>

      {agentView === "tile" && tileSessions.length > 1 ? (
        <div className="grid min-w-0 flex-1 grid-cols-1 divide-x divide-border md:grid-cols-2">
          {tileSessions.map((session) => (
            <div key={session.id} className="flex min-h-0 min-w-0 flex-col">
              <AgentThread session={session} />
            </div>
          ))}
        </div>
      ) : active ? (
        <AgentThread session={active} />
      ) : (
        <NewAgent />
      )}
    </div>
  );
}

function SessionCard({ session, active }: { session: AgentSession; active: boolean }) {
  return (
    <div
      className={cn(
        "group mb-1 flex items-start gap-2 rounded-md px-2 py-2",
        active ? "bg-elevated" : "hover:bg-panel",
      )}
    >
      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => useAgents.getState().selectSession(session.id)}>
        <span className="flex items-center gap-2">
          <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_COLOR[session.status] ?? "bg-subtle")} />
          <span className="truncate text-xs font-medium text-fg">{session.title}</span>
        </span>
        <span className="mt-0.5 hidden text-2xs capitalize text-subtle sm:block">{session.status}</span>
      </button>
      <button
        type="button"
        className="hidden rounded-xs p-1 text-subtle hover:text-danger group-hover:inline-flex"
        aria-label="Delete agent"
        onClick={() => useAgents.getState().deleteSession(session.id)}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
