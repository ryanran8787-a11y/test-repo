import { useEffect, useRef, useState } from "react";
import { FlaskConical, TerminalSquare, Trash2, X } from "lucide-react";
import { TestsPanel } from "./tests-panel";
import { runTerminal } from "@/lib/agent/tools";
import { useWorkspace } from "@/lib/workspace/store";
import { cn } from "@/lib/utils";

export function BottomPanel() {
  const open = useWorkspace((s) => s.terminalOpen);
  const tab = useWorkspace((s) => s.bottomTab);
  if (!open) return null;

  return (
    <div className="flex h-48 shrink-0 flex-col border-t border-border bg-bg">
      <div className="flex h-8 items-center gap-1 border-b border-border px-2">
        <TabButton id="terminal" label="Terminal" icon={TerminalSquare} />
        <TabButton id="tests" label="Tests" icon={FlaskConical} />
        <div className="ml-auto flex items-center gap-1">
          {tab === "terminal" ? (
            <button
              type="button"
              className="rounded-xs p-1 text-muted hover:text-fg"
              aria-label="Clear terminal"
              onClick={() => useWorkspace.getState().clearTerminal()}
            >
              <Trash2 className="size-3.5" />
            </button>
          ) : null}
          <button
            type="button"
            className="rounded-xs p-1 text-muted hover:text-fg"
            aria-label="Hide panel"
            onClick={() => useWorkspace.getState().toggleTerminal()}
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
      {tab === "tests" ? <TestsPanel /> : <TerminalBody />}
    </div>
  );
}

function TabButton({
  id,
  label,
  icon: Icon,
}: {
  id: "terminal" | "tests";
  label: string;
  icon: typeof TerminalSquare;
}) {
  const tab = useWorkspace((s) => s.bottomTab);
  const active = tab === id;
  return (
    <button
      type="button"
      onClick={() => useWorkspace.getState().setBottomTab(id)}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-2xs font-medium",
        active ? "bg-elevated text-fg" : "text-muted hover:text-fg",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function TerminalBody() {
  const lines = useWorkspace((s) => s.terminalLines);
  const [cmd, setCmd] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  const run = () => {
    const value = cmd.trim();
    if (!value) return;
    const ws = useWorkspace.getState();
    ws.appendTerminal(`$ ${value}`);
    if (value === "clear") {
      ws.clearTerminal();
      setCmd("");
      return;
    }
    const result = runTerminal(value, ws.files);
    if (result.files) useWorkspace.setState({ files: result.files });
    if (result.testRun) ws.setTestRun(result.testRun);
    if (result.output) {
      for (const line of result.output.split("\n")) ws.appendTerminal(line);
    }
    setCmd("");
  };

  return (
    <>
      <div ref={scroller} className="forge-scroll min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-2xs leading-5 text-muted">
        {lines.map((line, i) => (
          <div key={`${i}-${line.slice(0, 12)}`} className="whitespace-pre-wrap">
            {line}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-border px-3">
        <span className="font-mono text-2xs text-subtle">$</span>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") run();
          }}
          className="h-8 flex-1 bg-transparent font-mono text-xs text-fg outline-none placeholder:text-subtle"
          placeholder="ls  ·  cat src/index.ts  ·  npm test"
        />
      </div>
    </>
  );
}
