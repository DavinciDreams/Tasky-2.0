# Quick Start Commands

## App (Electron)
- Dev:
```
npm run dev
```
- Live dev:
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
- Package:
```
npm run dist
npm run dist:win
```

## MCP Agent (Docker)
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

## MCP Agent (Local) [optional]
- Dev:
```
npm run agent:dev
```
- Build + Start:
```
npm run agent:build
npm run agent:start
```

## Diagnostics
- Health:
```
npm run agent:health
```
- Tools list:
```
npm run agent:tools
```
- End-to-end test:
```
npm run test:mcp:e2e
```

Notes:
- MCP (Docker) at http://localhost:7843/mcp (container listens 7842).
- Do not run Docker and local agent on the same port simultaneously.
