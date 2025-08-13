# Tasky MCP Agent – Tools Documentation

This document describes the Model Context Protocol (MCP) tools exposed by the Tasky MCP Agent. These tools operate against the same SQLite database used by the Electron app and optionally call the app’s local HTTP bridge for task execution.

## Overview

- Total tools: 9
  - Task Management (5): create, list, update, delete, execute
  - Reminder Management (4): create, list, update, delete

All tools return JSON results (text parts) and use robust error handling. For best results, keep the Electron app running so task execution can open terminals via the local HTTP bridge on `http://localhost:7844`.

## Environment

- `TASKY_DB_PATH` (required): path to Tasky SQLite DB (e.g., `./data/tasky.db`)
- `TASKY_SQLITE_JOURNAL` (optional): `DELETE` or `WAL`

## Task Management Tools

### 1) tasky_create_task

Create a new Tasky task.

Input:

```json
{
  "title": "string",
  "description": "string?",
  "dueDate": "ISO string?",
  "tags": ["string"]?,
  "affectedFiles": ["string"]?,
  "estimatedDuration": 120?,
  "dependencies": ["string"]?,
  "reminderEnabled": true?,
  "reminderTime": "HH:MM"?,
  "assignedAgent": "claude" | "gemini"?,
  "executionPath": "string"?,
  "random_string": "string? (legacy title fallback)"
}
```

Notes:

- If `title` is missing, `random_string` will be used as the title (legacy support).
- The agent writes to SQLite and notifies the app (`/notify-task-created`) to show a bubble.

Returns: summary text and a JSON task object.

### 2) tasky_list_tasks

List tasks with optional filtering.

Input:

```json
{
  "status": "pending" | "in_progress" | "completed" | "cancelled"?,
  "tag": "string"?,
  "limit": 50?
}
```

Returns: summary text and a JSON array of tasks (sorted by due date then creation time).

### 3) tasky_update_task

Update an existing task.

Input:

```json
{
  "id": "string",
  "title": "string?",
  "description": "string?",
  "status": "pending" | "in_progress" | "completed" | "cancelled"?,
  "dueDate": "ISO string?",
  "tags": ["string"]?,
  "affectedFiles": ["string"]?,
  "estimatedDuration": 120?,
  "dependencies": ["string"]?,
  "reminderEnabled": true?,
  "reminderTime": "HH:MM"?,
  "assignedAgent": "claude" | "gemini"?,
  "executionPath": "string"?
}
```

Notes:

- Partial updates supported. Dates are stored as ISO strings.

Returns: summary text and the updated JSON task object.

### 4) tasky_delete_task

Delete a task by ID.

Input:

```json
{ "id": "string" }
```

Returns: `{ "success": true }` on success.

### 5) tasky_execute_task

Start or complete execution of a task.

Input:

```json
{ "id": "string", "status": "IN_PROGRESS" | "COMPLETED" }
```

Behavior:

- Attempts to POST to the app at `http://localhost:7844/execute-task` which opens a terminal and runs the selected external agent.
- If the app is not running, falls back to a status update only and returns a note.

Returns: summary text and a JSON object including `{ performed, provider, taskId }` when the app handled execution.

## Reminder Management Tools

### 6) tasky_create_reminder

Create a reminder.

Input:

```json
{
  "message": "string",
  "time": "HH:MM" | "in 5 minutes" | "3 hours from now",
  "days": ["monday".."sunday"],
  "enabled": true?,
  "oneTime": false?
}
```

Notes:

- Relative expressions (e.g., "in 10 minutes") are parsed into an HH:MM time and forced to one‑time.
- The agent notifies the app (`/notify-reminder-created`) so a creation bubble can be shown.

Returns: `{ "success": true }` on success.

### 7) tasky_list_reminders

List reminders.

Input:

```json
{ "enabled": true? }
```

Returns: summary text and a JSON array of reminders.

### 8) tasky_update_reminder

Update a reminder.

Input:

```json
{
  "id": "string",
  "message": "string?",
  "time": "HH:MM"?,
  "days": ["monday".."sunday"]?,
  "enabled": true?
}
```

Returns: the updated reminder as JSON.

### 9) tasky_delete_reminder

Delete a reminder by ID.

Input:

```json
{ "id": "string" }
```

Returns: `{ "success": true }` on success.

## Storage and Execution

- Backend: SQLite via `better-sqlite3`, shared with the Electron app (`TASKY_DB_PATH`).
- Execution: The Electron app opens terminals and runs external CLIs (Claude/Gemini). The MCP agent calls the app’s HTTP bridge to trigger this.

## MCP Client Configuration (example)

```json
{
  "mcpServers": {
    "tasky-command": {
      "type": "command",
      "command": "node",
      "args": ["tasky-mcp-agent/dist/mcp-server.js"],
      "cwd": ".",
      "env": { "TASKY_DB_PATH": "data/tasky.db" },
      "disabled": false
    }
  }
}
```

## Examples

Create a task:

```javascript
await mcpClient.call('tasky_create_task', {
  title: 'Refactor scheduler',
  assignedAgent: 'claude',
  affectedFiles: ['src/electron/scheduler.ts']
});
```

Execute a task:

```javascript
await mcpClient.call('tasky_execute_task', { id: 'task_id', status: 'IN_PROGRESS' });
```

Create a one‑time reminder in 15 minutes:

```javascript
await mcpClient.call('tasky_create_reminder', {
  message: 'Standup in 15 minutes',
  time: 'in 15 minutes',
  days: ['monday']
});
```

## Notes and Caveats

- Keep the Electron app running to enable full task execution. Without it, `tasky_execute_task` will only update status.
- Ensure both processes reference the same `TASKY_DB_PATH`.
