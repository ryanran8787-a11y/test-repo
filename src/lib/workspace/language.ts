const TABLE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  css: "css",
  scss: "scss",
  html: "html",
  md: "markdown",
  markdown: "markdown",
  yml: "yaml",
  yaml: "yaml",
  sh: "shell",
  bash: "shell",
  txt: "plaintext",
  svg: "xml",
};

export function languageForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return TABLE[ext] ?? "plaintext";
}

export function fileName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function parentDir(path: string): string {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}
