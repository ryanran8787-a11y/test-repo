import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ForgeMark } from "@/components/mark";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  if (!ready) {
    return (
      <div className="flex h-dvh flex-col bg-bg text-fg">
        <header className="flex h-11 items-center gap-3 border-b border-border bg-surface px-3">
          <ForgeMark className="size-5 text-accent" />
          <p className="text-sm font-medium">Forge</p>
          <div className="mx-auto flex items-center rounded-md bg-bg p-0.5 text-xs">
            <span className="px-3 py-1">Editor</span>
            <span className="px-3 py-1 text-muted">Agents</span>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          <div className="w-12 border-r border-border bg-surface" />
          <aside className="hidden w-56 border-r border-border bg-surface p-3 sm:block">
            <p className="text-2xs font-medium uppercase tracking-wider text-subtle">Explorer</p>
            <p className="mt-3 font-mono text-xs text-muted">src/index.ts</p>
            <p className="font-mono text-xs text-muted">src/router.ts</p>
            <p className="font-mono text-xs text-muted">src/routes/users.ts</p>
          </aside>
          <main className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted">Opening harbor workspace…</p>
          </main>
        </div>
      </div>
    );
  }

  return <AppShell />;
}
