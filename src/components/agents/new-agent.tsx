import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { runAgent } from "@/lib/agent/run";
import { useAgents } from "@/lib/agent/store";
import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
  "Add request logging middleware to the Harbor router",
  "Create GET /stats that returns route counts",
  "Write tests for POST /users validation",
  "Run the Harbor test suite",
];

export function NewAgent() {
  const [draft, setDraft] = useState("");

  const start = (text: string) => {
    const prompt = text.trim();
    if (!prompt) return;
    const id = useAgents.getState().createSession(prompt);
    void runAgent(id, prompt);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <p className="text-2xs font-medium uppercase tracking-[0.18em] text-subtle">Agents Window</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-balance">What should we build?</h1>
        <p className="mt-2 max-w-md text-sm text-muted text-pretty">
          Start an agent. It can read files, edit Harbor, run the in-browser test suite, and wait for you to Accept or Reject each change.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-elevated p-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                start(draft);
                setDraft("");
              }
            }}
            rows={4}
            placeholder="Describe a coding task…"
            className="w-full resize-none bg-transparent px-3 py-2 text-sm text-fg outline-none placeholder:text-subtle"
          />
          <div className="flex justify-end px-1 pb-1">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                start(draft);
                setDraft("");
              }}
              disabled={!draft.trim()}
            >
              Start agent
              <ArrowUp className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => start(s)}
              className="rounded-md border border-border bg-surface px-3 py-2 text-left text-xs text-muted hover:text-fg"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
