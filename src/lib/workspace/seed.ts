function code(raw: string): string {
  const lines = raw.replace(/^\n/, "").replace(/\n[ \t]*$/, "").split("\n");
  const widths = lines.filter((l) => l.trim()).map((l) => l.match(/^[ \t]*/)?.[0].length ?? 0);
  const min = widths.length ? Math.min(...widths) : 0;
  return `${lines.map((l) => l.slice(min)).join("\n")}\n`;
}

export const WORKSPACE_NAME = "harbor";

export const SEED_FILES: Record<string, string> = {
  "README.md": code(`
    # Harbor

    Tiny TypeScript HTTP router used as the Forge workspace.

    ## Layout

    - \`src/index.ts\` — entry
    - \`src/router.ts\` — method + path matching
    - \`src/routes/\` — handlers

    Open the **Agents** window and ask Forge to add logging, tests, or a new endpoint.
  `),

  "package.json": code(`
    {
      "name": "harbor",
      "private": true,
      "type": "module",
      "version": "0.1.0",
      "scripts": {
        "start": "node src/index.ts",
        "test": "node tests/router.test.ts"
      }
    }
  `),

  "tsconfig.json": code(`
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "noEmit": true
      },
      "include": ["src", "tests"]
    }
  `),

  "src/index.ts": code(`
    import { createRouter } from "./router";
    import { healthRoutes } from "./routes/health";
    import { userRoutes } from "./routes/users";
    import { noteRoutes } from "./routes/notes";
    import type { RequestCtx } from "./types";

    const router = createRouter();
    healthRoutes(router);
    userRoutes(router);
    noteRoutes(router);

    export function handle(ctx: RequestCtx) {
      return router.dispatch(ctx);
    }

    const sample = handle({
      method: "GET",
      path: "/health",
      headers: {},
    });

    console.log(JSON.stringify(sample));
  `),

  "src/types.ts": code(`
    export type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

    export type RequestCtx = {
      method: Method;
      path: string;
      headers: Record<string, string>;
      body?: unknown;
    };

    export type ResponseBody = {
      status: number;
      headers?: Record<string, string>;
      body: unknown;
    };

    export type Handler = (ctx: RequestCtx, params: Record<string, string>) => ResponseBody;

    export type Route = {
      method: Method;
      pattern: string;
      handler: Handler;
    };
  `),

  "src/http.ts": code(`
    import type { ResponseBody } from "./types";

    export function json(status: number, body: unknown): ResponseBody {
      return {
        status,
        headers: { "content-type": "application/json" },
        body,
      };
    }

    export function notFound(message = "Not found"): ResponseBody {
      return json(404, { error: message });
    }

    export function badRequest(message: string): ResponseBody {
      return json(400, { error: message });
    }
  `),

  "src/router.ts": code(`
    import type { Handler, Method, RequestCtx, ResponseBody, Route } from "./types";
    import { notFound } from "./http";

    function compile(pattern: string) {
      const keys: string[] = [];
      const source = pattern.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
        keys.push(key);
        return "([^/]+)";
      });
      return { keys, regex: new RegExp("^" + source + "$") };
    }

    export function createRouter() {
      const routes: Array<Route & { keys: string[]; regex: RegExp }> = [];

      return {
        on(method: Method, pattern: string, handler: Handler) {
          const { keys, regex } = compile(pattern);
          routes.push({ method, pattern, handler, keys, regex });
        },
        dispatch(ctx: RequestCtx): ResponseBody {
          for (const route of routes) {
            if (route.method !== ctx.method) continue;
            const match = route.regex.exec(ctx.path);
            if (!match) continue;
            const params: Record<string, string> = {};
            route.keys.forEach((key, i) => {
              params[key] = decodeURIComponent(match[i + 1] ?? "");
            });
            return route.handler(ctx, params);
          }
          return notFound();
        },
        list() {
          return routes.map((r) => ({ method: r.method, pattern: r.pattern }));
        },
      };
    }

    export type Router = ReturnType<typeof createRouter>;
  `),

  "src/routes/health.ts": code(`
    import type { Router } from "../router";
    import { json } from "../http";

    export function healthRoutes(router: Router) {
      router.on("GET", "/health", () =>
        json(200, { ok: true, service: "harbor", ts: Date.now() }),
      );
    }
  `),

  "src/routes/users.ts": code(`
    import type { Router } from "../router";
    import { badRequest, json, notFound } from "../http";

    type User = { id: string; name: string; role: "admin" | "member" };

    const users: User[] = [
      { id: "u_1", name: "Ada", role: "admin" },
      { id: "u_2", name: "Linus", role: "member" },
    ];

    export function userRoutes(router: Router) {
      router.on("GET", "/users", () => json(200, { users }));

      router.on("GET", "/users/:id", (_ctx, params) => {
        const user = users.find((u) => u.id === params.id);
        if (!user) return notFound("User not found");
        return json(200, { user });
      });

      router.on("POST", "/users", (ctx) => {
        const body = (ctx.body ?? {}) as Partial<User>;
        if (!body.name) return badRequest("name is required");
        const user: User = {
          id: "u_" + String(users.length + 1),
          name: body.name,
          role: body.role === "admin" ? "admin" : "member",
        };
        users.push(user);
        return json(201, { user });
      });
    }
  `),

  "src/routes/notes.ts": code(`
    import type { Router } from "../router";
    import { badRequest, json, notFound } from "../http";

    type Note = { id: string; title: string; body: string };

    const notes: Note[] = [
      { id: "n_1", title: "Ship Harbor", body: "Keep the router tiny and typed." },
    ];

    export function noteRoutes(router: Router) {
      router.on("GET", "/notes", () => json(200, { notes }));

      router.on("GET", "/notes/:id", (_ctx, params) => {
        const note = notes.find((n) => n.id === params.id);
        if (!note) return notFound("Note not found");
        return json(200, { note });
      });

      router.on("POST", "/notes", (ctx) => {
        const body = (ctx.body ?? {}) as Partial<Note>;
        if (!body.title) return badRequest("title is required");
        const note: Note = {
          id: "n_" + String(notes.length + 1),
          title: body.title,
          body: body.body ?? "",
        };
        notes.push(note);
        return json(201, { note });
      });
    }
  `),

  "tests/router.test.ts": code(`
    import { createRouter } from "../src/router";
    import { json } from "../src/http";

    const router = createRouter();
    router.on("GET", "/ping", () => json(200, { pong: true }));
    router.on("GET", "/items/:id", (_ctx, params) => json(200, { id: params.id }));

    const ping = router.dispatch({ method: "GET", path: "/ping", headers: {} });
    console.assert(ping.status === 200, "ping should be 200");

    const item = router.dispatch({ method: "GET", path: "/items/42", headers: {} });
    console.assert((item.body as { id: string }).id === "42", "params should parse");

    const missing = router.dispatch({ method: "GET", path: "/nope", headers: {} });
    console.assert(missing.status === 404, "unknown routes 404");

    console.log("router.test.ts ok");
  `),

  "public/index.html": code(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Harbor</title>
        <link rel="stylesheet" href="../styles/app.css" />
      </head>
      <body>
        <main>
          <p class="eyebrow">Harbor API</p>
          <h1>A tiny typed router.</h1>
          <p>Try <code>GET /health</code> or ask an agent to add rate limiting.</p>
        </main>
      </body>
    </html>
  `),

  "styles/app.css": code(`
    :root {
      color-scheme: dark;
      font-family: "IBM Plex Sans", system-ui, sans-serif;
      background: #09090b;
      color: #f4f4f5;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
    }

    main {
      max-width: 36rem;
      padding: 2rem;
    }

    .eyebrow {
      letter-spacing: 0.16em;
      text-transform: uppercase;
      font-size: 0.75rem;
      color: #a1a1aa;
    }

    code {
      font-family: "IBM Plex Mono", ui-monospace, monospace;
    }
  `),
};

export const DEFAULT_OPEN = "src/index.ts";
