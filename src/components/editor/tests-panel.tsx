import { Play } from "lucide-react";
import { formatTestReport, runWorkspaceTests } from "@/lib/test-runner";
import { useWorkspace } from "@/lib/workspace/store";
import { cn } from "@/lib/utils";

export function TestsPanel() {
  const run = useWorkspace((s) => s.lastTestRun);

  const execute = () => {
    const ws = useWorkspace.getState();
    const next = runWorkspaceTests(ws.files);
    ws.setTestRun(next);
    ws.appendTerminal("$ npm test");
    for (const line of formatTestReport(next).split("\n")) ws.appendTerminal(line);
    ws.openBottom("tests");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <p className="text-2xs text-muted">
          {run
            ? run.failed
              ? `${run.failed} failed · ${run.passed} passed`
              : `${run.passed} passed · ${run.durationMs}ms`
            : "Run the Harbor suite in the browser"}
        </p>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-sm bg-elevated px-2 text-2xs font-medium text-fg hover:bg-panel"
          onClick={execute}
        >
          <Play className="size-3" />
          Run tests
        </button>
      </div>
      <div className="forge-scroll min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-2xs leading-5">
        {!run ? (
          <p className="text-muted">No run yet. Tests execute TypeScript from the virtual workspace — no Node process.</p>
        ) : (
          <ul className="space-y-2">
            {run.files.map((file) => (
              <li key={file.file}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 text-left"
                  onClick={() => useWorkspace.getState().openFile(file.file)}
                >
                  <span className={cn("mt-0.5 font-medium", file.ok ? "text-success" : "text-danger")}>
                    {file.ok ? "PASS" : "FAIL"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-fg">{file.file}</span>
                    {file.error ? <span className="mt-0.5 block text-danger">{file.error}</span> : null}
                    {file.assertions
                      .filter((a) => !a.ok)
                      .map((a) => (
                        <span key={a.message} className="mt-0.5 block text-danger">
                          × {a.message}
                        </span>
                      ))}
                    {file.logs.slice(0, 3).map((log) => (
                      <span key={log} className="mt-0.5 block text-subtle">
                        {log}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
