# Tasky MCP Agent

Exposes Tasky task and reminder management over the Model Context Protocol (MCP).

## Tools

Tasks
- tasky_create_task
- tasky_update_task
- tasky_delete_task
- tasky_list_tasks
- tasky_execute_task

Reminders
- tasky_create_reminder
- tasky_update_reminder
- tasky_delete_reminder
- tasky_get_reminder
- tasky_list_reminders
- tasky_toggle_reminder

## Configure (Cursor MCP)

Example `%APPDATA%/Cursor/User/mcp-config.json` on Windows:

```json
{
  "mcpServers": {
    "tasky": {
      "command": "node",
      "args": ["C:/Users/trave/Desktop/Programs/Tasky 2.0/Agent/tasky-mcp-agent/dist/index.js"],
      "cwd": "C:/Users/trave/Desktop/Programs/Tasky 2.0",
      "env": {
        "TASKY_DB_PATH": "C:/Users/trave/Desktop/Programs/Tasky 2.0/data/tasky.db"
      }
    }
  }
}
```

Build and run:

```bash
cd Agent/tasky-mcp-agent
npm install
npm run build
npm start
```


