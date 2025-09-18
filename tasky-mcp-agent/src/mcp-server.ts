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

      const assignedAgent = args.assignedAgent || 'claude';
      
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
        assignedAgent,
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
    id: z.string().optional().describe('Task ID to update (optional if matchTitle provided)'),
    matchTitle: z.string().optional().describe('Exact or approximate task title to identify the task when id is not provided'),
    // If user provides just `title` and other fields, we treat it as the match title
    // Use `newTitle` when changing the title value
    title: z.string().optional().describe('Task title to match (alias for matchTitle when id is not provided). Prefer newTitle to change the title'),
    newTitle: z.string().optional().describe('New task title (use this to rename)'),
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
      let { id, matchTitle, title, newTitle, name, newName, ...updates } = args as any;
      // If no id/matchTitle but title is present along with other updates, use it as matchTitle
      if (!id && !matchTitle && title && Object.keys(updates).length > 0) {
        matchTitle = title;
      }
      // Accept `name` as alias for matching title
      if (!id && !matchTitle && name && Object.keys(updates).length > 0) {
        matchTitle = name;
      }
      // Promote newTitle to updates.title
      if (newTitle) updates.title = newTitle;
      // Accept newName as alias for new title
      if (!updates.title && newName) updates.title = newName;
      // If both matchTitle and updates.title are missing but title exists in updates, allow it
      if (!updates.title && newTitle == null && args?.title && id) {
        // If the user provided id and title alone, treat that as renaming
        updates.title = args.title;
      }
      if (typeof updates.status === 'string') {
        const s = updates.status.toLowerCase();
        const map: Record<string, string> = {
          pending: 'PENDING',
          in_progress: 'IN_PROGRESS',
          completed: 'COMPLETED',
          cancelled: 'ARCHIVED'
        };
        updates.status = map[s] || updates.status.toUpperCase();
      }
      const result = await taskBridge.updateTask({ id, matchTitle, updates });
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
  'Delete a Tasky task by ID or exact title',
  {
    id: z.string().optional().describe('Task ID to delete'),
    title: z.string().optional().describe('Exact task title to delete (used when id not provided)'),
  },
  async (args) => {
    try {
      if (!args?.id && !args?.title) {
        throw new Error('Provide either id or title');
      }
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

server.tool(
  'tasky_execute_task',
  'Execute a selected task by updating status to IN_PROGRESS or COMPLETED',
  {
    id: z.string().describe('Task ID to execute'),
    status: z.enum(['IN_PROGRESS', 'COMPLETED']).optional().describe('New task status (defaults to IN_PROGRESS)'),
  },
  async (args) => {
    try {
      const result = await taskBridge.executeTask(args);
      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing task: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  'Create a new Tasky reminder. Use this tool immediately when user mentions creating reminders. Do not ask for additional details - make reasonable defaults.',
  {
    message: z.string().describe('Reminder message (extract from user request)'),
    time: z.string().describe('Time in HH:MM format. Common defaults: morning=09:00, afternoon=14:00, evening=18:00. Parse "10am"→"10:00", "2pm"→"14:00"'),
    days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional().describe('Days of week. If user says "weekdays"→["monday","tuesday","wednesday","thursday","friday"]. If no days specified→defaults to daily (all 7 days)'),
    enabled: z.boolean().optional().describe('Whether reminder is enabled').default(true),
    oneTime: z.boolean().optional().describe('Whether this is a one-time reminder').default(false),
  },
  async (args) => {
    try {
      // Parse and normalize time format
      let finalTime = args.time;
      let isOneTime = args.oneTime || false;
      
      // Convert common time formats to HH:MM
      const timeStr = args.time.toLowerCase().trim();
      if (timeStr.includes('am') || timeStr.includes('pm')) {
        // Parse "10am" → "10:00", "2pm" → "14:00", "10:30am" → "10:30"
        const match = timeStr.match(/(\d{1,2})(:?\d{2})?\s*(am|pm)/);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = match[2] ? match[2].replace(':', '') : '00';
          const period = match[3];
          
          if (period === 'pm' && hours !== 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;
          
          finalTime = `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        }
      }
      
      // Check if it's a relative time (contains "in" or "from now")
      if (args.time.toLowerCase().includes('in ') || args.time.toLowerCase().includes('from now')) {
        const { parseRelativeTime } = await import('./utils/time-parser.js');
        const parsed = parseRelativeTime(args.time);
        finalTime = parsed.time;
        isOneTime = true; // Relative times should be one-time by default
      }
      
      const result = await reminderBridge.createReminder({
        message: args.message,
        time: finalTime,
        days: args.days,
        enabled: args.enabled,
        oneTime: isOneTime,
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
    id: z.string().optional().describe('Reminder ID to update (optional if matchMessage provided)'),
    matchMessage: z.string().optional().describe('Exact or approximate reminder message to identify the reminder when id is not provided'),
    message: z.string().optional().describe('Reminder message to match (alias for matchMessage when id is not provided). Prefer newMessage to change the message'),
    newMessage: z.string().optional().describe('New reminder message (use this to rename)'),
    time: z.string().optional().describe('New time in HH:MM format'),
    days: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional().describe('New days of the week'),
    enabled: z.boolean().optional().describe('Whether reminder is enabled'),
  },
  async (args) => {
    try {
      let { id, matchMessage, message, newMessage, name, newName, newTitle, title, ...updates } = args as any;
      if (!id && !matchMessage && message && Object.keys(updates).length > 0) {
        matchMessage = message;
      }
      // Accept `name` or `title` as alias for matching message
      if (!id && !matchMessage && name && Object.keys(updates).length > 0) {
        matchMessage = name;
      }
      if (!id && !matchMessage && title && Object.keys(updates).length > 0) {
        matchMessage = title;
      }
      if (newMessage) updates.message = newMessage;
      // Accept newName/newTitle as alias for new message value
      if (!updates.message && newName) updates.message = newName;
      if (!updates.message && newTitle) updates.message = newTitle;
      if (!updates.message && newMessage == null && args?.message && id) {
        updates.message = args.message;
      }
      const result = await reminderBridge.updateReminder({ id, matchMessage, updates });
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
  'Delete a Tasky reminder by ID or exact/approximate message',
  {
    id: z.string().optional().describe('Reminder ID to delete'),
    message: z.string().optional().describe('Exact or approximate reminder message to delete (used when id not provided)'),
  },
  async (args) => {
    try {
      if (!args?.id && !args?.message) {
        throw new Error('Provide either id or message');
      }
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

// Start the server using stdio transport
async function main() {
  console.error('Starting Tasky MCP server with stdio transport...');
  
  const transport = new StdioServerTransport();
  
  // Connect the server to the transport
  await server.connect(transport);
  
  console.error('Tasky MCP server connected via stdio');
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.error('Received SIGINT, shutting down gracefully');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('MCP server fatal error:', error);
  process.exit(1);
});
