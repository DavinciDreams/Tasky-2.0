# Tasky Chat State Management Diagrams

This page provides end-to-end diagrams of how chat state flows through the Renderer (React), Electron (preload/main), AI provider, and the MCP server. Each diagram includes a brief note on where key state mutations occur.

## System Overview

```mermaid
flowchart LR
    subgraph Renderer["Renderer React + TS"]
        UI["Chat UI Components - ChatModule, MessageContainer, Composer, AdaptiveCardRenderer, InlineConfirmation"]
        Hooks["Hooks - useChatPersistence, useMcpTools, useScroll"]
        AI["AIService - streamText and generateText"]
        Tool["mcpCall tool - normalize confirm emit events"]
    end

    subgraph Electron["Electron"]
        Preload["preload.ts - window.electronAPI"]
        Main["main.ts - IPC handlers and notifications"]
    end

    subgraph MCP["MCP Server"]
        McpTools["tasky-mcp-agent tools for tasks and reminders"]
        DB["SQLite better-sqlite3"]
    end

    subgraph Providers["AI Providers"]
        Google["Google Generative AI - tools enabled"]
        LMStudio["OpenAI compatible LM Studio - no tools"]
    end

    User((User)) -->|Types prompt| UI
    UI -->|builds request| AI
    AI -->|stream + tool hooks| Tool
    Tool -->|UI events + confirm| UI

    UI --> Preload
    Preload -->|IPC mcp:tools/call| Main
    Main -->|stdio| McpTools
    McpTools --> DB
    McpTools -->|CallToolResult| Main
    Main -->|IPC result| Preload
    Preload --> UI
    Main -->|OS notification + refresh events| UI

    AI -. model call .-> Google
    AI -. optional .-> LMStudio
```

Notes:
- State mutates primarily in `ChatModule` (messages/timeline), `useChatPersistence` (load/save), and `useMcpTools` (tool event bus, snapshots, confirmations).
- Side-effects: Electron `main.ts` emits notifications and UI refresh events after CRUD tools.

## Chat Send + Tool Sequence

```mermaid
sequenceDiagram
    actor U as User
    participant C as ChatModule (Renderer)
    participant MC as useMcpTools/EventBus
    participant AI as AIService
    participant T as mcpCall (Renderer)
    participant P as preload.ts
    participant M as main.ts
    participant S as MCP Server
    participant D as SQLite

    U->>C: Submit prompt
    C->>C: Append user message and persist
    C->>AI: Call streamText with tools
    AI-->>C: Assistant token stream
    AI-->>T: Tool invocation if model emits
    T->>MC: Emit tool started and snapshot draft
    T->>P: Call electronAPI mcpToolsCall
    P->>M: IPC call mcp tools call
    M->>S: Forward via stdio
    S->>D: Read and write as needed
    D-->>S: Return result rows and ids
    S-->>M: Return tool call result
    M-->>P: IPC result and side effects
    P-->>T: Tool result
    T->>MC: Emit tool result and finalize snapshot
    T-->>AI: Return tool result to model
    AI-->>C: Final assistant text
    C->>C: Persist assistant and snapshots then scroll
```

Key state writes:
- Append/persist messages at send-time and when assistant/tool results arrive.
- Tool snapshots embedded in assistant messages for AdaptiveCardRenderer.

## Confirmation State Machine (Tools)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> PendingConfirm: Tool requires confirmation
    Idle --> AutoAccepted: Read-only tool auto-accept
    PendingConfirm --> Accepted: User confirms
    PendingConfirm --> Rejected: User cancels/edits
    Accepted --> [*]
    Rejected --> [*]
    AutoAccepted --> [*]

    note right of PendingConfirm
      InlineConfirmation renders with context
      EventBus awaits decision
    end note
```

Where:
- Transition guards live in `mcp-tools.ts` (read-only auto-accept rules).
- UI for `PendingConfirm` is `InlineConfirmation` within the message context.

## Persistence Flow

```mermaid
flowchart TD
    Start>App Load] --> Load[useChatPersistence.loadHistory]
    Load --> Render[Render timeline]
    Render -->|User sends| CreateMsg[Append user msg]
    CreateMsg --> Save1[Persist user msg]
    Save1 --> AIStream[AI streaming begins]
    AIStream -->|tool result| Save2[Persist tool snapshot]
    AIStream -->|final text| Save3[Persist assistant msg]
    Save3 --> End[Scroll + idle]
```

Notes:
- Persistence API exposed via `preload.ts` and handled in `main.ts` (chat CRUD).
- Renderer holds the in-memory timeline; DB is source of truth across sessions.

## MCP Call Across Processes

```mermaid
sequenceDiagram
    participant R as Renderer mcpCall
    participant P as Preload electronAPI
    participant M as Main IPC
    participant X as MCP Server stdio

    R->>P: Call mcpToolsCall with tool name and args
    P->>M: IPC invoke mcp tools call
    M->>X: Send JSON RPC tool call
    X-->>M: Tool call result
    M-->>P: IPC return and side effects
    P-->>R: Result normalized
```

Side-effects from `main.ts` after CRUD tools:
- Emits `tasky:tasks-updated` / `tasky:reminders-updated` events to the renderer.
- Triggers OS notifications via `notification-utility.ts` for creates/updates/deletes.

## Adaptive Card Snapshot Pipeline

```mermaid
flowchart LR
    ToolStart[Tool started] --> Normalize[Normalize result mcp-tools.ts]
    Normalize --> Snapshot[Build snapshot JSON embed in assistant message]
    Snapshot --> Timeline[Message timeline updated]
    Timeline --> Renderer[AdaptiveCardRenderer selects card by tool]
    Renderer --> UI[Visual card list create update delete]
```

Extraction:
- Renderer pulls snapshots from assistant messages when rendering; falls back to raw JSON if unknown tool.

## Error and Retry Paths

```mermaid
sequenceDiagram
    participant C as ChatModule
    participant T as mcpCall
    participant P as Preload
    participant M as Main
    participant S as "MCP Server"

    T->>P: Call mcpToolsCall
    P->>M: IPC
    M->>S: Forward
    alt MCP offline or timeout
        M-->>P: Error
        P-->>T: Error
        T->>C: Emit tool error and render inline error
        C->>C: Allow retry or fallback
    else Validation fails
        S-->>M: Schema error details
        M-->>P: Error
        P-->>T: Error
        T->>C: Present actionable message
    end
```

Guidance:
- Keep tool args minimal and validated before invocation.
- Surface actionable errors in `MessageBubble` with retry affordances.

---

For component and file references, see the companion guide: [docs/chat-ui-cheatsheet.md](./chat-ui-cheatsheet.md).
