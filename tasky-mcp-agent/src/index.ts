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
  exposedHeaders: ['Mcp-Session-Id'],
  allowedHeaders: ['Content-Type', 'mcp-session-id'],
}));

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Create MCP server instance and setup tools
function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'tasky-mcp-agent',
    version: '0.1.0'
  });

  const tools = new TaskyMCPTools({
    tasksPath: process.env.TASKY_TASKS_PATH,
    configPath: process.env.TASKY_CONFIG_PATH
  });

  // Skip MCP SDK tool registration to avoid validation issues
  // All tool calls are handled directly via HTTP POST /mcp endpoint
  console.log('MCP Server created - tools handled via direct HTTP routing');

  return server;
}

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
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

  // Check if this is a tools/list request
  if (req.body && req.body.method === 'tools/list') {
    const tools = new TaskyMCPTools({
      tasksPath: process.env.TASKY_TASKS_PATH,
      configPath: process.env.TASKY_CONFIG_PATH
    });
    
    const toolList = tools.getTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));
    
    const response = {
      jsonrpc: '2.0',
      id: req.body.id,
      result: {
        tools: toolList
      }
    };

    // Return standard JSON for compatibility with generic HTTP MCP clients
    res.status(200).json(response);
    return;
  }

  // Check if this is a tool call request that we should handle directly
  if (req.body && req.body.method === 'tools/call') {
    const toolName = req.body.params?.name;
    const toolArgs = req.body.params?.arguments || {};
    
    if (toolName && toolName.startsWith('tasky_')) {
      // Handle the tool call directly
      const tools = new TaskyMCPTools({
        tasksPath: process.env.TASKY_TASKS_PATH,
        configPath: process.env.TASKY_CONFIG_PATH
      });
      
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

  // Handle initialization requests manually
  if (!sessionId && isInitializeRequest(req.body)) {
    const newSessionId = randomUUID();
    const response = {
      jsonrpc: '2.0',
      id: (req.body as any).id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'tasky-mcp-agent',
          version: '0.1.0'
        }
      }
    };
    
    // Return JSON and include session header for clients that track it
    res.setHeader('mcp-session-id', newSessionId);
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
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
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
    taskyTasksPath: process.env.TASKY_TASKS_PATH || null,
    taskyConfigPath: process.env.TASKY_CONFIG_PATH || null,
    taskyDbPath: process.env.TASKY_DB_PATH || null,
    storageMode: process.env.TASKY_DB_PATH ? 'sqlite' : 'json',
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


