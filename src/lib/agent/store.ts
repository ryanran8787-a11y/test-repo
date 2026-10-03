import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentMessage, AgentSession, AgentStatus, ChangeStatus, FileChange, WorkspaceCheckpoint } from "./types";
import { useWorkspace } from "@/lib/workspace/store";

function uid() {
  return `ag_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function changeStatus(change: FileChange): ChangeStatus {
  return change.status ?? "accepted";
}

export function pendingChanges(session: AgentSession): FileChange[] {
  return session.changes.filter((c) => changeStatus(c) === "pending");
}

type AgentState = {
  sessions: AgentSession[];
  activeId: string | null;
  abortById: Record<string, AbortController>;
  createSession: (title?: string) => string;
  selectSession: (id: string | null) => void;
  setStatus: (id: string, status: AgentStatus, error?: string) => void;
  appendMessage: (id: string, message: AgentMessage) => void;
  patchLastAssistant: (id: string, content: string) => void;
  addChange: (id: string, change: FileChange) => void;
  setCheckpoint: (id: string, checkpoint: WorkspaceCheckpoint) => void;
  reviewChange: (id: string, path: string, status: Exclude<ChangeStatus, "pending">) => void;
  reviewAll: (id: string, status: Exclude<ChangeStatus, "pending">) => void;
  restoreCheckpoint: (id: string) => void;
  finishIfReviewed: (id: string) => void;
  registerAbort: (id: string, controller: AbortController) => void;
  stopSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
};

function applyReject(change: FileChange) {
  const ws = useWorkspace.getState();
  if (!change.before) ws.deletePath(change.path);
  else ws.writeFile(change.path, change.before, false);
}

export const useAgents = create<AgentState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeId: null,
      abortById: {},
      createSession: (title) => {
        const id = uid();
        const session: AgentSession = {
          id,
          title: title?.trim() || "New agent",
          status: "idle",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          changes: [],
          checkpoint: null,
        };
        set({ sessions: [session, ...get().sessions], activeId: id });
        return id;
      },
      selectSession: (id) => set({ activeId: id }),
      setStatus: (id, status, error) => {
        set({
          sessions: get().sessions.map((s) =>
            s.id === id ? { ...s, status, error, updatedAt: Date.now() } : s,
          ),
        });
      },
      appendMessage: (id, message) => {
        set({
          sessions: get().sessions.map((s) =>
            s.id === id
              ? { ...s, messages: [...s.messages, message], updatedAt: Date.now() }
              : s,
          ),
        });
      },
      patchLastAssistant: (id, content) => {
        set({
          sessions: get().sessions.map((s) => {
            if (s.id !== id) return s;
            const messages = [...s.messages];
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i]?.role === "assistant") {
                messages[i] = { ...messages[i]!, content };
                break;
              }
            }
            return { ...s, messages, updatedAt: Date.now() };
          }),
        });
      },
      addChange: (id, change) => {
        set({
          sessions: get().sessions.map((s) => {
            if (s.id !== id) return s;
            const existing = s.changes.find((c) => c.path === change.path);
            const merged: FileChange = {
              path: change.path,
              before: existing?.before ?? change.before,
              after: change.after,
              status: "pending",
            };
            return {
              ...s,
              changes: [...s.changes.filter((c) => c.path !== change.path), merged],
              updatedAt: Date.now(),
            };
          }),
        });
      },
      setCheckpoint: (id, checkpoint) => {
        set({
          sessions: get().sessions.map((s) => (s.id === id && !s.checkpoint ? { ...s, checkpoint } : s)),
        });
      },
      reviewChange: (id, path, status) => {
        const session = get().sessions.find((s) => s.id === id);
        const change = session?.changes.find((c) => c.path === path);
        if (!change || changeStatus(change) !== "pending") return;
        if (status === "rejected") applyReject(change);
        set({
          sessions: get().sessions.map((s) => {
            if (s.id !== id) return s;
            const changes = s.changes.map((c) => (c.path === path ? { ...c, status } : c));
            const stillPending = changes.some((c) => changeStatus(c) === "pending");
            return {
              ...s,
              changes,
              status: stillPending ? "reviewing" : "done",
              updatedAt: Date.now(),
            };
          }),
        });
      },
      reviewAll: (id, status) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session) return;
        if (status === "rejected") {
          for (const change of session.changes) {
            if (changeStatus(change) === "pending") applyReject(change);
          }
        }
        set({
          sessions: get().sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  changes: s.changes.map((c) =>
                    changeStatus(c) === "pending" ? { ...c, status } : c,
                  ),
                  status: "done",
                  updatedAt: Date.now(),
                }
              : s,
          ),
        });
      },
      restoreCheckpoint: (id) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session?.checkpoint) return;
        useWorkspace.getState().replaceFiles(session.checkpoint.files);
        set({
          sessions: get().sessions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  changes: s.changes.map((c) => ({ ...c, status: "rejected" as const })),
                  status: "stopped",
                  updatedAt: Date.now(),
                }
              : s,
          ),
        });
      },
      finishIfReviewed: (id) => {
        const session = get().sessions.find((s) => s.id === id);
        if (!session) return;
        const pending = pendingChanges(session).length;
        get().setStatus(id, pending ? "reviewing" : "done");
      },
      registerAbort: (id, controller) => {
        set({ abortById: { ...get().abortById, [id]: controller } });
      },
      stopSession: (id) => {
        get().abortById[id]?.abort();
        const next = { ...get().abortById };
        delete next[id];
        const session = get().sessions.find((s) => s.id === id);
        const pending = session ? pendingChanges(session).length : 0;
        set({
          abortById: next,
          sessions: get().sessions.map((s) =>
            s.id === id && (s.status === "running" || s.status === "planning" || s.status === "queued")
              ? { ...s, status: pending ? "reviewing" : "stopped", updatedAt: Date.now() }
              : s,
          ),
        });
      },
      deleteSession: (id) => {
        get().abortById[id]?.abort();
        const sessions = get().sessions.filter((s) => s.id !== id);
        set({
          sessions,
          activeId: get().activeId === id ? (sessions[0]?.id ?? null) : get().activeId,
        });
      },
      renameSession: (id, title) => {
        set({
          sessions: get().sessions.map((s) => (s.id === id ? { ...s, title } : s)),
        });
      },
    }),
    {
      name: "forge-agents-v1",
      partialize: (s) => ({
        sessions: s.sessions.map((sess) => ({
          ...sess,
          status:
            sess.status === "running" || sess.status === "planning" || sess.status === "queued"
              ? pendingChanges(sess).length
                ? "reviewing"
                : "stopped"
              : sess.status,
        })),
        activeId: s.activeId,
      }),
    },
  ),
);
