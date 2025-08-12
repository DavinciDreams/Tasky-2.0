# Tasky MCP Agent

Model Context Protocol (MCP) agent for Tasky task and reminder management.

## 🚀 Features

**Task Management:**
- `tasky_create_task` - Create new tasks with full metadata
- `tasky_list_tasks` - List and filter tasks
- `tasky_update_task` - Modify existing tasks
- `tasky_delete_task` - Remove tasks
- `tasky_execute_task` - Execute tasks (opens terminals, runs AI agents)

**Reminder Management:**
- `tasky_create_reminder` - Create scheduled reminders
- `tasky_list_reminders` - List and filter reminders
- `tasky_update_reminder` - Modify existing reminders
- `tasky_delete_reminder` - Remove reminders

## 🔧 How It Works

The MCP agent connects to the main Tasky application via:
1. **Shared SQLite Database** - For data operations (CRUD)
2. **HTTP API** - For task execution (opens terminals, runs Claude CLI)

When you execute tasks through MCP, it works exactly like clicking "Execute" in the Tasky app:
- Simple tasks (folder creation) execute immediately
- Complex tasks open terminals with AI agent payloads
- System notifications and TTS announcements
- Automatic completion tracking via sentinel files

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


