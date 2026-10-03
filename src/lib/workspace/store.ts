import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_OPEN, SEED_FILES, WORKSPACE_NAME } from "./seed";
import { parentDir } from "./language";

export type FileMap = Record<string, string>;

type WorkspaceState = {
  name: string;
  files: FileMap;
  openTabs: string[];
  activePath: string | null;
  expanded: Record<string, boolean>;
  dirty: Record<string, boolean>;
  terminalLines: string[];
  terminalOpen: boolean;
  sidebarOpen: boolean;
  activity: "files" | "search" | "source" | "agents";
  searchQuery: string;
  bottomTab: "terminal" | "tests";
  lastTestRun: import("@/lib/test-runner").TestRun | null;
  hydrateDefaults: () => void;
  openFile: (path: string) => void;
  closeTab: (path: string) => void;
  setActive: (path: string | null) => void;
  writeFile: (path: string, contents: string, markDirty?: boolean) => void;
  createFile: (path: string, contents?: string) => void;
  createFolder: (path: string) => void;
  deletePath: (path: string) => void;
  renamePath: (from: string, to: string) => void;
  toggleExpanded: (dir: string) => void;
  setActivity: (activity: WorkspaceState["activity"]) => void;
  setSearchQuery: (q: string) => void;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  appendTerminal: (line: string) => void;
  clearTerminal: () => void;
  setBottomTab: (tab: WorkspaceState["bottomTab"]) => void;
  openBottom: (tab: WorkspaceState["bottomTab"]) => void;
  setTestRun: (run: import("@/lib/test-runner").TestRun | null) => void;
  replaceFiles: (files: FileMap) => void;
  resetWorkspace: () => void;
};

function seedExpanded(): Record<string, boolean> {
  return { src: true, "src/routes": true, tests: true, public: true, styles: true };
}

