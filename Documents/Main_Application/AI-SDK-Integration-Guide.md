# AI SDK + Context7 Integration Guide for Tasky

This guide demonstrates how to integrate Vercel's AI SDK with Context7 documentation patterns for enhanced tool calling, MCP integration, and generative UI in the Tasky application.

## Table of Contents

1. [Enhanced Tool Calling](#enhanced-tool-calling)
2. [MCP Integration Patterns](#mcp-integration-patterns)
3. [Generative UI Implementation](#generative-ui-implementation)
4. [Streaming and Message Handling](#streaming-and-message-handling)
5. [Error Handling and Recovery](#error-handling-and-recovery)
6. [Performance Optimizations](#performance-optimizations)

## Enhanced Tool Calling

### Current Implementation vs. AI SDK Best Practices

**Enhanced Implementation (`src/ai/mcp-tools.ts`):**
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const mcpCall = tool({
  description: 'Call a local MCP tool by name via the Tasky MCP agent (http://localhost:7844/mcp).',
  inputSchema: z.object({
    name: z.string().describe('The MCP tool name to call'),
    args: z.record(z.any()).optional().describe('JSON-serializable arguments for the tool'),
  }),
  execute: async ({ name, args }, { toolCallId, abortSignal }) => {
    // Enhanced implementation with abort signals, tool IDs, and proper error handling
  }
});
```

### Key Improvements

1. **Type Safety**: Using `tool()` helper ensures proper TypeScript inference
2. **Abort Signals**: Proper cancellation support for long-running operations
3. **Tool Call IDs**: Track individual tool invocations for UI updates
4. **Message Context**: Access to conversation history within tools
5. **Multi-step Calls**: Support for complex tool orchestration

### Specific Tool Implementations

```typescript
export const createTaskTool = tool({
  description: 'Create a new task in Tasky',
  inputSchema: z.object({
    title: z.string().describe('The task title'),
    description: z.string().optional(),
    dueDate: z.string().optional().describe('ISO format'),
    tags: z.array(z.string()).optional(),
  }),
  execute: async (args, { toolCallId, abortSignal }) => {
    return await enhancedMcpCall.execute(
      { name: 'tasky_create_task', args },
      { toolCallId, abortSignal, messages: [] }
    );
  }
});
```

## MCP Integration Patterns

### Enhanced MCP Client Setup

Based on Context7 documentation, here's how to set up proper MCP integration:

```typescript
// For local MCP servers (current Tasky setup)
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

const mcpClient = await createMCPClient({
  transport: new StdioMCPTransport({
    command: 'node',
    args: ['tasky-mcp-agent/dist/server.js'],
  }),
});

// For remote MCP servers
const remoteMcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url: 'https://your-mcp-server.com/sse',
    headers: { Authorization: 'Bearer api-key' },
  },
});
```

### Tool Discovery and Schema Management

```typescript
// Automatic schema discovery
const tools = await mcpClient.tools();

// Explicit schema definition for type safety
const tools = await mcpClient.tools({
  schemas: {
    'tasky_create_task': {
      parameters: z.object({
        title: z.string(),
        description: z.string().optional(),
        dueDate: z.string().optional(),
      }),
    },
    'tasky_create_reminder': {
      parameters: z.object({
        message: z.string(),
        time: z.string(),
        days: z.array(z.string()),
      }),
    },
  },
});
```

## Generative UI Implementation

### Enhanced Chat Component

The `EnhancedChatModule` demonstrates several AI SDK UI patterns:

#### 1. Multi-step Tool Calls

```typescript
const result = streamText({
  model,
  messages: chatMessages,
  maxSteps: 5, // Enable multi-step tool execution
  tools: mcpHealthy ? taskyToolSet : undefined,
  
  onStepFinish: ({ toolCalls, toolResults }) => {
    console.log('Step completed:', { toolCalls, toolResults });
  }
});
```

#### 2. Tool Confirmation UI

```typescript
// Enhanced confirmation card with structured rendering
const renderConfirmationCard = () => {
  if (!pendingConfirmation) return null;
  
  const { name, args } = pendingConfirmation;
  
  return (
    <div className="confirmation-card">
      <h4>Confirm Tool Call</h4>
      <p><strong>{name}</strong></p>
      {renderToolArguments(name, args)}
      <div className="actions">
        <button onClick={handleConfirm}>Confirm</button>
        <button onClick={handleCancel}>Cancel</button>
      </div>
    </div>
  );
};
```

#### 3. Loading States and Progress Indicators

```typescript
const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());

// Track tool execution phases
useEffect(() => {
  const handleToolEvent = (e: CustomEvent) => {
    const { id, phase } = e.detail;
    
    if (phase === 'start') {
      setLoadingTools(prev => new Set([...prev, id]));
    } else if (phase === 'done' || phase === 'error') {
      setLoadingTools(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };
  
  window.addEventListener('tasky:tool', handleToolEvent);
  return () => window.removeEventListener('tasky:tool', handleToolEvent);
}, []);
```

## Streaming and Message Handling

### Enhanced Streaming with AI SDK

```typescript
const sendMessage = async () => {
  const result = streamText({
    model: getModel(),
    messages: chatMessages,
    temperature: 0.7,
    maxSteps: 5,
    abortSignal: abortController.signal,
    tools: taskyToolSet,
    
    // Enhanced callbacks
    onStepFinish: ({ toolCalls, toolResults }) => {
      // Handle individual step completion
    },
    
    onFinish: async ({ response, usage }) => {
      // Save chat and handle completion
      await window.electronAPI?.saveChat(currentChatId, finalMessages);
    },
    
    // Tool call repair
    experimental_repairToolCall: async ({ toolCall, error }) => {
      if (error.message.includes('NoSuchTool')) {
        return null; // Skip invalid tools
      }
      
      // Attempt to repair the tool call
      return { ...toolCall, input: JSON.stringify({ name: toolCall.toolName, args: {} }) };
    }
  });
  
  // Process stream with UI updates
  for await (const chunk of result.textStream) {
    if (abortController.signal.aborted) break;
    // Update UI incrementally
  }
};
```

### Message Persistence Patterns

```typescript
// Enhanced persistence with onFinish callback
return result.toUIMessageStreamResponse({
  originalMessages: messages,
  onFinish: ({ messages, isAborted }) => {
    if (!isAborted) {
      saveChat({ chatId, messages });
    }
  },
  // Consume stream even if client disconnects
  consumeSseStream: true
});
```

## Error Handling and Recovery

### Tool Call Repair

```typescript
experimental_repairToolCall: async ({ toolCall, tools, error, messages, system }) => {
  // Strategy 1: Skip invalid tools
  if (NoSuchToolError.isInstance(error)) {
    return null;
  }
  
  // Strategy 2: Use structured output to repair
  const { object: repairedArgs } = await generateObject({
    model: openai('gpt-4o'),
    schema: tools[toolCall.toolName].inputSchema,
    prompt: `Fix these tool arguments: ${JSON.stringify(toolCall.input)}`
  });
  
  return { ...toolCall, input: JSON.stringify(repairedArgs) };
}
```

### Abort Signal Handling

```typescript
// Enhanced abort signal chaining
async function performMcpCall(name: string, args: any, abortSignal?: AbortSignal) {
  const controller = new AbortController();
  
  // Chain abort signals
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => controller.abort());
  }
  
  return fetch('http://localhost:7844/mcp', {
    method: 'POST',
    body: JSON.stringify({ /* ... */ }),
    signal: controller.signal
  });
}
```

## Performance Optimizations

### 1. Conditional Tool Loading

```typescript
// Only load tools when MCP is healthy
const tools = mcpHealthy ? taskyToolSet : undefined;

// Health check with timeout
const checkMcpHealth = async () => {
  try {
    const response = await fetch('http://localhost:7844/mcp', {
      method: 'POST',
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tools/list' }),
      signal: AbortSignal.timeout(3000)
    });
    setMcpHealthy(response.ok);
  } catch {
    setMcpHealthy(false);
  }
};
```

### 2. Stream Consumption for Reliability

```typescript
// Ensure streams complete even if client disconnects
const result = streamText({ /* ... */ });

// Consume stream without waiting
result.consumeStream(); // No await

return result.toUIMessageStreamResponse({
  onFinish: ({ messages }) => {
    saveChat({ chatId, messages }); // Always executes
  }
});
```

### 3. Efficient State Management

```typescript
// Use Sets for loading state tracking
const [loadingTools, setLoadingTools] = useState<Set<string>>(new Set());

// Efficient updates
setLoadingTools(prev => {
  const next = new Set(prev);
  next.delete(completedToolId);
  return next;
});
```

## Migration Path

### Phase 1: Enhanced Tool Calling
1. Replace current `mcpCall` with `tool()` helper
2. Add abort signal support
3. Implement tool call ID tracking

### Phase 2: Improved Streaming
1. Upgrade to `streamText` with enhanced callbacks
2. Add multi-step tool support
3. Implement tool call repair

### Phase 3: Advanced UI Patterns
1. Enhanced confirmation cards
2. Better loading states
3. Tool result visualization

### Phase 4: Performance & Reliability
1. Stream consumption patterns
2. Enhanced error handling
3. Optimized state management

## Integration Examples

### Complete Tool Set Definition

```typescript
export const taskyToolSet = {
  // Generic MCP caller
  mcpCall: enhancedMcpCall,
  
  // Specific typed tools
  createTask: createTaskTool,
  createReminder: createReminderTool,
  listTasks: listTasksTool,
  updateTask: updateTaskTool,
  
  // Dynamic tools for runtime flexibility
  dynamicMcp: dynamicMcpTool,
} as const;
```

### Enhanced Chat Integration

```typescript
// In your main chat component
import { EnhancedChatModule } from './EnhancedChatModule';
import { taskyToolSet } from '../ai/enhanced-mcp-tools';

export const ChatTab = () => {
  return (
    <EnhancedChatModule
      settings={settings}
      onUpdateSettings={updateSettings}
    />
  );
};
```

This integration provides:
- ✅ Better type safety with AI SDK patterns
- ✅ Enhanced tool confirmation UI
- ✅ Multi-step tool execution
- ✅ Proper abort signal handling
- ✅ Stream consumption for reliability
- ✅ Tool call repair and error recovery
- ✅ Performance optimizations

The enhanced implementation maintains backward compatibility while providing a path to adopt AI SDK best practices incrementally.
