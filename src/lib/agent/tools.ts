import { buildTree, type FileMap } from "@/lib/workspace/store";
import { formatTestReport, runWorkspaceTests, type TestRun } from "@/lib/test-runner";
import type { ToolName } from "./types";

export const AGENT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_files",
      description: "List the workspace file tree. Optionally start from a directory.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Directory to list. Empty or omit for the workspace root." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "Read a file's full contents by path.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "File path relative to the workspace root." } },
        required: ["path"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "Create or overwrite a file. Always pass the complete new contents.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to the workspace root." },
          contents: { type: "string", description: "Complete file contents to write." },
        },
        required: ["path", "contents"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_code",
      description: "Search file names and file contents for a query string.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Case-insensitive search string." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_terminal",
      description:
        "Run a workspace command against the virtual file system. Supported: ls, cat, pwd, grep, mkdir, rm, touch, echo, wc, head, tree, npm test.",
      parameters: {
        type: "object",
        properties: { command: { type: "string", description: "Shell-like command." } },
        required: ["command"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "run_tests",
      description:
        "Run the Harbor test suite in the browser against the current workspace files. Executes tests/*.ts and *.test.ts. Returns pass/fail with assertion messages. Use this after editing code to verify the change.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Optional single test file or directory. Omit to run the whole suite.",
          },
        },
      },
    },
  },
];

export const TOOL_NAMES = AGENT_TOOLS.map((t) => t.function.name) as ToolName[];

function treeToText(files: FileMap, root = ""): string {
  const nodes = buildTree(files);
  const lines: string[] = [];
  const walk = (list: ReturnType<typeof buildTree>, depth: number) => {
    for (const n of list) {
      if (root && n.path !== root && !n.path.startsWith(`${root}/`) && !root.startsWith(n.path)) {
        continue;
      }
      if (root && n.type === "dir" && n.path !== root && !n.path.startsWith(`${root}/`) && root !== n.path) {
        if (!root.startsWith(`${n.path}/`) && n.path !== root) continue;
      }
      lines.push(`${"  ".repeat(depth)}${n.type === "dir" ? n.name + "/" : n.name}`);
      if (n.children) walk(n.children, depth + 1);
    }
  };
  walk(nodes, 0);
  return lines.join("\n") || "(empty)";
}

function grep(files: FileMap, query: string): string {
  const q = query.toLowerCase();
  const hits: string[] = [];
  for (const [path, contents] of Object.entries(files)) {
    contents.split("\n").forEach((line, i) => {
      if (line.toLowerCase().includes(q)) hits.push(`${path}:${i + 1}: ${line.trim()}`);
    });
    if (hits.length > 60) break;
  }
  return hits.length ? hits.slice(0, 60).join("\n") : "No matches.";
}

export function runTerminal(command: string, files: FileMap): { output: string; files?: FileMap; testRun?: TestRun } {
  const raw = command.trim();
  if (!raw) return { output: "" };
  const [bin, ...rest] = tokenize(raw);
  const arg = rest.join(" ");

  switch (bin) {
    case "pwd":
      return { output: "/harbor" };
    case "ls": {
      const dir = rest[0] ?? "";
      const prefix = dir ? `${dir.replace(/\/$/, "")}/` : "";
      const names = new Set<string>();
      for (const path of Object.keys(files)) {
        if (dir && !path.startsWith(prefix) && path !== dir) continue;
        const rel = dir ? path.slice(prefix.length) : path;
        if (!rel) continue;
        names.add(rel.split("/")[0] ?? rel);
      }
      return { output: [...names].sort().join("\n") || "(empty)" };
    }
    case "tree":
      return { output: treeToText(files, rest[0] ?? "") };
    case "cat": {
      const path = rest[0];
      if (!path) return { output: "cat: missing path" };
      if (files[path] === undefined) return { output: `cat: ${path}: no such file` };
      return { output: files[path]! };
    }
    case "head": {
      const path = rest[rest.length - 1];
      if (!path || files[path] === undefined) return { output: "head: missing file" };
      return { output: files[path]!.split("\n").slice(0, 10).join("\n") };
    }
    case "wc": {
      const path = rest[0];
      if (!path || files[path] === undefined) return { output: "wc: missing file" };
      const text = files[path]!;
      const lines = text.split("\n").length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      return { output: `${lines} ${words} ${text.length} ${path}` };
    }
    case "grep": {
      if (rest.length < 1) return { output: "grep: missing query" };
      return { output: grep(files, rest[0]!) };
    }
    case "echo":
      return { output: arg };
    case "touch": {
      const path = rest[0];
      if (!path) return { output: "touch: missing path" };
      const next = { ...files, [path]: files[path] ?? "" };
      return { output: "", files: next };
    }
    case "mkdir": {
      const path = rest[0];
      if (!path) return { output: "mkdir: missing path" };
      const next = { ...files, [`${path.replace(/\/$/, "")}/.gitkeep`]: "" };
      return { output: "", files: next };
    }
    case "rm": {
      const path = rest.find((a) => !a.startsWith("-"));
      if (!path) return { output: "rm: missing path" };
      const next = { ...files };
      for (const key of Object.keys(next)) {
        if (key === path || key.startsWith(`${path}/`)) delete next[key];
      }
      return { output: "", files: next };
    }
    case "test":
    case "npm":
      if (bin === "npm" && rest[0] === "test") {
        const run = runWorkspaceTests(files);
        return { output: formatTestReport(run), testRun: run };
      }
      if (bin === "test") {
        const run = runWorkspaceTests(files);
        return { output: formatTestReport(run), testRun: run };
      }
      return { output: `npm: simulated. Supported: npm test` };
    default:
      return {
        output: `${bin}: command not found in the virtual terminal. Try ls, cat, grep, tree, pwd, head, wc, echo, mkdir, rm, touch, npm test.`,
      };
  }
}

function tokenize(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (cur) out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function executeTool(
  name: string,
  argsJson: string,
  files: FileMap,
): { output: string; files?: FileMap; written?: { path: string; before: string; after: string }; testRun?: TestRun } {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || "{}") as Record<string, unknown>;
  } catch {
    return { output: `Invalid JSON arguments: ${argsJson.slice(0, 200)}` };
  }

  switch (name) {
    case "list_files": {
      const path = typeof args.path === "string" ? args.path : "";
      return { output: treeToText(files, path) };
    }
    case "read_file": {
      const path = String(args.path ?? "");
      if (!path) return { output: "path is required" };
      if (files[path] === undefined) return { output: `File not found: ${path}` };
      const contents = files[path]!;
      if (contents.length > 40_000) return { output: contents.slice(0, 40_000) + "\n\n[truncated]" };
      return { output: contents };
    }
    case "write_file": {
      const path = String(args.path ?? "");
      const contents = String(args.contents ?? "");
      if (!path) return { output: "path is required" };
      const before = files[path] ?? "";
      const next = { ...files, [path]: contents };
      return {
        output: `Wrote ${path} (${contents.length} chars).`,
        files: next,
        written: { path, before, after: contents },
      };
    }
    case "search_code": {
      const query = String(args.query ?? "");
      if (!query) return { output: "query is required" };
      return { output: grep(files, query) };
    }
    case "run_terminal": {
      const command = String(args.command ?? "");
      return runTerminal(command, files);
    }
    case "run_tests": {
      const path = typeof args.path === "string" && args.path ? args.path : undefined;
      const run = runWorkspaceTests(files, path);
      return { output: formatTestReport(run), testRun: run };
    }
    default:
      return { output: `Unknown tool: ${name}` };
  }
}
