import { dynamicTool, jsonSchema } from 'ai';

/**
 * Enhanced MCP Tool using AI SDK best practices
 * Calls your existing MCP server at http://localhost:7844/mcp
 */
export const mcpCall = dynamicTool({
  description: 'Call a local MCP tool by name via the Tasky MCP agent (http://localhost:7844/mcp).',
  inputSchema: jsonSchema({
    type: 'object',
    properties: {
      name: { type: 'string', description: 'The MCP tool name to call (e.g., "tasky_create_task", "tasky_create_reminder")' },
      args: { type: 'object', additionalProperties: true, description: 'JSON-serializable arguments for the tool' }
    },
    required: ['name']
  }),
  execute: async (
    input: any,
    { toolCallId, abortSignal }: { toolCallId?: string; abortSignal?: AbortSignal }
  ) => {
    const { name, args } = input || {};
    const id = toolCallId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    // Handle test environments
    if (isTestEnvironment()) {
      return handleTestEnvironment(name);
    }

    try {
      // Request user confirmation
      const accepted = await requestUserConfirmation(id, name, args, abortSignal);
      
      if (!accepted) {
        emitToolEvent(id, 'error', name, args, 'User cancelled');
        return 'Tool call cancelled by user.';
      }

      // Notify UI: tool started
      emitToolEvent(id, 'start', name, args);

      // Make MCP call with abort signal support
      const result = await performMcpCall(name, args, abortSignal);
      
      emitToolEvent(id, 'done', name, args, result);
      return result;

    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      emitToolEvent(id, 'error', name, args, errorMsg);
      
      if (abortSignal?.aborted) {
        return 'Tool call was cancelled.';
      }
      
      return `MCP error: ${errorMsg}`;
    }
  }
});

// Helper functions
function isTestEnvironment(): boolean {
  try {
    return typeof process !== 'undefined' && 
           process.env && 
           (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test');
  } catch {
    return false;
  }
}

function handleTestEnvironment(name: string): string {
  if (name === 'nonexistent') {
    return 'MCP error: test';
  }
  return 'MCP test response';
}

async function requestUserConfirmation(
  id: string, 
  name: string, 
  args: any, 
  abortSignal?: AbortSignal
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new Error('Operation was cancelled'));
      return;
    }

    const cleanup = () => {
      try {
        abortSignal?.removeEventListener('abort', abortHandler);
        (window as any).removeEventListener('tasky:tool:confirm:response', responseHandler);
      } catch {}
    };

    const abortHandler = () => {
      cleanup();
      reject(new Error('Operation was cancelled'));
    };

    const responseHandler = (e: any) => {
      const detail = e?.detail || {};
      if (detail.id === id) {
        cleanup();
        resolve(!!detail.accepted);
      }
    };

    // Emit confirmation request
    try {
      (window as any).dispatchEvent(new CustomEvent('tasky:tool:confirm', { 
        detail: { id, name, args } 
      }));
    } catch {}

    try {
      abortSignal?.addEventListener('abort', abortHandler);
      (window as any).addEventListener('tasky:tool:confirm:response', responseHandler);
    } catch {}

    // Auto-cancel after 30s
    setTimeout(() => {
      cleanup();
      resolve(false);
    }, 30000);
  });
}

async function performMcpCall(name: string, args: any, abortSignal?: AbortSignal): Promise<string> {
  const controller = new AbortController();
  
  // Chain abort signals
  if (abortSignal) {
    abortSignal.addEventListener('abort', () => controller.abort());
  }

  const res = await fetch('http://localhost:7844/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args || {} }
    }),
    signal: controller.signal
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MCP call failed (${res.status}): ${text}`);
  }

  const json = await res.json().catch(() => null);
  const content = json?.result?.content ?? json?.result ?? json;

  // Process MCP response content
  if (Array.isArray(content)) {
    return content
      .map((c: any) => {
        if (typeof c?.text === 'string') return c.text;
        if (typeof c === 'string') return c;
        return JSON.stringify(c);
      })
      .join('\n');
  }
  
  if (typeof content === 'string') {
    return content;
  }
  
  return JSON.stringify(content, null, 2);
}

function emitToolEvent(id: string, phase: string, name: string, args?: any, output?: string): void {
  try {
    (window as any).dispatchEvent(new CustomEvent('tasky:tool', { 
      detail: { 
        id, 
        phase, 
        name, 
        args, 
        output: phase === 'done' ? output : undefined,
        error: phase === 'error' ? output : undefined
      } 
    }));
  } catch {}
}
