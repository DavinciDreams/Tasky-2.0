#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import { TaskyMCPTools } from './tools/index.js';

class TaskyMCPServer {
  private server: Server;
  private tools: TaskyMCPTools;

  constructor() {
    this.server = new Server(
      { name: 'tasky-mcp-agent', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );

    this.tools = new TaskyMCPTools({
      tasksPath: process.env.TASKY_TASKS_PATH,
      configPath: process.env.TASKY_CONFIG_PATH
    });
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: this.tools.getTools() };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      return await this.tools.handleToolCall(request);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tasky MCP Agent started');
    this.tools.getTools().forEach(t => console.error(` - ${t.name}`));
  }
}

async function main() {
  const server = new TaskyMCPServer();
  await server.start();
}

main().catch(err => {
  console.error('Failed to start Tasky MCP Agent:', err);
  process.exit(1);
});


