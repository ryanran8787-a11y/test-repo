import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";
import { DiffView, ReviewBar } from "./diff-view";
import { runAgent } from "@/lib/agent/run";
import { pendingChanges, useAgents } from "@/lib/agent/store";
import type { AgentMessage, AgentSession } from "@/lib/agent/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AgentThread({ session }: { session: AgentSession }) {
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const busy = session.status === "running" || session.status === "planning" || session.status === "queued";
  const pending = pendingChanges(session).length;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [session.messages, session.status]);

  const send = () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    void runAgent(session.id, text);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{session.title}</p>
          <p className="text-2xs capitalize text-subtle">{session.status}</p>
        </div>
        {busy ? (
          <Button type="button" variant="outline" size="sm" onClick={() => useAgents.getState().stopSession(session.id)}>
            <Square className="size-3" />
            Stop
          </Button>
        ) : null}
      </div>

      <div ref={scroller} className="forge-scroll min-h-0 flex-1 overflow-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {session.messages
            .filter((m) => m.role !== "system")
            .map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          {busy ? (
            <p className="text-xs text-muted">
              <span className="shimmer inline-block rounded-sm px-2 py-1">
                {session.status === "planning" ? "Planning the next step…" : "Working in the workspace…"}
              </span>
            </p>
          ) : null}
        </div>
      </div>

      {session.changes.length ? (
        <>
          <ReviewBar sessionId={session.id} pending={pending} hasCheckpoint={Boolean(session.checkpoint)} />
          <div className="h-48 shrink-0">
            <DiffView sessionId={session.id} changes={session.changes} />
          </div>
        </>
      ) : null}

      <div className="border-t border-border p-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-lg border border-border bg-elevated p-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={busy ? "Agent is running…" : "Ask a follow-up…"}
            className="max-h-32 min-h-12 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-subtle"
            disabled={busy}
          />
          <Button type="button" size="icon-sm" onClick={send} disabled={busy || !draft.trim()} aria-label="Send">
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  if (message.role === "tool") {
    return (
      <div className="rounded-md border border-border bg-surface px-3 py-2">
        <p className="font-mono text-2xs text-subtle">{message.toolName}</p>
        <pre className="forge-scroll mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-2xs text-muted">
          {message.content.slice(0, 1200)}
        </pre>
      </div>
    );
  }

  if (message.role === "assistant" && message.toolCalls?.length) {
    return (
      <div className="space-y-1">
        {message.content ? <p className="whitespace-pre-wrap text-sm text-pretty">{message.content}</p> : null}
        {message.toolCalls.map((call) => (
          <div key={call.id} className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-2xs text-muted">
            <span className="text-fg">{call.name}</span>
            {summarizeArgs(call.arguments) ? (
              <span className="text-subtle"> · {summarizeArgs(call.arguments)}</span>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-md rounded-lg bg-elevated px-3 py-2 text-sm text-fg">{message.content}</div>
    );
  }

  if (!message.content) return null;

  return (
    <div className={cn("whitespace-pre-wrap text-sm text-pretty leading-relaxed", message.role === "assistant" && "text-fg")}>
      {message.content}
    </div>
  );
}

function summarizeArgs(raw: string): string {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    if (typeof obj.path === "string") return obj.path;
    if (typeof obj.command === "string") return obj.command;
    if (typeof obj.query === "string") return obj.query;
  } catch {
    /* ignore */
  }
  return "";
}
