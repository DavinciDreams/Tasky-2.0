# Tasky MCP Agent

MCP server that exposes Tasky’s task and reminder tools to compatible clients (e.g., Cursor). It shares the same SQLite database as the Electron app and optionally calls the app’s local HTTP bridge for task execution.

## Features

- **Tasks**: create, list/filter, update, delete, execute (`tasky_*` tools)
- **Reminders**: create, list/filter, update, delete (`tasky_*_reminder` tools)
- **Execution**: calls `http://localhost:7844/execute-task` when the Tasky app is running; otherwise falls back to status updates

## Install

```bash
cd tasky-mcp-agent
npm install
npm run build
npm start
```

Requires Node 18+. Set `TASKY_DB_PATH` to the same DB file used by the app (default `../data/tasky.db`).

## Configure (Cursor MCP)

Add to your MCP client config (e.g., Cursor `mcp-config.json`):

```json
{
  "mcpServers": {
    "tasky": {
      "command": "node",
      "args": ["./tasky-mcp-agent/dist/mcp-server.js"],
      "cwd": ".",
      "env": {
        "TASKY_DB_PATH": "./data/tasky.db"
      }
    }
  }
}
```

Windows example (absolute paths):

```json
{
  "mcpServers": {
    "tasky": {
      "command": "node",
      "args": ["C:/Users/<you>/Desktop/Programs/Tasky 2.0/tasky-mcp-agent/dist/mcp-server.js"],
      "cwd": "C:/Users/<you>/Desktop/Programs/Tasky 2.0",
      "env": {
        "TASKY_DB_PATH": "C:/Users/<you>/Desktop/Programs/Tasky 2.0/data/tasky.db"
      }
    }
  }
}
```

## Tools

Tasks:

- `tasky_create_task` – title, description, dueDate (ISO), tags, affectedFiles, estimatedDuration, dependencies, reminderEnabled, reminderTime, assignedAgent (`claude|gemini`), executionPath
- `tasky_list_tasks` – optional filters: status, tag, limit
- `tasky_update_task` – id + any updatable field
- `tasky_delete_task` – id
- `tasky_execute_task` – id, optional status (`IN_PROGRESS|COMPLETED`)

Reminders:

- `tasky_create_reminder` – message, time (`HH:MM` or natural language like "in 5 minutes"), days (`monday..sunday`), enabled, oneTime
- `tasky_list_reminders` – optional enabled filter
- `tasky_update_reminder` – id + updates
- `tasky_delete_reminder` – id

## How it works

- CRUD is done directly against SQLite using `better-sqlite3`
- On create, the agent calls the app’s local HTTP endpoints to show a bubble (`/notify-task-created`, `/notify-reminder-created`)
- For execution, the agent POSTs `/execute-task` so the app opens a terminal and runs the selected agent
- If the app isn’t running, execution falls back to updating status only

## Environment

- `TASKY_DB_PATH` (required) – same value as the Electron app (e.g., `./data/tasky.db`)
- `TASKY_SQLITE_JOURNAL` (`DELETE`|`WAL`, optional) – journal mode; `WAL` can reduce lock contention

## Troubleshooting

- Tools visible but execution fails: ensure the Electron app is running and listening on `http://localhost:7844`
- MCP creates tasks but the app doesn’t show toasts: verify `/notify-task-created` requests reach the app (firewall, port)
- “database is locked”: try `TASKY_SQLITE_JOURNAL=WAL` and keep the `*.db-wal`/`*.db-shm` files with the DB

