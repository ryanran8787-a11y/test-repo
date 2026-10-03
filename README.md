# Forge

A web IDE that mirrors Cursor 3’s two-window workflow: an **Editor Window** for files and a **Agents Window** for autonomous coding agents.

Built on Monaco (the VS Code editor) with a virtual TypeScript workspace named Harbor.

## Windows

- **Editor** — file tree, tabs, syntax highlighting, terminal, and an in-browser test runner
- **Agents** — start one or more agents that read files, edit code, and run tests

Switch from the title bar. Agent diffs can be **Accepted**, **Rejected**, or rolled back with **Restore checkpoint**.

## Run

```bash
npm install
npm run dev
```

Open the printed local URL. No account is required; the workspace persists in the browser.

## Try

1. Status bar → **Tests** → **Run tests**
2. **Agents** → “Write tests for POST /users validation”
3. Review the diff → **Accept all**
4. Back in Editor, run tests again

## Models

Forge speaks the OpenAI chat-completions protocol.

- Default: hosted Grok when available
- Settings → Custom endpoint: any compatible `base URL`, API key, and model

Suggested tasks still apply local workspace recipes if the hosted model is unavailable.

## Stack

TanStack Start, React 19, Tailwind v4, Monaco, Zustand, Sucrase (in-browser tests).
