import { AGENT_TOOLS, executeTool } from "./tools";
import { matchRecipe } from "./recipes";
import { useAgents } from "./store";
import { useWorkspace } from "@/lib/workspace/store";
import { useSettings } from "@/lib/settings";
import { WORKSPACE_NAME } from "@/lib/workspace/seed";
import type { AgentMessage, ChatPayloadMessage, ToolCall } from "./types";

const MAX_STEPS = 10;

function mid() {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

function systemPrompt(fileList: string[]): string {
  return [
    "You are Forge Agent, an autonomous coding agent inside a web IDE.",
    `The workspace is a virtual project named "${WORKSPACE_NAME}".`,
    "Use tools to inspect and edit files. Prefer small, correct edits over rewrites.",
    "After write_file, run_tests to verify the change, then continue until the task is done.",
    "Do not invent files you have not listed. Paths are relative (e.g. src/router.ts).",
    "The terminal is virtual: ls, cat, grep, tree, pwd, npm test. Prefer the run_tests tool over the terminal.",
    "",
    "Workspace files:",
    fileList.map((p) => `- ${p}`).join("\n"),
  ].join("\n");
}

function toPayload(messages: AgentMessage[], fileList: string[]): ChatPayloadMessage[] {
  const out: ChatPayloadMessage[] = [{ role: "system", content: systemPrompt(fileList) }];
  for (const m of messages) {
    if (m.role === "tool") {
      out.push({ role: "tool", content: m.content, tool_call_id: m.toolCallId });
      continue;
    }
    if (m.role === "assistant" && m.toolCalls?.length) {
      out.push({
        role: "assistant",
        content: m.content || null,
        tool_calls: m.toolCalls.map((t) => ({
          id: t.id,
          type: "function",
          function: { name: t.name, arguments: t.arguments },
        })),
      });
      continue;
    }
    out.push({ role: m.role, content: m.content });
  }
  return out;
}

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_calls"; calls: ToolCall[] }
  | { type: "done" };

async function streamChat(
  messages: ChatPayloadMessage[],
  signal: AbortSignal,
  onText: (chunk: string) => void,
): Promise<StreamEvent> {
  const settings = useSettings.getState();
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      messages,
      tools: AGENT_TOOLS,
      stream: true,
      provider: {
        mode: settings.mode,
        model: settings.model,
        baseUrl: settings.baseUrl,
        apiKey: settings.apiKey,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(parseError(errText) || `Chat failed (${res.status})`);
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const toolMap = new Map<number, ToolCall>();

  const flushLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") return;
    let json: {
      error?: { message?: string } | string;
      choices?: Array<{
        delta?: {
          content?: string;
          tool_calls?: Array<{
            index?: number;
            id?: string;
            function?: { name?: string; arguments?: string };
          }>;
        };
      }>;
    };
    try {
      json = JSON.parse(data) as typeof json;
    } catch {
      return;
    }
    const errMsg = typeof json.error === "string" ? json.error : json.error?.message;
    if (errMsg) throw new Error(errMsg);
    const delta = json.choices?.[0]?.delta;
    if (!delta) return;
    if (delta.content) {
      text += delta.content;
      onText(text);
    }
    if (delta.tool_calls) {
      for (const part of delta.tool_calls) {
        const idx = part.index ?? 0;
        const current = toolMap.get(idx) ?? { id: part.id ?? `call_${idx}`, name: "", arguments: "" };
        if (part.id) current.id = part.id;
        if (part.function?.name) current.name += part.function.name;
        if (part.function?.arguments) current.arguments += part.function.arguments;
        toolMap.set(idx, current);
      }
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) flushLine(line);
  }
  if (buffer) flushLine(buffer);

  const calls = [...toolMap.values()].filter((c) => c.name);
  if (calls.length) return { type: "tool_calls", calls };
  if (text) return { type: "text", text };
  return { type: "done" };
}

function parseError(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
  } catch {
    /* ignore */
  }
  return raw.slice(0, 400);
}

