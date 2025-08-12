#!/usr/bin/env node

import express, { Request, Response } from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { TaskyMCPTools } from './tools/index.js';

// Create Express app
const app = express();
app.use(express.json());

// Configure CORS for browser clients
app.use(cors({
  origin: '*', // Configure appropriately for production
  exposedHeaders: ['Mcp-Session-Id', 'mcp-session-id'],
  allowedHeaders: ['Content-Type', 'Mcp-Session-Id', 'mcp-session-id'],
}));

// Map to store transports by session ID (or placeholders for SSE keep-alive)
const transports: { [sessionId: string]: StreamableHTTPServerTransport | 'placeholder' } = {};

// Create MCP server instance and setup tools
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'tasky-mcp-agent',
    version: '0.1.0'
  });

  const tools = new TaskyMCPTools({
    // DB-only now; bridges will read TASKY_DB_PATH directly
  });

  // Skip MCP SDK tool registration to avoid validation issues
  // All tool calls are handled directly via HTTP POST /mcp endpoint
  console.log('MCP Server created - tools handled via direct HTTP routing');

  return server;
}

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = (req.headers['mcp-session-id'] || req.headers['mcp-session-id'.toLowerCase()] || req.headers['mcp-session-id'.toUpperCase()]) as string | undefined;
  let transport: StreamableHTTPServerTransport;

  // Prompts: list available prompts
  if (req.body && req.body.method === 'prompts/list') {
    const prompts = [
      {
        name: 'create-task',
        title: 'Create Task',
        description: 'Create a Tasky task with title, description, and optional tags',
        arguments: [
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'tags', type: 'array', items: { type: 'string' }, required: false }
        ]
      }
    ];
    const response = { jsonrpc: '2.0', id: req.body.id, result: { prompts } };
    return res.status(200).json(response);
  }

  // Prompts: get prompt details
  if (req.body && req.body.method === 'prompts/get') {
    const name = req.body.params?.name;
    if (name === 'create-task') {
      const prompt = {
        name: 'create-task',
        title: 'Create Task',
        description: 'Create a Tasky task',
        arguments: [
          { name: 'title', type: 'string', required: true },
          { name: 'description', type: 'string', required: false },
          { name: 'tags', type: 'array', items: { type: 'string' }, required: false }
        ],
        // simple template example
        template: 'Create a task titled "{{title}}". Description: {{description}}. Tags: {{tags}}.'
      };
      const response = { jsonrpc: '2.0', id: req.body.id, result: { prompt } };
      return res.status(200).json(response);
    }
    const response = { jsonrpc: '2.0', id: req.body.id, error: { code: -32602, message: 'Unknown prompt' } };
    return res.status(400).json(response);
  }

  // Check if this is a tools/list request (return static list without touching the DB)
  if (req.body && req.body.method === 'tools/list') {
    const toolList = [
      // Tasks
      {
        name: 'tasky_create_task',
        description: 'Create a Tasky task (use title/description/etc). Back-compat: also accepts random_string as the title.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string' },
            dueDate: { type: 'string', description: 'ISO datetime' },
            tags: { type: 'array', items: { type: 'string' } },
            affectedFiles: { type: 'array', items: { type: 'string' } },
            estimatedDuration: { type: 'number' },
            dependencies: { type: 'array', items: { type: 'string' } },
            reminderEnabled: { type: 'boolean' },
            reminderTime: { type: 'string' },
            assignedAgent: { type: 'string', enum: ['claude','gemini'], description: 'Optional executor hint' },
            executionPath: { type: 'string' },
            random_string: { type: 'string', description: 'If provided, used as the title when title is missing' }
          },
          anyOf: [ { required: ['title'] }, { required: ['random_string'] } ]
        }
      },
      {
        name: 'tasky_update_task',
        description: 'Update a Tasky task',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            updates: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['PENDING','IN_PROGRESS','COMPLETED','NEEDS_REVIEW','ARCHIVED'] },
                reminderEnabled: { type: 'boolean' },
                reminderTime: { type: 'string' },
                result: { type: 'string' },
                humanApproved: { type: 'boolean' },
                title: { type: 'string' },
                description: { type: 'string' },
                dueDate: { type: 'string', description: 'ISO datetime' },
                tags: { type: 'array', items: { type: 'string' } },
                affectedFiles: { type: 'array', items: { type: 'string' } },
                estimatedDuration: { type: 'number' },
                dependencies: { type: 'array', items: { type: 'string' } },
                assignedAgent: { type: 'string' },
                executionPath: { type: 'string' }
              }
            }
          },
          required: ['id', 'updates']
        }
      },
      { name: 'tasky_delete_task', description: 'Delete a Tasky task', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      { name: 'tasky_list_tasks', description: 'List Tasky tasks', inputSchema: { type: 'object', properties: { status: { type: 'array', items: { type: 'string' } }, tags: { type: 'array', items: { type: 'string' } }, search: { type: 'string' }, dueDateFrom: { type: 'string' }, dueDateTo: { type: 'string' }, limit: { type: 'number' }, offset: { type: 'number' } } } },
      { name: 'tasky_execute_task', description: 'Execute a selected task by updating status', inputSchema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['IN_PROGRESS','COMPLETED'] } }, required: ['id'] } },
      // Reminders
      { name: 'tasky_create_reminder', description: 'Create a reminder', inputSchema: { type: 'object', properties: { message: { type: 'string' }, time: { type: 'string' }, days: { type: 'array', items: { type: 'string' } }, enabled: { type: 'boolean' } }, required: ['message','time','days'] } },
      { name: 'tasky_update_reminder', description: 'Update a reminder', inputSchema: { type: 'object', properties: { id: { type: 'string' }, updates: { type: 'object' } }, required: ['id','updates'] } },
      { name: 'tasky_delete_reminder', description: 'Delete a reminder', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      { name: 'tasky_get_reminder', description: 'Get a reminder', inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      { name: 'tasky_list_reminders', description: 'List reminders', inputSchema: { type: 'object', properties: { enabled: { type: 'boolean' }, day: { type: 'string' }, search: { type: 'string' } } } },
      { name: 'tasky_toggle_reminder', description: 'Enable/disable a reminder', inputSchema: { type: 'object', properties: { id: { type: 'string' }, enabled: { type: 'boolean' } }, required: ['id','enabled'] } }
    ];

    const response = { jsonrpc: '2.0', id: req.body.id, result: { tools: toolList } };
    res.status(200).json(response);
    return;
  }

  // Check if this is a tool call request that we should handle directly
  if (req.body && req.body.method === 'tools/call') {
    const toolName = req.body.params?.name;
    const toolArgs = req.body.params?.arguments || {};
    
    if (toolName && toolName.startsWith('tasky_')) {
      // Handle the tool call directly
      const tools = new TaskyMCPTools({});
      
      const request = {
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArgs
        }
      };
      
      try {
        const result = await tools.handleToolCall(request as any);
        
        const response = {
          jsonrpc: '2.0',
          id: req.body.id,
          result: result
        };
        
        // Return standard JSON for compatibility
        res.status(200).json(response);
        return;
        
      } catch (error) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: req.body.id,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : String(error)
          }
        };
        
        res.status(500).json(errorResponse);
        return;
      }
    }
  }

  // Handle initialization requests (with or without existing session)
  if (isInitializeRequest(req.body) || (req.body && req.body.method === 'initialize')) {
    const effectiveSessionId = sessionId && typeof sessionId === 'string' && sessionId.length > 0
      ? sessionId
      : randomUUID();
    const response = {
      jsonrpc: '2.0',
      id: (req.body as any).id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: { listChanged: true },
          prompts: {},
        },
        serverInfo: {
          name: 'tasky-mcp-agent',
          version: '0.1.0'
        }
      }
    };
    
    // Store a placeholder so GET /mcp can establish an SSE keep-alive
    transports[effectiveSessionId] = transports[effectiveSessionId] || 'placeholder';

    // Return JSON and include session header for clients that track it
    res.setHeader('mcp-session-id', effectiveSessionId);
    res.setHeader('Mcp-Session-Id', effectiveSessionId);
    res.status(200).json(response);
    return;
  }

  // For any other requests, return an error
  res.status(400).json({
    jsonrpc: '2.0',
    error: {
      code: -32000,
      message: 'Bad Request: Unsupported request type',
    },
    id: req.body?.id || null,
  });
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: Request, res: Response) => {
  let sessionId = req.headers['mcp-session-id'] as string | undefined;
  let entry = sessionId ? transports[sessionId] : undefined;

  // If missing session, provision a placeholder session so clients that connect first with GET can proceed
  if (!sessionId) {
    sessionId = randomUUID();
    transports[sessionId] = 'placeholder';
    res.setHeader('mcp-session-id', sessionId);
    res.setHeader('Mcp-Session-Id', sessionId);
    entry = 'placeholder';
  }

  // If we don't have a registered transport, provide a minimal SSE keep-alive so HTTP clients stay "connected"
  if (!entry) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  if (entry === 'placeholder') {
    // Minimal SSE stream to satisfy clients expecting a long-lived connection
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send an initial event so clients know the stream is live
    try {
      res.write(`event: initialized\n`);
      res.write(`data: {}\n\n`);
    } catch {
      // ignore write errors
    }

    const keepAlive = setInterval(() => {
      try {
        res.write(`: keepalive\n\n`);
      } catch {
        // ignore write errors
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAlive);
      // do not delete placeholder; client may reuse session id
    });
    return;
  }

  const transport = entry as StreamableHTTPServerTransport;
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    server: 'tasky-mcp-agent',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// Debug config endpoint: resolved storage paths and mode
app.get('/debug/config', (req: Request, res: Response) => {
  res.json({
    taskyDbPath: process.env.TASKY_DB_PATH || null,
    storageMode: 'sqlite',
    pwd: process.cwd()
  });
});

// Start the server
const PORT = process.env.PORT || 7842;

async function main() {
  try {
    app.listen(PORT, () => {
      console.log(`Tasky MCP HTTP Server listening on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
    });
  } catch (error) {
    console.error('Failed to start Tasky MCP Agent:', error);
    process.exit(1);
  }
}

main();


