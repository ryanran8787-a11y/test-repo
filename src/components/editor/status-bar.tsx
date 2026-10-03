import { languageForPath } from "@/lib/workspace/language";
import { useWorkspace } from "@/lib/workspace/store";
import { WORKSPACE_NAME } from "@/lib/workspace/seed";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const path = useWorkspace((s) => s.activePath);
  const lang = path ? languageForPath(path) : "plaintext";
  const run = useWorkspace((s) => s.lastTestRun);

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-border bg-surface px-3 text-2xs text-subtle">
      <span>{WORKSPACE_NAME}</span>
      <span className="flex items-center gap-3">
        {run ? (
          <button
            type="button"
            className={cn("hover:text-fg", run.failed ? "text-danger" : "text-success")}
            onClick={() => useWorkspace.getState().openBottom("tests")}
          >
            {run.failed ? `${run.failed} failed` : `${run.passed} passed`}
          </button>
        ) : (
          <button type="button" className="hover:text-fg" onClick={() => useWorkspace.getState().openBottom("tests")}>
            Tests
          </button>
        )}
        {path ? <span className="hidden sm:inline">{path}</span> : null}
        <span className="capitalize">{lang}</span>
        <span>UTF-8</span>
      </span>
    </footer>
  );
}