function titleFromPrompt(prompt: string): string {
  const clean = prompt.replace(/\s+/g, " ").trim();
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

function applyToolCall(sessionId: string, call: ToolCall) {
  const agents = useAgents.getState();
  const ws = useWorkspace.getState();
  const result = executeTool(call.name, call.arguments, ws.files);
  if (result.files) useWorkspace.setState({ files: result.files });
  if (result.written) {
    useWorkspace.getState().writeFile(result.written.path, result.written.after, false);
    useWorkspace.getState().openFile(result.written.path);
    agents.addChange(sessionId, { ...result.written, status: "pending" });
    useWorkspace.getState().appendTerminal(`agent write  ${result.written.path}`);
  }
  if (result.testRun) {
    useWorkspace.getState().setTestRun(result.testRun);
  }
  if (call.name === "run_terminal") {
    try {
      const cmd = (JSON.parse(call.arguments) as { command?: string }).command ?? "";
      ws.appendTerminal(`$ ${cmd}`);
      if (result.output) {
        for (const line of result.output.split("\n").slice(0, 40)) ws.appendTerminal(line);
      }
    } catch {
      /* ignore */
    }
  }
  agents.appendMessage(sessionId, {
    id: mid(),
    role: "tool",
    content: result.output.slice(0, 24_000),
    toolCallId: call.id,
    toolName: call.name,
  });
}

async function runRecipe(sessionId: string, prompt: string) {
  const recipe = matchRecipe(prompt);
  if (!recipe) return false;
  const agents = useAgents.getState();
  agents.setStatus(sessionId, "running");
  agents.appendMessage(sessionId, {
    id: mid(),
    role: "assistant",
    content: "Hosted model is unavailable, so Forge is applying a local workspace recipe for this suggested task.",
  });

  for (const step of recipe.steps) {
    const call: ToolCall = {
      id: mid(),
      name: step.tool,
      arguments: JSON.stringify(step.args),
    };
    agents.appendMessage(sessionId, {
      id: mid(),
      role: "assistant",
      content: step.note,
      toolCalls: [call],
    });
    applyToolCall(sessionId, call);
  }

  agents.appendMessage(sessionId, {
    id: mid(),
    role: "assistant",
    content:
      "Recipe applied. Review the diffs below — Accept keeps the files, Reject or Restore checkpoint undoes them. Open Settings for a live model on freeform tasks.",
  });
  agents.finishIfReviewed(sessionId);
  return true;
}

export async function runAgent(sessionId: string, prompt: string) {
  const agents = useAgents.getState();
  const session = agents.sessions.find((s) => s.id === sessionId);
  if (!session) return;

  if (!session.messages.length) {
    agents.renameSession(sessionId, titleFromPrompt(prompt));
  }

  agents.appendMessage(sessionId, { id: mid(), role: "user", content: prompt });
  agents.setStatus(sessionId, "planning");
  agents.setCheckpoint(sessionId, { files: { ...useWorkspace.getState().files }, createdAt: Date.now() });

  const controller = new AbortController();
  agents.registerAbort(sessionId, controller);

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      if (controller.signal.aborted) {
        agents.setStatus(sessionId, "stopped");
        return;
      }

      const live = useAgents.getState().sessions.find((s) => s.id === sessionId);
      if (!live) return;
      const files = useWorkspace.getState().files;
      const payload = toPayload(live.messages, Object.keys(files).sort());

      agents.setStatus(sessionId, step === 0 ? "planning" : "running");

      const assistantId = mid();
      agents.appendMessage(sessionId, { id: assistantId, role: "assistant", content: "" });

      const event = await streamChat(payload, controller.signal, (text) => {
        useAgents.getState().patchLastAssistant(sessionId, text);
      });

      if (event.type === "tool_calls") {
        const latest = useAgents.getState().sessions.find((s) => s.id === sessionId);
        if (latest) {
          const msgs = latest.messages.map((m) =>
            m.id === assistantId ? { ...m, content: "", toolCalls: event.calls } : m,
          );
          useAgents.setState({
            sessions: useAgents.getState().sessions.map((s) => (s.id === sessionId ? { ...s, messages: msgs } : s)),
          });
        }

        for (const call of event.calls) applyToolCall(sessionId, call);
        continue;
      }

      if (event.type === "text") {
        useAgents.getState().patchLastAssistant(sessionId, event.text);
      }

      agents.finishIfReviewed(sessionId);
      return;
    }

    agents.appendMessage(sessionId, {
      id: mid(),
      role: "assistant",
      content: "Stopped after the tool-call limit. Ask me to continue if you want another pass.",
    });
    agents.finishIfReviewed(sessionId);
  } catch (err) {
    if (controller.signal.aborted) {
      agents.setStatus(sessionId, "stopped");
      return;
    }
    const applied = await runRecipe(sessionId, prompt);
    if (applied) return;
    const message = err instanceof Error ? err.message : "Agent failed";
    agents.appendMessage(sessionId, {
      id: mid(),
      role: "assistant",
      content: `${message}\n\nOpen Settings to connect an OpenAI-compatible endpoint (base URL, API key, model).`,
    });
    agents.setStatus(sessionId, "error", message);
  }
}
