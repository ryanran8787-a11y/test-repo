import { transform } from "sucrase";
import type { FileMap } from "@/lib/workspace/store";

export type TestAssertion = {
  ok: boolean;
  message: string;
};

export type TestFileResult = {
  file: string;
  ok: boolean;
  assertions: TestAssertion[];
  logs: string[];
  error?: string;
};

export type TestRun = {
  startedAt: number;
  durationMs: number;
  files: TestFileResult[];
  passed: number;
  failed: number;
};

export function listTestFiles(files: FileMap, only?: string): string[] {
  const all = Object.keys(files)
    .filter((path) => {
      if (path.endsWith("/.gitkeep")) return false;
      if (/\.test\.(t|j)sx?$/.test(path) || /\.spec\.(t|j)sx?$/.test(path)) return true;
      return path.startsWith("tests/") && /\.(t|j)sx?$/.test(path);
    })
    .sort();
  if (!only) return all;
  const wanted = normalizePath(only);
  return all.filter((p) => p === wanted || p.startsWith(`${wanted}/`));
}

export function runWorkspaceTests(files: FileMap, only?: string): TestRun {
  const startedAt = Date.now();
  const targets = listTestFiles(files, only);
  const results: TestFileResult[] = [];

  if (!targets.length) {
    return {
      startedAt,
      durationMs: 0,
      files: [
        {
          file: only || "tests/",
          ok: false,
          assertions: [],
          logs: [],
          error: "No test files found.",
        },
      ],
      passed: 0,
      failed: 1,
    };
  }

  for (const file of targets) {
    results.push(runOneFile(file, files));
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  return {
    startedAt,
    durationMs: Date.now() - startedAt,
    files: results,
    passed,
    failed,
  };
}

export function formatTestReport(run: TestRun): string {
  const lines: string[] = [];
  for (const file of run.files) {
    const mark = file.ok ? "PASS" : "FAIL";
    const assertCount = file.assertions.length;
    lines.push(`${mark}  ${file.file}${assertCount ? `  (${assertCount} assertion${assertCount === 1 ? "" : "s"})` : ""}`);
    for (const assertion of file.assertions.filter((a) => !a.ok)) {
      lines.push(`  × ${assertion.message}`);
    }
    if (file.error) lines.push(`  ! ${file.error}`);
    for (const log of file.logs.slice(0, 8)) lines.push(`  · ${log}`);
  }
  lines.push("");
  if (run.failed === 0) {
    lines.push(`${run.passed} passed  ${run.durationMs}ms`);
  } else {
    lines.push(`${run.failed} failed, ${run.passed} passed  ${run.durationMs}ms`);
  }
  return lines.join("\n");
}

function runOneFile(file: string, files: FileMap): TestFileResult {
  const assertions: TestAssertion[] = [];
  const logs: string[] = [];
  const cache = new Map<string, Record<string, unknown>>();

  const wrappedConsole = {
    log: (...args: unknown[]) => {
      logs.push(args.map(stringify).join(" "));
    },
    info: (...args: unknown[]) => {
      logs.push(args.map(stringify).join(" "));
    },
    warn: (...args: unknown[]) => {
      logs.push(args.map(stringify).join(" "));
    },
    error: (...args: unknown[]) => {
      logs.push(args.map(stringify).join(" "));
    },
    assert: (cond: unknown, ...args: unknown[]) => {
      if (cond) {
        assertions.push({ ok: true, message: args.length ? args.map(stringify).join(" ") : "ok" });
        return;
      }
      assertions.push({
        ok: false,
        message: args.length ? args.map(stringify).join(" ") : "assertion failed",
      });
    },
  };

  try {
    loadModule(file, files, cache, wrappedConsole);
    const failed = assertions.some((a) => !a.ok);
    return { file, ok: !failed, assertions, logs };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { file, ok: false, assertions, logs, error };
  }
}

function loadModule(
  path: string,
  files: FileMap,
  cache: Map<string, Record<string, unknown>>,
  consoleLike: {
    log: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    assert: (cond: unknown, ...args: unknown[]) => void;
  },
): Record<string, unknown> {
  const resolved = resolveFile(path, files);
  if (!resolved) throw new Error(`Cannot find module '${path}'`);
  const cached = cache.get(resolved);
  if (cached) return cached;

  const exports: Record<string, unknown> = {};
  const module = { exports };
  cache.set(resolved, exports);

  const source = files[resolved] ?? "";
  const js = toCjs(source, resolved);
  const requireFn = (spec: string) => {
    if (spec === "assert" || spec === "node:assert") {
      return {
        ok: (cond: unknown, msg?: string) => consoleLike.assert(cond, msg ?? "ok"),
        equal: (a: unknown, b: unknown, msg?: string) => consoleLike.assert(a === b, msg ?? `${stringify(a)} === ${stringify(b)}`),
        strictEqual: (a: unknown, b: unknown, msg?: string) =>
          consoleLike.assert(a === b, msg ?? `${stringify(a)} === ${stringify(b)}`),
      };
    }
    const next = resolveFrom(resolved, spec, files);
    if (!next) throw new Error(`Cannot find module '${spec}' from ${resolved}`);
    return loadModule(next, files, cache, consoleLike);
  };

  const run = new Function(
    "require",
    "module",
    "exports",
    "console",
    `"use strict";\n${js}\nreturn module.exports;`,
  ) as (
    require: (spec: string) => unknown,
    module: { exports: Record<string, unknown> },
    exports: Record<string, unknown>,
    console: typeof consoleLike,
  ) => Record<string, unknown>;

  const result = run(requireFn, module, module.exports, consoleLike);
  const exported = result && typeof result === "object" ? result : module.exports;
  cache.set(resolved, exported);
  return exported;
}

function toCjs(source: string, filePath: string): string {
  try {
    return transform(source, {
      transforms: ["typescript", "imports"],
      filePath,
      disableESTransforms: true,
    }).code;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Transform failed for ${filePath}: ${message}`);
  }
}

function resolveFrom(from: string, spec: string, files: FileMap): string | null {
  if (!spec.startsWith(".")) return resolveFile(spec, files);
  const dir = from.includes("/") ? from.slice(0, from.lastIndexOf("/")) : "";
  const joined = dir ? `${dir}/${spec}` : spec;
  return resolveFile(joined, files);
}

function resolveFile(spec: string, files: FileMap): string | null {
  const base = normalizePath(spec);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}/index.ts`,
    `${base}/index.js`,
  ];
  for (const path of candidates) {
    if (files[path] !== undefined) return path;
  }
  return null;
}

function normalizePath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function stringify(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value == null) return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