function initialFiles(): FileMap {
  return { ...SEED_FILES };
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      name: WORKSPACE_NAME,
      files: initialFiles(),
      openTabs: [DEFAULT_OPEN],
      activePath: DEFAULT_OPEN,
      expanded: seedExpanded(),
      dirty: {},
      terminalLines: [
        "Forge terminal — workspace commands run against the virtual file system.",
        "Try: ls, cat src/index.ts, grep router src",
      ],
      terminalOpen: false,
      sidebarOpen: true,
      activity: "files",
      searchQuery: "",
      bottomTab: "terminal",
      lastTestRun: null,
      hydrateDefaults: () => {
        const { files } = get();
        if (!files || Object.keys(files).length === 0) {
          set({
            files: initialFiles(),
            openTabs: [DEFAULT_OPEN],
            activePath: DEFAULT_OPEN,
            expanded: seedExpanded(),
          });
        }
        if (!get().bottomTab) set({ bottomTab: "terminal" });
      },
      openFile: (path) => {
        const { files, openTabs } = get();
        if (!(path in files) && !path.endsWith("/")) return;
        const tabs = openTabs.includes(path) ? openTabs : [...openTabs, path];
        const parts = path.split("/").filter(Boolean);
        const expanded = { ...get().expanded };
        let acc = "";
        for (let i = 0; i < parts.length - 1; i++) {
          acc = acc ? `${acc}/${parts[i]}` : parts[i]!;
          expanded[acc] = true;
        }
        const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
        set({
          openTabs: tabs,
          activePath: path,
          expanded,
          activity: "files",
          sidebarOpen: isMobile ? false : get().sidebarOpen,
        });
      },
      closeTab: (path) => {
        const tabs = get().openTabs.filter((t) => t !== path);
        const active = get().activePath === path ? (tabs[tabs.length - 1] ?? null) : get().activePath;
        set({ openTabs: tabs, activePath: active });
      },
      setActive: (path) => set({ activePath: path }),
      writeFile: (path, contents, markDirty = true) => {
        const files = { ...get().files, [path]: contents };
        const dirty = { ...get().dirty };
        if (markDirty) dirty[path] = true;
        else delete dirty[path];
        const tabs = get().openTabs.includes(path) ? get().openTabs : [...get().openTabs, path];
        set({ files, dirty, openTabs: tabs });
      },
      createFile: (path, contents = "") => {
        if (get().files[path] !== undefined) return;
        const files = { ...get().files, [path]: contents };
        const dir = parentDir(path);
        const expanded = { ...get().expanded };
        if (dir) expanded[dir] = true;
        const tabs = get().openTabs.includes(path) ? get().openTabs : [...get().openTabs, path];
        set({ files, expanded, openTabs: tabs, activePath: path });
      },
      createFolder: (path) => {
        const placeholder = `${path.replace(/\/$/, "")}/.gitkeep`;
        if (get().files[placeholder] !== undefined) return;
        set({
          files: { ...get().files, [placeholder]: "" },
          expanded: { ...get().expanded, [path.replace(/\/$/, "")]: true },
        });
      },
      deletePath: (path) => {
        const files = { ...get().files };
        for (const key of Object.keys(files)) {
          if (key === path || key.startsWith(`${path}/`)) delete files[key];
        }
        const tabs = get().openTabs.filter((t) => t !== path && !t.startsWith(`${path}/`));
        const active =
          get().activePath === path || get().activePath?.startsWith(`${path}/`)
            ? (tabs[tabs.length - 1] ?? null)
            : get().activePath;
        set({ files, openTabs: tabs, activePath: active });
      },
      renamePath: (from, to) => {
        const files = { ...get().files };
        const contents = files[from];
        if (contents === undefined) return;
        delete files[from];
        files[to] = contents;
        const tabs = get().openTabs.map((t) => (t === from ? to : t));
        const active = get().activePath === from ? to : get().activePath;
        set({ files, openTabs: tabs, activePath: active });
      },
      toggleExpanded: (dir) => {
        set({ expanded: { ...get().expanded, [dir]: !get().expanded[dir] } });
      },
      setActivity: (activity) => set({ activity, sidebarOpen: true }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
      toggleTerminal: () => set({ terminalOpen: !get().terminalOpen }),
      appendTerminal: (line) => {
        const lines = [...get().terminalLines, line];
        set({ terminalLines: lines.slice(-400), terminalOpen: true, bottomTab: "terminal" });
      },
      clearTerminal: () => set({ terminalLines: [] }),
      setBottomTab: (bottomTab) => set({ bottomTab, terminalOpen: true }),
      openBottom: (bottomTab) => set({ bottomTab, terminalOpen: true }),
      setTestRun: (lastTestRun) => set({ lastTestRun, terminalOpen: true, bottomTab: "tests" }),
      replaceFiles: (files) => {
        const tabs = get().openTabs.filter((t) => t in files);
        const current = get().activePath;
        const active = current && current in files ? current : (tabs[tabs.length - 1] ?? null);
        set({
          files,
          openTabs: tabs.length ? tabs : Object.keys(files).slice(0, 1),
          activePath: active ?? Object.keys(files)[0] ?? null,
          dirty: {},
        });
      },
      resetWorkspace: () =>
        set({
          name: WORKSPACE_NAME,
          files: initialFiles(),
          openTabs: [DEFAULT_OPEN],
          activePath: DEFAULT_OPEN,
          expanded: seedExpanded(),
          dirty: {},
          terminalLines: ["Workspace reset to Harbor sample."],
          lastTestRun: null,
        }),
    }),
    {
      name: "forge-workspace-v1",
      partialize: (s) => ({
        files: s.files,
        openTabs: s.openTabs,
        activePath: s.activePath,
        expanded: s.expanded,
        terminalOpen: s.terminalOpen,
        sidebarOpen: s.sidebarOpen,
      }),
    },
  ),
);

export type TreeNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
};

export function buildTree(files: FileMap): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();

  const ensureDir = (path: string): TreeNode => {
    const existing = dirMap.get(path);
    if (existing) return existing;
    const node: TreeNode = { name: path.split("/").pop() ?? path, path, type: "dir", children: [] };
    dirMap.set(path, node);
    const parent = parentDir(path);
    if (!parent) root.push(node);
    else ensureDir(parent).children!.push(node);
    return node;
  };

  const paths = Object.keys(files).sort((a, b) => a.localeCompare(b));
  for (const path of paths) {
    if (path.endsWith("/.gitkeep")) {
      ensureDir(path.replace(/\/\.gitkeep$/, ""));
      continue;
    }
    const dir = parentDir(path);
    const node: TreeNode = { name: path.split("/").pop() ?? path, path, type: "file" };
    if (!dir) root.push(node);
    else ensureDir(dir).children!.push(node);
  }

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const n of nodes) if (n.children) sortNodes(n.children);
  };
  sortNodes(root);
  return root;
}

export function searchFiles(files: FileMap, query: string): Array<{ path: string; line: number; text: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: Array<{ path: string; line: number; text: string }> = [];
  for (const [path, contents] of Object.entries(files)) {
    if (path.toLowerCase().includes(q)) {
      hits.push({ path, line: 1, text: path });
    }
    const lines = contents.split("\n");
    lines.forEach((text, i) => {
      if (text.toLowerCase().includes(q)) hits.push({ path, line: i + 1, text: text.trim() });
    });
    if (hits.length > 80) break;
  }
  return hits.slice(0, 80);
}
