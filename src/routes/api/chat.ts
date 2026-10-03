import { createFileRoute } from "@tanstack/react-router";

type Provider = {
  mode?: "hosted" | "custom";
  model?: string;
  baseUrl?: string;
  apiKey?: string;
};

type Incoming = {
  messages?: unknown;
  tools?: unknown;
  stream?: boolean;
  provider?: Provider;
};

const DEFAULT_MODEL = "grok-4.5";
const MAX_TOKENS = 4096;

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseUpstreamError(text: string, status: number): string {
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof parsed.error === "string" && parsed.error) return parsed.error;
    if (parsed.error && typeof parsed.error === "object" && parsed.error.message) {
      return parsed.error.message;
    }
    if (parsed.message) return parsed.message;
  } catch {
    /* ignore */
  }
  if (text) return text.slice(0, 400);
  return `Model error ${status}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          hosted: Boolean(process.env.XAI_API_KEY),
          protocol: "openai",
          defaultModel: DEFAULT_MODEL,
        });
      },
      POST: async ({ request }) => {
        let body: Incoming;
        try {
          body = (await request.json()) as Incoming;
        } catch {
          return jsonError("Invalid JSON");
        }

        const messages = Array.isArray(body.messages) ? body.messages : null;
        if (!messages || messages.length === 0) return jsonError("messages required");
        if (messages.length > 48) return jsonError("too many messages");

        const provider = body.provider ?? {};
        const useCustom = provider.mode === "custom" && provider.baseUrl && provider.apiKey;

        let url: string;
        let apiKey: string;
        let model: string;

        if (useCustom) {
          const base = provider.baseUrl!.replace(/\/+$/, "");
          url = base.endsWith("/chat/completions") ? base : `${base}/chat/completions`;
          apiKey = provider.apiKey!;
          model = provider.model?.trim() || "gpt-4o";
        } else {
          const key = process.env.XAI_API_KEY;
          if (!key) {
            return jsonError(
              "Hosted AI is unavailable. Open Settings and add an OpenAI-compatible base URL, API key, and model.",
              503,
            );
          }
          url = "https://api.x.ai/v1/chat/completions";
          apiKey = key;
          model = provider.model?.trim() || DEFAULT_MODEL;
        }

        const payload: Record<string, unknown> = {
          model,
          messages,
          stream: true,
          max_tokens: MAX_TOKENS,
          temperature: 0.2,
        };
        if (Array.isArray(body.tools) && body.tools.length) {
          payload.tools = body.tools;
          payload.tool_choice = "auto";
        }

        const upstream = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return jsonError(parseUpstreamError(text, upstream.status || 502), upstream.status || 502);
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
