# Cursor MCP Configuration Guide

## Setting up Looper CLI MCP in Cursor

### Method 1: Through Cursor Settings

1. Open Cursor Settings (Cmd/Ctrl + ,)
2. Search for "MCP" or "Model Context Protocol"
3. Add a new MCP server with these details:
   - **Name**: looper-cli
   - **Command**: node
   - **Arguments**: ["C:/Users/trave/Desktop/Open Code Mission/Looper_CLI/looper-mcp-agent/dist/index.js"]
   - **Working Directory**: C:/Users/trave/Desktop/Open Code Mission/Looper_CLI
   - **Environment Variables**:
     - NODE_ENV: production
     - MCP_VERSION: 1.1

### Method 2: Using mcp-config.json

Place the `mcp-config.json` file in one of these locations:
- Windows: `%APPDATA%\Cursor\User\mcp-config.json`
- macOS: `~/Library/Application Support/Cursor/User/mcp-config.json`
- Linux: `~/.config/Cursor/User/mcp-config.json`

### Verifying the Setup

1. Restart Cursor completely (not just reload window)
2. Open a new chat
3. The MCP tools should appear in the available tools list
4. Test with: "Use the looper MCP to list tasks"

### Available MCP Tools

- `looper_create_task`: Create a new task
- `looper_list_tasks`: List tasks with optional filtering
- `looper_get_task`: Get a specific task by ID
- `looper_update_task`: Update an existing task
- `looper_delete_task`: Delete a task
- `looper_run_next_task`: Execute the next pending task using Claude

### Troubleshooting

If tools don't appear:
1. Check Cursor's Developer Tools (Help > Toggle Developer Tools) for MCP errors
2. Ensure the MCP agent builds successfully: `cd looper-mcp-agent && npm run build`
3. Test the server directly: `node looper-mcp-agent/dist/index.js`
4. Check file paths are absolute and correct in the configuration

## Workspace-Specific Configuration

For project-specific MCP agents, create a `.cursor/settings.json` in your project root:

```json
{
  "mcp.servers": {
    "looper-cli": {
      "command": "node",
      "args": ["./looper-mcp-agent/dist/index.js"],
      "cwd": ".",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Multi-Project Setup

Configure different projects with their own MCP agents:

```json
{
  "mcp.servers": {
    "looper-cli-main": {
      "command": "node",
      "args": ["C:/path/to/looper-mcp-agent/dist/index.js"],
      "cwd": "C:/path/to/main-project"
    },
    "looper-cli-secondary": {
      "command": "node",
      "args": ["C:/path/to/looper-mcp-agent/dist/index.js"],
      "cwd": "C:/path/to/secondary-project"
    }
  }
}
```

## Cursor-Specific Features

### AI Chat Integration

Once configured, you can use the Looper CLI tools directly in Cursor's AI chat:

```
@looper-cli Create a new task to refactor the authentication module
```

### Composer Integration

Use MCP tools within Cursor Composer for advanced workflows:

```
Use the looper_analyze_repository tool to understand this codebase, then create appropriate tasks for the next sprint
```

### Command Palette

Access MCP tools through Cursor's command palette:
- `Ctrl/Cmd + Shift + P`
- Type "MCP: Looper CLI"
- Select the tool you want to use

## Verification Steps

1. **Restart Cursor** completely after configuration
2. **Open your project** in Cursor
3. **Open AI Chat** (`Ctrl/Cmd + L`)
4. **Test the connection**:

```
What Looper CLI tools are available?
```

You should see all 12 tools listed:
- looper_create_task
- looper_list_tasks
- looper_analyze_repository
- etc.

## Cursor-Specific Usage Examples

### In AI Chat
```
Analyze this repository and create tasks for improving code quality
```

### In Composer
```
Use looper_get_project_structure to understand the codebase, then create a comprehensive task list for adding TypeScript support
```

### With File Context
```
Looking at this file, create a task to add proper error handling using looper_create_task
```

## Troubleshooting

### MCP Server Not Found
- Check that the path in `args` is correct
- Ensure the MCP agent is built (`npm run build`)
- Verify Node.js is accessible from Cursor

### Permission Issues
- Ensure Cursor has access to the project directory
- Check file permissions on the MCP agent

### Tools Not Appearing
- Restart Cursor completely
- Check the Cursor console for MCP connection errors
- Verify the configuration syntax in settings.json

### Debug Mode
Enable debug logging in your configuration:

```json
{
  "mcp.servers": {
    "looper-cli": {
      "command": "node",
      "args": ["./looper-mcp-agent/dist/index.js"],
      "cwd": ".",
      "env": {
        "DEBUG": "looper-mcp-agent",
        "NODE_ENV": "development"
      }
    }
  },
  "mcp.debug": true
}
```

## Advanced Cursor Workflows

### Code Generation with Context
```
Use looper_analyze_repository to understand the project structure, then generate a new API endpoint following the existing patterns
```

### Automated Task Management
```
Review all pending tasks with looper_list_tasks and suggest which ones should be prioritized for this sprint
```

### Repository Insights
```
Use looper_get_statistics and looper_get_project_structure to give me a comprehensive project health report
```

## Benefits in Cursor

- **Seamless Integration** - MCP tools work directly in AI chat and Composer
- **Context Awareness** - AI understands your project structure through MCP tools
- **Workflow Automation** - Combine code editing with task management
- **Real-time Sync** - Changes sync between Cursor, CLI, and TUI interfaces

The Looper CLI MCP agent is now perfectly integrated with your Cursor IDE workflow! 🚀 