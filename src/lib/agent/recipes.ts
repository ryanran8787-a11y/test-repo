export type Recipe = {
  id: string;
  prompt: string;
  steps: Array<{ tool: "read_file" | "write_file" | "list_files" | "run_tests"; args: Record<string, string>; note: string }>;
};

const STATS_FILE = `import type { Router } from "../router";
import { json } from "../http";

export function statsRoutes(router: Router) {
  router.on("GET", "/stats", () => {
    const routes = router.list();
    return json(200, {
      routeCount: routes.length,
      routes,
    });
  });
}
`;

const LOGGER_FILE = `import type { RequestCtx, ResponseBody } from "./types";

export function withLogging(
  handler: (ctx: RequestCtx) => ResponseBody,
): (ctx: RequestCtx) => ResponseBody {
  return (ctx) => {
    const started = Date.now();
    const result = handler(ctx);
    console.log(ctx.method, ctx.path, result.status, Date.now() - started + "ms");
    return result;
  };
}
`;

const RATE_LIMIT_FILE = `const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}
`;

export const RECIPES: Recipe[] = [
  {
    id: "logging",
    prompt: "Add request logging middleware to the Harbor router",
    steps: [
      { tool: "list_files", args: {}, note: "Survey the workspace" },
      { tool: "read_file", args: { path: "src/index.ts" }, note: "Read the entrypoint" },
      { tool: "write_file", args: { path: "src/logger.ts", contents: LOGGER_FILE }, note: "Add withLogging()" },
      {
        tool: "write_file",
        args: {
          path: "src/index.ts",
          contents: `import { createRouter } from "./router";
import { healthRoutes } from "./routes/health";
import { userRoutes } from "./routes/users";
import { noteRoutes } from "./routes/notes";
import { withLogging } from "./logger";
import type { RequestCtx } from "./types";

const router = createRouter();
healthRoutes(router);
userRoutes(router);
noteRoutes(router);

export function handle(ctx: RequestCtx) {
  return withLogging((request) => router.dispatch(request))(ctx);
}

const sample = handle({
  method: "GET",
  path: "/health",
  headers: {},
});

console.log(JSON.stringify(sample));
`,
        },
        note: "Wrap dispatch with logging",
      },
    ],
  },
  {
    id: "stats",
    prompt: "Create GET /stats that returns route counts",
    steps: [
      { tool: "list_files", args: {}, note: "Survey the workspace" },
      { tool: "read_file", args: { path: "src/router.ts" }, note: "Confirm router.list() exists" },
      { tool: "write_file", args: { path: "src/routes/stats.ts", contents: STATS_FILE }, note: "Add stats handler" },
      {
        tool: "write_file",
        args: {
          path: "src/index.ts",
          contents: `import { createRouter } from "./router";
import { healthRoutes } from "./routes/health";
import { userRoutes } from "./routes/users";
import { noteRoutes } from "./routes/notes";
import { statsRoutes } from "./routes/stats";
import type { RequestCtx } from "./types";

const router = createRouter();
healthRoutes(router);
userRoutes(router);
noteRoutes(router);
statsRoutes(router);

export function handle(ctx: RequestCtx) {
  return router.dispatch(ctx);
}

const sample = handle({
  method: "GET",
  path: "/stats",
  headers: {},
});

console.log(JSON.stringify(sample));
`,
        },
        note: "Register statsRoutes",
      },
    ],
  },
  {
    id: "users-tests",
    prompt: "Write tests for POST /users validation",
    steps: [
      { tool: "read_file", args: { path: "src/routes/users.ts" }, note: "Read the users handler" },
      { tool: "read_file", args: { path: "tests/router.test.ts" }, note: "Read existing tests" },
      {
        tool: "write_file",
        args: {
          path: "tests/users.test.ts",
          contents: `import { createRouter } from "../src/router";
import { userRoutes } from "../src/routes/users";

const router = createRouter();
userRoutes(router);

const missing = router.dispatch({ method: "POST", path: "/users", headers: {}, body: {} });
console.assert(missing.status === 400, "name is required");

const created = router.dispatch({
  method: "POST",
  path: "/users",
  headers: {},
  body: { name: "Grace" },
});
console.assert(created.status === 201, "creates a member");

console.log("users.test.ts ok");
`,
        },
        note: "Add POST /users tests",
      },
      { tool: "run_tests", args: { path: "tests/users.test.ts" }, note: "Run the new users tests" },
    ],
  },
  {
    id: "rate-limit",
    prompt: "Add a rate-limit helper and apply it to POST routes",
    steps: [
      { tool: "read_file", args: { path: "src/routes/users.ts" }, note: "Read POST /users" },
      { tool: "write_file", args: { path: "src/rate-limit.ts", contents: RATE_LIMIT_FILE }, note: "Add rateLimit()" },
      {
        tool: "write_file",
        args: {
          path: "src/routes/users.ts",
          contents: `import type { Router } from "../router";
import { badRequest, json, notFound } from "../http";
import { rateLimit } from "../rate-limit";

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
    if (!rateLimit("post:/users")) {
      return json(429, { error: "Too many requests" });
    }
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
`,
        },
        note: "Guard POST /users",
      },
    ],
  },
  {
    id: "run-tests",
    prompt: "Run the Harbor test suite",
    steps: [{ tool: "run_tests", args: {}, note: "Execute tests against the current workspace" }],
  },
];

export function matchRecipe(prompt: string): Recipe | null {
  const n = prompt.trim().toLowerCase();
  return RECIPES.find((r) => r.prompt.toLowerCase() === n) ?? null;
}
