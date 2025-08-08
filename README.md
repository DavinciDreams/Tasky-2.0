<p align="center">
  <img src="./tasky-banner.png" alt="Tasky 2.0 Banner" width="800" />
</p>

Tasky 2.0 – Task Management (Electron)

## Overview

Tasky 2.0 is a cross‑platform desktop task manager built with Electron + React. It supports quick task creation, reminders/notifications, analytics, and optional MCP (Model Context Protocol) integration so external LLM tools can create and manage tasks.
## Key features

- Lightweight task management with tags, files, dependencies, and due dates
- Desktop notifications (15 minutes before due)
- Optional execution via “agents” (Gemini or Claude) that open a terminal with a structured prompt
- MCP server for creating/updating/listing tasks from compatible clients
- Import/export helpers and basic analytics

## Project structure (high‑level)

- `src/components` – React UI (including `tasks/TaskForm.tsx`)
- `src/core/task-manager` – Engine (`TaskyEngine`) and JSON storage (`TaskStorage`)
- `src/electron` – Main-process IPC handlers and executor (`agent-executor.ts`)
- `tasky-mcp-agent` – MCP server for external tool integration
- `src/assets` – App assets and sample development tasks

## Task schema (app‑level)

Dates are real `Date` objects in the app. They are persisted as ISO strings in storage.

Schema highlights:

- `TaskyTask.schema`:
  - `id: string`
  - `title: string`
  - `description?: string`
  - `dueDate?: Date`
  - `createdAt: Date`
  - `updatedAt?: Date`
  - `tags?: string[]`
  - `affectedFiles?: string[]`
  - `estimatedDuration?: number`
  - `dependencies?: string[]`
  - `assignedAgent?: 'gemini' | 'claude'` (string)
  - `executionPath?: string`
- Top‑level:
  - `status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW' | 'ARCHIVED'`
  - `humanApproved: boolean`
  - `result?: string`
  - `completedAt?: Date`
  - `reminderEnabled?: boolean`
  - `reminderTime?: string`
  - `metadata?: { version: number; createdBy: string; lastModified: Date; archivedAt?: Date }`

Note: The legacy `notes` field has been removed.

## Creating tasks

### 1) UI (recommended)

- Use the “Create New Dev Task” form in the app (`TaskForm.tsx`).
- Choose an agent from `['gemini','claude']` (optional).
- On submit, the renderer calls IPC `task:create` with `CreateTaskInput`.

### 2) Programmatic (IPC)

- From renderer code: `window.electronAPI.invoke('task:create', createTaskInput)`
- `TaskyEngine.createTask` validates and persists via `TaskStorage`.

### 3) MCP tools

- Start the MCP server and call the `tasky_create_task` tool.
- Accepts JSON fields analogous to `CreateTaskInput`; ISO date strings are converted to `Date` internally.
- Configure via `mcp-config.json` (see below).

### 4) Import (bulk)

- Preferred: map flat JSON rows to `CreateTaskInput` and call `task:create` per row.
- Or use `task:import` with nested objects shaped like `TaskyTask` (containing a `schema` object).

## Executing tasks (agents)

Trigger execution:

- IPC: `window.electronAPI.invoke('task:execute', id, { agent?: 'claude' | 'gemini' })`
- If no agent is passed, the app uses `schema.assignedAgent === 'claude' ? 'claude' : 'gemini'`.

What happens:

- `AgentTerminalExecutor` builds a prompt from the task details (title, description, tags, affected files, due date, status).
- It sets the working directory to `schema.executionPath` (resolved from project root if relative).
- It opens a terminal and pipes the prompt into the selected CLI:
  - Gemini: `gemini --stdin`
  - Claude: `claude --dangerously-skip-permissions`
  - Windows uses Windows Terminal/PowerShell/WSL; macOS/Linux use Terminal/Bash.

## Notifications

- If a task has `dueDate` and `reminderEnabled` (default true), the app schedules a desktop notification 15 minutes before due time.

## MCP integration

- Config: `mcp-config.json`

```json
{
  "mcpServers": {
    "tasky": {
      "command": "node",
      "args": ["./tasky-mcp-agent/dist/index.js"],
      "cwd": ".",
      "env": {
        "NODE_ENV": "production",
        "TASKY_TASKS_PATH": "./data/tasky-tasks.json",
        "TASKY_CONFIG_PATH": "./data/tasky-config-v2.json"
      }
    }
  }
}
```

- Important: Ensure the Electron app uses the same `TASKY_TASKS_PATH` so both see the same tasks.
- MCP tools available: create, update, delete, get, list; reminders CRUD; execute via status update (optional), but for full execution use the app’s IPC `task:execute`.

## Storage

- Default path (Electron): `${app.getPath('userData')}/tasky-tasks.json`
- Override via `TASKY_TASKS_PATH` env var (absolute or relative to CWD), which MCP also uses.
- Dates are serialized to ISO in the JSON file and rehydrated to `Date` objects on load.

## Development

Prerequisites:

- Node 18+
- Electron (installed via devDependencies)

Scripts:

- `npm run dev` – build electron bundle then launch app
- `npm run start` – clean, build renderer and electron, start app
- `npm run build` – clean and build
- `npm run dist` – build and package for all platforms (uses electron-builder)
- `npm run dist:mac|dist:win|dist:linux` – platform specific

MCP agent (inside `tasky-mcp-agent`):

- `npm run build` – compile to `dist`
- `npm start` – run MCP server (after build)

## Troubleshooting

- Terminal doesn’t open on execute: ensure Gemini/Claude CLIs are installed and on PATH.
- MCP tasks not visible in app: verify both processes point to the same `TASKY_TASKS_PATH`.
- Dates display incorrectly: confirm your local timezone; storage persists ISO strings and the app rehydrates to `Date`.

## License

MIT


