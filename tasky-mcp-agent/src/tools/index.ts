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

  // Return tools using wire-compatible keys for maximum client compatibility
  // Note: We avoid the SDK's Tool type here to emit `input_schema` keys on the wire.
  getTools(): any[] {
    return [
      // Tasks
      {
        name: 'tasky_create_task',
        description: 'Create a Tasky task',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            dueDate: { type: 'string', description: 'ISO datetime' },
            tags: { type: 'array', items: { type: 'string' } },
            affectedFiles: { type: 'array', items: { type: 'string' } },
            estimatedDuration: { type: 'number' },
            dependencies: { type: 'array', items: { type: 'string' } },
            reminderEnabled: { type: 'boolean' },
            reminderTime: { type: 'string' },
            assignedAgent: { type: 'string' },
            executionPath: { type: 'string' }
          },
          required: ['title']
        }
      },
      {
        name: 'tasky_update_task',
        description: 'Update a Tasky task',
        input_schema: {
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
      { name: 'tasky_delete_task', description: 'Delete a Tasky task', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      { name: 'tasky_get_task', description: 'Get a Tasky task', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      { name: 'tasky_list_tasks', description: 'List Tasky tasks', input_schema: { type: 'object', properties: { status: { type: 'array', items: { type: 'string' } }, tags: { type: 'array', items: { type: 'string' } }, search: { type: 'string' }, dueDateFrom: { type: 'string' }, dueDateTo: { type: 'string' }, limit: { type: 'number' }, offset: { type: 'number' } } } },
      {
        name: 'tasky_execute_task',
        description: 'Execute a selected task by updating status',
        input_schema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED'] } }, required: ['id'] }
      },

      // Reminders
      {
        name: 'tasky_create_reminder',
        description: 'Create a reminder',
        input_schema: { type: 'object', properties: { message: { type: 'string' }, time: { type: 'string' }, days: { type: 'array', items: { type: 'string' } }, enabled: { type: 'boolean' } }, required: ['message', 'time', 'days'] }
      },
      {
        name: 'tasky_update_reminder',
        description: 'Update a reminder',
        input_schema: { type: 'object', properties: { id: { type: 'string' }, updates: { type: 'object' } }, required: ['id', 'updates'] }
      },
      { name: 'tasky_delete_reminder', description: 'Delete a reminder', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      { name: 'tasky_get_reminder', description: 'Get a reminder', input_schema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } },
      { name: 'tasky_list_reminders', description: 'List reminders', input_schema: { type: 'object', properties: { enabled: { type: 'boolean' }, day: { type: 'string' }, search: { type: 'string' } } } },
      { name: 'tasky_toggle_reminder', description: 'Enable/disable a reminder', input_schema: { type: 'object', properties: { id: { type: 'string' }, enabled: { type: 'boolean' } }, required: ['id', 'enabled'] } }
    ];
  }

  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const name = request.params.name;
    const args: any = request.params.arguments || {};
    try {
      switch (name) {
        case 'tasky_create_task':
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


