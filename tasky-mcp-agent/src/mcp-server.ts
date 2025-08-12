#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TaskBridge } from './utils/task-bridge.js';
import { ReminderBridge } from './utils/reminder-bridge.js';

// Initialize bridges
const taskBridge = new TaskBridge();
const reminderBridge = new ReminderBridge();

// Create MCP server
const server = new McpServer({
  name: 'tasky-mcp-agent',
  version: '0.1.0',
});

// Task Management Tools
server.tool(
  'tasky_create_task',
  'Create a new Tasky task with title, description, due date, tags, and other properties',
  {
    title: z.string().describe('Task title'),
    description: z.string().optional().describe('Task description'),
    dueDate: z.string().optional().describe('Due date in ISO format'),
    tags: z.array(z.string()).optional().describe('Array of tag strings'),
    affectedFiles: z.array(z.string()).optional().describe('Array of file paths'),
    estimatedDuration: z.number().optional().describe('Estimated duration in minutes'),
    dependencies: z.array(z.string()).optional().describe('Array of dependency task IDs'),
    reminderEnabled: z.boolean().optional().describe('Enable reminder for this task'),
    reminderTime: z.string().optional().describe('Reminder time in HH:MM format'),
    assignedAgent: z.enum(['claude', 'gemini']).optional().describe('Assigned AI agent'),
    executionPath: z.string().optional().describe('Path for task execution'),
    // Legacy support
    random_string: z.string().optional().describe('If provided, used as title when title is missing'),
  },
  async (args) => {
    try {
      // Use random_string as title if title is missing (legacy support)
      const title = args.title || args.random_string;
      if (!title) {
        throw new Error('Either title or random_string must be provided');
      }

      const result = await taskBridge.createTask({
        title,
        description: args.description,
        dueDate: args.dueDate,
        tags: args.tags || [],
        affectedFiles: args.affectedFiles || [],
        estimatedDuration: args.estimatedDuration,
        dependencies: args.dependencies || [],
        reminderEnabled: args.reminderEnabled || false,
        reminderTime: args.reminderTime,
        assignedAgent: args.assignedAgent,
        executionPath: args.executionPath,
      });

      // Return the CallToolResult directly
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  'tasky_list_tasks',
  'List all Tasky tasks with optional filtering',
  {
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().describe('Filter by task status'),
    tag: z.string().optional().describe('Filter by tag'),
    limit: z.number().optional().describe('Maximum number of tasks to return'),
  },
  async (args) => {
    try {
      const result = await taskBridge.listTasks({
        status: args.status,
        tag: args.tag,
        limit: args.limit,
      });
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);



server.tool(
  'tasky_update_task',
  'Update an existing Tasky task',
  {
    id: z.string().describe('Task ID to update'),
    title: z.string().optional().describe('New task title'),
    description: z.string().optional().describe('New task description'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().describe('New task status'),
    dueDate: z.string().optional().describe('New due date in ISO format'),
    tags: z.array(z.string()).optional().describe('New array of tag strings'),
    affectedFiles: z.array(z.string()).optional().describe('New array of file paths'),
    estimatedDuration: z.number().optional().describe('New estimated duration in minutes'),
    dependencies: z.array(z.string()).optional().describe('New array of dependency task IDs'),
    reminderEnabled: z.boolean().optional().describe('Enable/disable reminder for this task'),
    reminderTime: z.string().optional().describe('New reminder time in HH:MM format'),
    assignedAgent: z.enum(['claude', 'gemini']).optional().describe('New assigned AI agent'),
    executionPath: z.string().optional().describe('New path for task execution'),
  },
  async (args) => {
    try {
      const { id, ...updates } = args;
      const result = await taskBridge.updateTask({ id, updates });
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error updating task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  'tasky_delete_task',
  'Delete a Tasky task by ID',
  {
    id: z.string().describe('Task ID to delete'),
  },
  async (args) => {
    try {
      const result = await taskBridge.deleteTask(args);
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error deleting task: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Reminder Management Tools
server.tool(
  'tasky_create_reminder',
  'Create a new Tasky reminder',
  {
    message: z.string().describe('Reminder message'),
    time: z.string().describe('Time in HH:MM format'),
    days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).describe('Days of the week'),
    enabled: z.boolean().optional().describe('Whether reminder is enabled').default(true),
  },
  async (args) => {
    try {
      const result = await reminderBridge.createReminder({
        message: args.message,
        time: args.time,
        days: args.days,
        enabled: args.enabled,
      });
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error creating reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  'tasky_list_reminders',
  'List all Tasky reminders',
  {
    enabled: z.boolean().optional().describe('Filter by enabled status'),
  },
  async (args) => {
    try {
      const result = await reminderBridge.listReminders(args.enabled);
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error listing reminders: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  'tasky_update_reminder',
  'Update an existing Tasky reminder',
  {
    id: z.string().describe('Reminder ID to update'),
    message: z.string().optional().describe('New reminder message'),
    time: z.string().optional().describe('New time in HH:MM format'),
    days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional().describe('New days of the week'),
    enabled: z.boolean().optional().describe('Whether reminder is enabled'),
  },
  async (args) => {
    try {
      const { id, ...updates } = args;
      const result = await reminderBridge.updateReminder({ id, updates });
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error updating reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  'tasky_delete_reminder',
  'Delete a Tasky reminder by ID',
  {
    id: z.string().describe('Reminder ID to delete'),
  },
  async (args) => {
    try {
      const result = await reminderBridge.deleteReminder(args);
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error deleting reminder: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tasky MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});
