import type { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { TaskBridge } from '../utils/task-bridge.js';
import { ReminderBridge } from '../utils/reminder-bridge.js';

export interface TaskyMCPOptions {
  tasksPath?: string;
  configPath?: string;
}

export class TaskyMCPTools {
  private taskBridge: TaskBridge;
  private reminderBridge: ReminderBridge;

  constructor(options: TaskyMCPOptions = {}) {
    this.taskBridge = new TaskBridge(options.tasksPath);
    this.reminderBridge = new ReminderBridge(options.configPath);
  }

  // Public getters for direct access to bridges
  getTaskBridge() { return this.taskBridge; }
  getReminderBridge() { return this.reminderBridge; }

  // Return tools in the format expected by MCP SDK
  getTools(): any[] {
    return [
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
            // Back-compat shim for clients that only send random_string
            random_string: { type: 'string', description: 'If provided, used as the title when title is missing' }
          },
          anyOf: [
            { required: ['title'] },
            { required: ['random_string'] }
          ]
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
                // Top-level task fields
                status: { type: 'string', enum: ['PENDING','IN_PROGRESS','COMPLETED','NEEDS_REVIEW','ARCHIVED'] },
                reminderEnabled: { type: 'boolean' },
                reminderTime: { type: 'string' },
                result: { type: 'string' },
                humanApproved: { type: 'boolean' },
                // Schema fields
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
      { 
        name: 'tasky_delete_task', 
        description: 'Delete a Tasky task', 
        inputSchema: { 
          type: 'object', 
          properties: { id: { type: 'string' } }, 
          required: ['id'] 
        } 
      },
      { 
        name: 'tasky_get_task', 
        description: 'Get a Tasky task', 
        inputSchema: { 
          type: 'object', 
          properties: { id: { type: 'string' } }, 
          required: ['id'] 
        } 
      },
      { 
        name: 'tasky_list_tasks', 
        description: 'List Tasky tasks', 
        inputSchema: { 
          type: 'object', 
          properties: { 
            status: { type: 'array', items: { type: 'string' } }, 
            tags: { type: 'array', items: { type: 'string' } }, 
            search: { type: 'string' }, 
            dueDateFrom: { type: 'string' }, 
            dueDateTo: { type: 'string' }, 
            limit: { type: 'number' }, 
            offset: { type: 'number' } 
          } 
        } 
      },
      {
        name: 'tasky_execute_task',
        description: 'Execute a selected task by updating status',
        inputSchema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED'] } }, required: ['id'] }
      },

      // Reminders
      {
        name: 'tasky_create_reminder',
        description: 'Create a reminder',
        inputSchema: { type: 'object', properties: { message: { type: 'string' }, time: { type: 'string' }, days: { type: 'array', items: { type: 'string' } }, enabled: { type: 'boolean' } }, required: ['message', 'time', 'days'] }
      },
      {
        name: 'tasky_update_reminder',
        description: 'Update a reminder',
        inputSchema: { type: 'object', properties: { id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
      },
      { 
        name: 'tasky_delete_reminder', 
        description: 'Delete a reminder', 
        inputSchema: { 
          type: 'object', 
          properties: { id: { type: 'string' } }, 
          required: ['id'] 
        } 
      },
      { 
        name: 'tasky_get_reminder', 
        description: 'Get a reminder', 
        inputSchema: { 
          type: 'object', 
          properties: { id: { type: 'string' } }, 
          required: ['id'] 
        } 
      },
      { 
        name: 'tasky_list_reminders', 
        description: 'List reminders', 
        inputSchema: { 
          type: 'object', 
          properties: { 
            enabled: { type: 'boolean' }, 
            day: { type: 'string' }, 
            search: { type: 'string' } 
          } 
        } 
      },
      { 
        name: 'tasky_toggle_reminder', 
        description: 'Enable/disable a reminder', 
        inputSchema: { 
          type: 'object', 
          properties: { 
            id: { type: 'string' }, 
            enabled: { type: 'boolean' } 
          }, 
          required: ['id', 'enabled'] 
        } 
      }
    ];
  }

  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const name = request.params.name;
    const args: any = request.params.arguments || {};
    try {
      switch (name) {
        case 'tasky_create_task':
          // Back-compat: map random_string -> title when title is missing
          if (!args.title && typeof args.random_string === 'string' && args.random_string.trim().length > 0) {
            args.title = args.random_string.trim();
          }
          return await this.taskBridge.createTask(args);
        case 'tasky_update_task':
          return await this.taskBridge.updateTask(args);
        case 'tasky_delete_task':
          return await this.taskBridge.deleteTask(args);
        case 'tasky_get_task':
          return await this.taskBridge.getTask(args);
        case 'tasky_list_tasks':
          return await this.taskBridge.listTasks(args);
        case 'tasky_execute_task':
          return await this.taskBridge.executeTask(args);

        case 'tasky_create_reminder':
          return await this.reminderBridge.createReminder(args);
        case 'tasky_update_reminder':
          return await this.reminderBridge.updateReminder(args);
        case 'tasky_delete_reminder':
          return await this.reminderBridge.deleteReminder(args);
        case 'tasky_get_reminder':
          return await this.reminderBridge.getReminder(args);
        case 'tasky_list_reminders':
          return await this.reminderBridge.listReminders(args);
        case 'tasky_toggle_reminder':
          return await this.reminderBridge.toggleReminder(args);
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  }
}


