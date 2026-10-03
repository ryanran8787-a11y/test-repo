export type AgentStatus = "idle" | "queued" | "planning" | "running" | "reviewing" | "done" | "error" | "stopped";

export type ToolName = "list_files" | "read_file" | "write_file" | "search_code" | "run_terminal" | "run_tests";

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ToolCall = {
  id: string;
  name: ToolName | string;
  arguments: string;
};

export type ChangeStatus = "pending" | "accepted" | "rejected";

export type FileChange = {
  path: string;
  before: string;
  after: string;
  status: ChangeStatus;
};

export type WorkspaceCheckpoint = {
  files: Record<string, string>;
  createdAt: number;
};

export type AgentMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolCallId?: string;
  toolName?: string;
  toolCalls?: ToolCall[];
  changes?: FileChange[];
};

export type AgentSession = {
  id: string;
  title: string;
  status: AgentStatus;
  createdAt: number;
  updatedAt: number;
  messages: AgentMessage[];
  changes: FileChange[];
  checkpoint: WorkspaceCheckpoint | null;
  error?: string;
};

export type ChatPayloadMessage = {
  role: ChatRole;
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};
