import { useMemo, useState } from "react";
import { Check, Undo2, X } from "lucide-react";
import type { FileChange } from "@/lib/agent/types";
import { changeStatus, useAgents } from "@/lib/agent/store";
import { useUi } from "@/lib/ui-store";
import { useWorkspace } from "@/lib/workspace/store";
import { cn } from "@/lib/utils";

function lineDiff(before: string, after: string): Array<{ type: "same" | "add" | "del"; text: string }> {
  const a = before.split("\n");
  const b = after.split("\n");
  const rows: Array<{ type: "same" | "add" | "del"; text: string }> = [];
  const max = Math.max(a.length, b.length);
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      rows.push({ type: "same", text: a[i]! });
      i += 1;
      j += 1;
      continue;
    }
    const nextA = a.slice(i, i + 6);
    const found = j < b.length ? nextA.indexOf(b[j]!) : -1;
    if (found > 0) {
      for (let k = 0; k < found; k++) rows.push({ type: "del", text: a[i + k]! });
      i += found;
      continue;
    }
    const nextB = b.slice(j, j + 6);
    const foundB = i < a.length ? nextB.indexOf(a[i]!) : -1;
    if (foundB > 0) {
      for (let k = 0; k < foundB; k++) rows.push({ type: "add", text: b[j + k]! });
      j += foundB;
      continue;
    }
    if (i < a.length) {
      rows.push({ type: "del", text: a[i]! });
      i += 1;
    }
    if (j < b.length) {
      rows.push({ type: "add", text: b[j]! });
      j += 1;
    }
    if (rows.length > max * 3) break;
  }
  return rows;
}

export function DiffView({ sessionId, changes }: { sessionId: string; changes: FileChange[] }) {
  const [openPath, setOpenPath] = useState(changes[0]?.path ?? null);
  const selected = changes.find((c) => c.path === openPath) ?? changes[0];
  const rows = useMemo(
    () => (selected ? lineDiff(selected.before, selected.after) : []),
    [selected],
  );
  const status = selected ? changeStatus(selected) : "accepted";

  if (!changes.length) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border bg-bg">
      <div className="flex h-8 items-center justify-between px-3">
        <span className="text-2xs font-medium uppercase tracking-wider text-subtle">Diffs</span>
        {selected ? (
          <div className="flex items-center gap-2">
            {status === "pending" ? (
              <>
                <button
                  type="button"
                  className="text-2xs text-success hover:underline"
                  onClick={() => useAgents.getState().reviewChange(sessionId, selected.path, "accepted")}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="text-2xs text-danger hover:underline"
                  onClick={() => useAgents.getState().reviewChange(sessionId, selected.path, "rejected")}
                >
                  Reject
                </button>
              </>
            ) : (
              <span className="text-2xs capitalize text-subtle">{status}</span>
            )}
            <button
              type="button"
              className="text-2xs text-muted hover:text-fg"
              onClick={() => {
                useWorkspace.getState().openFile(selected.path);
                useUi.getState().setWindowMode("editor");
              }}
            >
              Open in Editor
            </button>
          </div>
        ) : null}
      </div>
      <div className="forge-scroll flex gap-1 overflow-x-auto px-2 pb-2">
        {changes.map((c) => {
          const st = changeStatus(c);
          return (
            <button
              key={c.path}
              type="button"
              onClick={() => setOpenPath(c.path)}
              className={cn(
                "shrink-0 rounded-sm px-2 py-1 font-mono text-2xs",
                (selected?.path ?? "") === c.path ? "bg-elevated text-fg" : "text-muted hover:text-fg",
              )}
            >
              {c.path}
              {st === "pending" ? (
                <span className="ml-1 text-warning">·</span>
              ) : st === "accepted" ? (
                <Check className="ml-1 inline size-3 text-success" />
              ) : (
                <X className="ml-1 inline size-3 text-danger" />
              )}
            </button>
          );
        })}
      </div>
      <div className="forge-scroll min-h-0 flex-1 overflow-auto px-2 pb-3 font-mono text-2xs leading-5">
        {rows.map((row, i) => (
          <div
            key={`${i}-${row.type}`}
            className={cn(
              "whitespace-pre-wrap px-2",
              row.type === "add" && "bg-success/10 text-success",
              row.type === "del" && "bg-danger/10 text-danger",
              row.type === "same" && "text-muted",
            )}
          >
            <span className="inline-block w-4 opacity-70">{row.type === "add" ? "+" : row.type === "del" ? "-" : " "}</span>
            {row.text || " "}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReviewBar({ sessionId, pending, hasCheckpoint }: { sessionId: string; pending: number; hasCheckpoint: boolean }) {
  if (!pending && !hasCheckpoint) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border bg-surface px-3 py-2">
      <p className="mr-auto text-2xs text-muted">
        {pending ? `${pending} file${pending === 1 ? "" : "s"} waiting for review` : "All changes reviewed"}
      </p>
      {pending ? (
        <>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-sm bg-primary px-2 text-2xs font-medium text-primary-fg"
            onClick={() => useAgents.getState().reviewAll(sessionId, "accepted")}
          >
            <Check className="size-3" />
            Accept all
          </button>
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-sm border border-border px-2 text-2xs text-fg hover:bg-elevated"
            onClick={() => useAgents.getState().reviewAll(sessionId, "rejected")}
          >
            <X className="size-3" />
            Reject all
          </button>
        </>
      ) : null}
      {hasCheckpoint ? (
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-sm px-2 text-2xs text-muted hover:text-fg"
          onClick={() => useAgents.getState().restoreCheckpoint(sessionId)}
        >
          <Undo2 className="size-3" />
          Restore checkpoint
        </button>
      ) : null}
    </div>
  );
}
