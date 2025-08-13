# Quick Start Commands

## App (Electron)

- Dev:
```
npm run dev
```

- Live dev (hot rebuild main + vite dev server):
```
npm run dev:live
```

- Build:
```
npm run build
```

- Start built app:
```
npm run start
```

- Package installers:
```
npm run dist
npm run dist:win
```

## MCP Agent (Local)

- Build:
```
npm run agent:build
```

- Start (after build):
```
npm run agent:start
```

- Dev (watch via tsx):
```
npm run agent:dev
```

Client configuration (Cursor `mcp-config.json`):

```json
{
  "mcpServers": {
    "tasky-command": {
      "type": "command",
      "command": "node",
      "args": ["tasky-mcp-agent/dist/mcp-server.js"],
      "cwd": ".",
      "env": {
        "TASKY_DB_PATH": "data/tasky.db"
      },
      "disabled": false
    }
  }
}
```

Important:

- Ensure the Electron app and MCP agent share the same `TASKY_DB_PATH`.
- The Electron app provides an internal HTTP bridge on `localhost:7844` that the agent calls for execution; keep the app running for full functionality.

## MCP Agent (Docker) [optional]

- Rebuild image:
```
npm run agent:docker:rebuild
```

- Up / Down / Logs:
```
npm run agent:docker:up
npm run agent:docker:down
npm run agent:docker:logs
```

Notes:

- Most MCP clients prefer the command/stdio integration shown above. Docker is optional and should not be run at the same time as the local agent.
