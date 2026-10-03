import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Trash2,
} from "lucide-react";
import { buildTree, useWorkspace, type TreeNode } from "@/lib/workspace/store";
import { cn } from "@/lib/utils";

export function FileTree() {
  const files = useWorkspace((s) => s.files);
  const expanded = useWorkspace((s) => s.expanded);
  const activePath = useWorkspace((s) => s.activePath);
  const tree = useMemo(() => buildTree(files), [files]);
  const [creating, setCreating] = useState<{ dir: string; kind: "file" | "folder" } | null>(null);
  const [draft, setDraft] = useState("");

  const submitCreate = () => {
    if (!creating) return;
    const name = draft.trim().replace(/^\/+/, "");
    if (!name) {
      setCreating(null);
      return;
    }
    const path = creating.dir ? `${creating.dir}/${name}` : name;
    if (creating.kind === "folder") useWorkspace.getState().createFolder(path);
    else useWorkspace.getState().createFile(path, "");
    setCreating(null);
    setDraft("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 items-center justify-between px-3">
        <span className="text-2xs font-medium uppercase tracking-wider text-subtle">Explorer</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded-sm p-1 text-muted hover:bg-elevated hover:text-fg"
            aria-label="New file"
            onClick={() => {
              setCreating({ dir: "", kind: "file" });
              setDraft("");
            }}
          >
            <FilePlus className="size-3.5" />
          </button>
          <button
            type="button"
            className="rounded-sm p-1 text-muted hover:bg-elevated hover:text-fg"
            aria-label="New folder"
            onClick={() => {
              setCreating({ dir: "", kind: "folder" });
              setDraft("");
            }}
          >
            <FolderPlus className="size-3.5" />
          </button>
        </div>
      </div>
      <div className="forge-scroll min-h-0 flex-1 overflow-auto px-1 pb-3">
        {creating?.dir === "" ? (
          <CreateRow
            kind={creating.kind}
            draft={draft}
            setDraft={setDraft}
            onSubmit={submitCreate}
            onCancel={() => setCreating(null)}
          />
        ) : null}
        {tree.map((node) => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            activePath={activePath}
            creating={creating}
            draft={draft}
            setDraft={setDraft}
            setCreating={setCreating}
            onSubmitCreate={submitCreate}
          />
        ))}
      </div>
    </div>
  );
}

function CreateRow({
  kind,
  draft,
  setDraft,
  onSubmit,
  onCancel,
  depth = 0,
}: {
  kind: "file" | "folder";
  draft: string;
  setDraft: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  depth?: number;
}) {
  return (
    <div className="flex items-center gap-1 py-0.5" style={{ paddingLeft: `${8 + depth * 12}px` }}>
      {kind === "folder" ? <Folder className="size-3.5 text-muted" /> : <FileCode className="size-3.5 text-muted" />}
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={onSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
        className="h-6 min-w-0 flex-1 rounded-xs border border-border bg-bg px-1 font-mono text-2xs text-fg outline-none"
        placeholder={kind === "folder" ? "folder" : "file.ts"}
      />
    </div>
  );
}

function TreeItem({
  node,
  depth,
  expanded,
  activePath,
  creating,
  draft,
  setDraft,
  setCreating,
  onSubmitCreate,
}: {
  node: TreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  activePath: string | null;
  creating: { dir: string; kind: "file" | "folder" } | null;
  draft: string;
  setDraft: (v: string) => void;
  setCreating: (v: { dir: string; kind: "file" | "folder" } | null) => void;
  onSubmitCreate: () => void;
}) {
  const isDir = node.type === "dir";
  const open = Boolean(expanded[node.path]);
  const active = activePath === node.path;

  return (
    <div>
      <div
        className={cn(
          "group flex h-7 items-center gap-1 rounded-sm pr-1 text-xs",
          active ? "bg-elevated text-fg" : "text-muted hover:bg-panel hover:text-fg",
        )}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
          onClick={() => {
            if (isDir) useWorkspace.getState().toggleExpanded(node.path);
            else useWorkspace.getState().openFile(node.path);
          }}
        >
          {isDir ? (
            open ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />
          ) : (
            <span className="w-3" />
          )}
          {isDir ? (
            open ? <FolderOpen className="size-3.5 shrink-0" /> : <Folder className="size-3.5 shrink-0" />
          ) : (
            <FileCode className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        <button
          type="button"
          className="hidden rounded-xs p-0.5 text-subtle hover:text-danger group-hover:block"
          aria-label={`Delete ${node.name}`}
          onClick={(e) => {
            e.stopPropagation();
            useWorkspace.getState().deletePath(node.path);
          }}
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {isDir && open ? (
        <>
          {creating?.dir === node.path ? (
            <CreateRow
              kind={creating.kind}
              draft={draft}
              setDraft={setDraft}
              onSubmit={onSubmitCreate}
              onCancel={() => setCreating(null)}
              depth={depth + 1}
            />
          ) : null}
          {node.children?.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              activePath={activePath}
              creating={creating}
              draft={draft}
              setDraft={setDraft}
              setCreating={setCreating}
              onSubmitCreate={onSubmitCreate}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}
