import { useEffect, useState, type ComponentType } from "react";
import type { EditorProps } from "@monaco-editor/react";
import { languageForPath } from "@/lib/workspace/language";
import { useWorkspace } from "@/lib/workspace/store";

const THEME = "forge-dark";

type EditorComp = ComponentType<EditorProps>;

export function MonacoPane() {
  const activePath = useWorkspace((s) => s.activePath);
  const files = useWorkspace((s) => s.files);
  const [Editor, setEditor] = useState<EditorComp | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (!cancelled) setFailed(true);
    }, 10000);
    void import("@monaco-editor/react").then((mod) => {
      if (cancelled) return;
      window.clearTimeout(t);
      setEditor(() => mod.default);
    }).catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  if (!activePath) {
    return (
      <div className="flex h-full items-center justify-center bg-bg px-6 text-center">
        <div>
          <p className="text-sm font-medium">No file open</p>
          <p className="mt-1 text-sm text-muted">Open a file from the explorer or press Ctrl/Cmd+P.</p>
        </div>
      </div>
    );
  }

  const contents = files[activePath] ?? "";

  if (failed && !Editor) {
    return (
      <textarea
        className="h-full w-full resize-none bg-bg p-4 font-mono text-code leading-6 text-fg outline-none"
        value={contents}
        onChange={(e) => useWorkspace.getState().writeFile(activePath, e.target.value, true)}
        spellCheck={false}
        aria-label="Editor content"
      />
    );
  }

  if (!Editor) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-sm text-muted">Loading editor…</div>
    );
  }

  return (
    <Editor
      key={activePath}
      height="100%"
      theme={THEME}
      path={activePath}
      language={languageForPath(activePath)}
      value={contents}
      onChange={(value) => {
        if (!activePath) return;
        useWorkspace.getState().writeFile(activePath, value ?? "", true);
      }}
      onMount={(_editor, monaco) => {
        monaco.editor.defineTheme(THEME, {
          base: "vs-dark",
          inherit: true,
          rules: [
            { token: "comment", foreground: "71717a" },
            { token: "string", foreground: "c5cdd8" },
            { token: "keyword", foreground: "e4e4e7" },
            { token: "number", foreground: "a1a1aa" },
          ],
          colors: {
            "editor.background": "#09090b",
            "editor.foreground": "#f4f4f5",
            "editorLineNumber.foreground": "#52525b",
            "editor.selectionBackground": "#27272a",
            "editor.lineHighlightBackground": "#111113",
            "editorCursor.foreground": "#c5cdd8",
            "editorGutter.background": "#09090b",
          },
        });
        monaco.editor.setTheme(THEME);
      }}
      options={{
        fontSize: 13,
        fontFamily: '"IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace',
        minimap: { enabled: false },
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        renderLineHighlight: "all",
        tabSize: 2,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: "on",
      }}
      loading={<div className="flex h-full items-center justify-center bg-bg text-sm text-muted">Loading editor…</div>}
    />
  );
}
