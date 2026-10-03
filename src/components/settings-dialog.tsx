import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_HOSTED_MODEL, useSettings, type ProviderMode } from "@/lib/settings";
import { useUi } from "@/lib/ui-store";
import { useWorkspace } from "@/lib/workspace/store";
import { cn } from "@/lib/utils";

export function SettingsDialog() {
  const open = useUi((s) => s.settingsOpen);
  const settings = useSettings();
  const [hosted, setHosted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d: { hosted?: boolean }) => setHosted(Boolean(d.hosted)))
      .catch(() => setHosted(false));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-bg/70"
        aria-label="Close settings"
        onClick={() => useUi.getState().setSettingsOpen(false)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-t-xl border border-border bg-surface p-5 shadow-2xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Model settings</h2>
            <p className="mt-1 text-sm text-muted text-pretty">
              Forge speaks the OpenAI chat-completions protocol. Hosted Grok is used by default; switch to any compatible endpoint.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={() => useUi.getState().setSettingsOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="mb-4 flex rounded-md bg-bg p-0.5">
          {(["hosted", "custom"] as ProviderMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => settings.setMode(mode)}
              className={cn(
                "h-8 flex-1 rounded-sm text-xs font-medium capitalize",
                settings.mode === mode ? "bg-elevated text-fg" : "text-muted",
              )}
            >
              {mode === "hosted" ? "Hosted Grok" : "Custom endpoint"}
            </button>
          ))}
        </div>

        {settings.mode === "hosted" ? (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted">
              Model
              <Input
                className="mt-1.5"
                value={settings.model}
                onChange={(e) => settings.setModel(e.target.value)}
                placeholder={DEFAULT_HOSTED_MODEL}
              />
            </label>
            <p className="text-xs text-subtle">
              {hosted === false
                ? "Hosted key is not available in this environment. Use a custom OpenAI-compatible endpoint."
                : `Calls https://api.x.ai/v1/chat/completions with ${settings.model || DEFAULT_HOSTED_MODEL}.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-muted">
              Base URL
              <Input
                className="mt-1.5 font-mono text-xs"
                value={settings.baseUrl}
                onChange={(e) => settings.setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              API key
              <Input
                className="mt-1.5 font-mono text-xs"
                type="password"
                autoComplete="off"
                value={settings.apiKey}
                onChange={(e) => settings.setApiKey(e.target.value)}
                placeholder="sk-…"
              />
            </label>
            <label className="block text-xs font-medium text-muted">
              Model
              <Input
                className="mt-1.5"
                value={settings.model}
                onChange={(e) => settings.setModel(e.target.value)}
                placeholder="gpt-4o"
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              useWorkspace.getState().resetWorkspace();
              useUi.getState().setSettingsOpen(false);
            }}
          >
            Reset Harbor workspace
          </Button>
          <Button type="button" size="sm" onClick={() => useUi.getState().setSettingsOpen(false)}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
