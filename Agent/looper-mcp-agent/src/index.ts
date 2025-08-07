#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { LooperMCPTools } from './tools/index.js';

/**
 * Looper CLI MCP Server
 * 
 * This MCP server provides tools for interacting with the Looper CLI task management system.
 * It allows AI assistants to create, manage, and execute tasks within a repository context.
 */
class LooperMCPServer {
  private server: Server;
  private tools: LooperMCPTools;

  constructor() {
    this.server = new Server(
      {
        name: 'looper-cli-mcp-agent',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize with current working directory as default project path
    this.tools = new LooperMCPTools(process.cwd());
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.tools.getTools(),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      return await this.tools.handleToolCall(request);
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log startup message to stderr so it doesn't interfere with MCP communication
    console.error('🔄 Looper CLI MCP Agent started successfully');
    console.error('📋 Available tools:');
    this.tools.getTools().forEach(tool => {
      console.error(`  - ${tool.name}: ${tool.description}`);
    });
    console.error('🚀 Ready to manage tasks!');
  }
}

// Start the server
async function main() {
  const server = new LooperMCPServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.error('🛑 Looper CLI MCP Agent shutting down...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.error('🛑 Looper CLI MCP Agent shutting down...');
    process.exit(0);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start Looper CLI MCP Agent:', error);
    process.exit(1);
  }
}

// Always run the main function
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
}); 