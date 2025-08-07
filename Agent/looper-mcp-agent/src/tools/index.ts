import type { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { TaskManager } from '../utils/task-manager.js';
import {
  TaskCategory,
  Priority,
  TaskStatus,
  CreateTaskInput,
  TaskFilterOptions
} from '../types/index.js';

// For now, let's create simplified execution functionality
// We'll implement basic task execution without the full agent system
interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

/**
 * MCP Tools for Looper CLI integration
 */
export class LooperMCPTools {
  private taskManager: TaskManager;

  constructor(projectPath?: string) {
    this.taskManager = new TaskManager(projectPath);
  }

  /**
   * Get all available MCP tools
   */
  getTools(): Tool[] {
    return [
      {
        name: 'looper_create_task',
        description: 'Create a new task in the Looper CLI system',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the task'
            },
            description: {
              type: 'string',
              description: 'Detailed description of the task'
            },
            category: {
              type: 'string',
              enum: Object.values(TaskCategory),
              description: 'The category of the task'
            },
            priority: {
              type: 'number',
              enum: Object.values(Priority).filter(v => typeof v === 'number'),
              description: 'Priority level: 0=Low, 1=Medium, 2=High, 3=Critical'
            },
            affectedFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of files that will be affected by this task',
              default: []
            },
            estimatedDuration: {
              type: 'number',
              description: 'Estimated duration in minutes',
              minimum: 1
            },
            dependencies: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of task IDs this task depends on',
              default: []
            }
          },
          required: ['title', 'category', 'priority']
        }
      },
      {
        name: 'looper_list_tasks',
        description: 'List tasks with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(TaskStatus)
              },
              description: 'Filter by task status'
            },
            category: {
              type: 'array',
              items: {
                type: 'string',
                enum: Object.values(TaskCategory)
              },
              description: 'Filter by task category'
            },
            priority: {
              type: 'array',
              items: {
                type: 'number',
                enum: Object.values(Priority).filter(v => typeof v === 'number')
              },
              description: 'Filter by priority level'
            },
            search: {
              type: 'string',
              description: 'Search in task titles and descriptions'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tasks to return',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            offset: {
              type: 'number',
              description: 'Number of tasks to skip',
              minimum: 0,
              default: 0
            }
          }
        }
      },
      {
        name: 'looper_get_task',
        description: 'Get a specific task by ID',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to retrieve'
            }
          },
          required: ['taskId']
        }
      },
      {
        name: 'looper_update_task',
        description: 'Update an existing task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to update'
            },
            title: {
              type: 'string',
              description: 'New title for the task'
            },
            description: {
              type: 'string',
              description: 'New description for the task'
            },
            category: {
              type: 'string',
              enum: Object.values(TaskCategory),
              description: 'New category for the task'
            },
            priority: {
              type: 'number',
              enum: Object.values(Priority).filter(v => typeof v === 'number'),
              description: 'New priority level'
            },
            status: {
              type: 'string',
              enum: Object.values(TaskStatus),
              description: 'New status for the task'
            },
            affectedFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'Updated list of affected files'
            },
            estimatedDuration: {
              type: 'number',
              description: 'Updated estimated duration in minutes'
            },
            humanApproved: {
              type: 'boolean',
              description: 'Whether the task is approved by a human'
            },
            notes: {
              type: 'string',
              description: 'Additional notes about the task'
            }
          },
          required: ['taskId']
        }
      },
      {
        name: 'looper_delete_task',
        description: 'Delete a task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: {
              type: 'string',
              description: 'The ID of the task to delete'
            }
          },
          required: ['taskId']
        }
      },
      {
        name: 'looper_run_next_task',
        description: 'Execute the next available pending task automatically using Claude Code agent. This is a non-interactive mode designed for MCP usage with no manual steps or human-in-the-loop requirements.',
        inputSchema: {
          type: 'object',
          properties: {
            autoApprove: {
              type: 'boolean',
              description: 'Automatically approve the task before execution (default: true)',
              default: true
            }
          }
        }
      }
    ];
  }

  /**
   * Handle tool calls
   */
  async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    try {
      switch (request.params.name) {
        case 'looper_create_task':
          return await this.createTask(request.params.arguments);

        case 'looper_list_tasks':
          return await this.listTasks(request.params.arguments);

        case 'looper_get_task':
          return await this.getTask(request.params.arguments);

        case 'looper_update_task':
          return await this.updateTask(request.params.arguments);

        case 'looper_delete_task':
          return await this.deleteTask(request.params.arguments);

        case 'looper_run_next_task':
          return await this.runNextTask(request.params.arguments);

        default:
          return {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${request.params.name}`
              }
            ],
            isError: true
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${request.params.name}: ${error instanceof Error ? error.message : String(error)}`
          }
        ],
        isError: true
      };
    }
  }

  private async createTask(args: any): Promise<CallToolResult> {
    const input: CreateTaskInput = {
      title: args.title,
      description: args.description,
      category: args.category as TaskCategory,
      priority: args.priority as Priority,
      affectedFiles: args.affectedFiles || [],
      estimatedDuration: args.estimatedDuration,
      dependencies: args.dependencies || []
    };

    const result = await this.taskManager.createTask(input);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Task created successfully!\n\n**Task Details:**\n- ID: ${result.data?.schema.id}\n- Title: ${result.data?.schema.title}\n- Category: ${result.data?.schema.category}\n- Priority: ${result.data?.schema.priority}\n- Status: ${result.data?.status}\n\n${result.message}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to create task: ${result.error}`
          }
        ],
        isError: true
      };
    }
  }

  private async listTasks(args: any): Promise<CallToolResult> {
    const options: TaskFilterOptions = {
      status: args.status,
      category: args.category,
      priority: args.priority,
      search: args.search,
      limit: args.limit || 20,
      offset: args.offset || 0
    };

    const result = await this.taskManager.listTasks(options);

    if (result.success) {
      const tasks = result.data || [];
      if (tasks.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No tasks found matching the criteria.'
            }
          ]
        };
      }

      const taskList = tasks.map(task => 
        `**${task.schema.title}** (${task.schema.id})\n` +
        `- Status: ${task.status}\n` +
        `- Category: ${task.schema.category}\n` +
        `- Priority: ${task.schema.priority}\n` +
        `- Created: ${new Date(task.schema.createdAt).toLocaleDateString()}\n` +
        (task.schema.description ? `- Description: ${task.schema.description}\n` : '') +
        (task.schema.affectedFiles && task.schema.affectedFiles.length > 0 ? 
          `- Affected Files: ${task.schema.affectedFiles.join(', ')}\n` : '')
      ).join('\n---\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${tasks.length} task(s):\n\n${taskList}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to list tasks: ${result.error}`
          }
        ],
        isError: true
      };
    }
  }

  private async getTask(args: any): Promise<CallToolResult> {
    const result = await this.taskManager.getTask(args.taskId);

    if (result.success && result.data) {
      const task = result.data;
      return {
        content: [
          {
            type: 'text',
            text: `**Task Details:**\n\n` +
              `**ID:** ${task.schema.id}\n` +
              `**Title:** ${task.schema.title}\n` +
              `**Description:** ${task.schema.description || 'No description'}\n` +
              `**Category:** ${task.schema.category}\n` +
              `**Priority:** ${task.schema.priority}\n` +
              `**Status:** ${task.status}\n` +
              `**Human Approved:** ${task.humanApproved ? 'Yes' : 'No'}\n` +
              `**Created:** ${new Date(task.schema.createdAt).toLocaleString()}\n` +
              `**Last Modified:** ${new Date(task.metadata.lastModified).toLocaleString()}\n` +
              `**Version:** ${task.metadata.version}\n` +
              `**Created By:** ${task.metadata.createdBy}\n` +
              (task.schema.estimatedDuration ? `**Estimated Duration:** ${task.schema.estimatedDuration} minutes\n` : '') +
              (task.schema.affectedFiles && task.schema.affectedFiles.length > 0 ? 
                `**Affected Files:**\n${task.schema.affectedFiles.map(f => `- ${f}`).join('\n')}\n` : '') +
              (task.schema.dependencies && task.schema.dependencies.length > 0 ? 
                `**Dependencies:**\n${task.schema.dependencies.map(d => `- ${d}`).join('\n')}\n` : '') +
              (task.metadata.notes ? `**Notes:** ${task.metadata.notes}\n` : '')
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get task: ${result.error}`
          }
        ],
        isError: true
      };
    }
  }

  private async updateTask(args: any): Promise<CallToolResult> {
    const updates: any = {};
    
    // Build updates object from provided arguments
    if (args.title !== undefined) updates.schema = { ...updates.schema, title: args.title };
    if (args.description !== undefined) updates.schema = { ...updates.schema, description: args.description };
    if (args.category !== undefined) updates.schema = { ...updates.schema, category: args.category };
    if (args.priority !== undefined) updates.schema = { ...updates.schema, priority: args.priority };
    if (args.affectedFiles !== undefined) updates.schema = { ...updates.schema, affectedFiles: args.affectedFiles };
    if (args.estimatedDuration !== undefined) updates.schema = { ...updates.schema, estimatedDuration: args.estimatedDuration };
    if (args.status !== undefined) updates.status = args.status;
    if (args.humanApproved !== undefined) updates.humanApproved = args.humanApproved;
    if (args.notes !== undefined) updates.metadata = { ...updates.metadata, notes: args.notes };

    const result = await this.taskManager.updateTask(args.taskId, updates);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Task updated successfully!\n\n**Updated Task:**\n- ID: ${result.data?.schema.id}\n- Title: ${result.data?.schema.title}\n- Status: ${result.data?.status}\n- Last Modified: ${new Date(result.data?.metadata.lastModified || '').toLocaleString()}\n\n${result.message}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to update task: ${result.error}`
          }
        ],
        isError: true
      };
    }
  }

  private async deleteTask(args: any): Promise<CallToolResult> {
    const result = await this.taskManager.deleteTask(args.taskId);

    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Task deleted successfully!\n\n**Deleted Task ID:** ${args.taskId}\n\n${result.message}`
          }
        ]
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to delete task: ${result.error}`
          }
        ],
        isError: true
      };
    }
  }

  private async runNextTask(args: any): Promise<CallToolResult> {
    try {
      // Find the next pending task
      const tasksResult = await this.taskManager.listTasks({
        status: [TaskStatus.PENDING],
        limit: 1,
        offset: 0
      });

      if (!tasksResult.success || !tasksResult.data || tasksResult.data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 **No Pending Tasks Available**

No pending tasks were found to execute. All tasks may already be completed or in progress.

**Suggestion:** Create new tasks or check task status using \`looper_list_tasks\`.`
            }
          ]
        };
      }

      const nextTask = tasksResult.data[0];
      const autoApprove = args.autoApprove !== false; // Default to true

      // Auto-approve the task if requested
      if (autoApprove && !nextTask.humanApproved) {
        await this.taskManager.updateTask(nextTask.schema.id, {
          humanApproved: true
        });
      }
      
      // Update task status to IN_PROGRESS
      await this.taskManager.updateTaskStatus(nextTask.schema.id, TaskStatus.IN_PROGRESS);
      
      // Execute the task directly by creating context and running Claude
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const path = await import('path');
      
      const projectRoot = process.cwd();
      
      // Build the task prompt (similar to buildTaskPrompt in agent-executor.ts)
      let prompt = `Task: ${nextTask.schema.title}\n`;
      
      if (nextTask.schema.description) {
        prompt += `\nDescription: ${nextTask.schema.description}\n`;
      }
      
      prompt += `\nCategory: ${nextTask.schema.category}`;
      prompt += `\nPriority: ${nextTask.schema.priority}`;
      prompt += `\nTask ID: ${nextTask.schema.id}`;
      
      if (nextTask.schema.affectedFiles && nextTask.schema.affectedFiles.length > 0) {
        prompt += `\n\nAffected Files:\n${nextTask.schema.affectedFiles.join('\n')}`;
      }
      
      // Add automatic status update instructions
      prompt += `\n\n🤖 IMPORTANT - AUTOMATIC STATUS UPDATE:
After completing this task, you MUST update the task status in the tasks/tasks.json file.

Find the task with ID "${nextTask.schema.id}" and update its status field to one of:
- "COMPLETED" - Task finished successfully
- "NEEDS_REVIEW" - Task completed but requires human review

Example update:
{
  "schema": {
    "id": "${nextTask.schema.id}",
    ...
  },
  "status": "COMPLETED",  // ← UPDATE THIS
  ...
}

Repository Location: ${projectRoot}
Tasks File: ${projectRoot}/tasks/tasks.json

This status update is REQUIRED - the system depends on it for task tracking.`;
      
      // Create task context file
      const contextPath = path.join(projectRoot, 'task_context.md');
      const contextContent = `# TASK EXECUTION REQUEST

## Task Details
- **Title**: ${nextTask.schema.title}
- **Description**: ${nextTask.schema.description || 'No description'}
- **Category**: ${nextTask.schema.category}
- **Priority**: ${nextTask.schema.priority}
- **Task ID**: ${nextTask.schema.id}

## Instructions
${prompt}

## Repository Context
Working in: ${projectRoot}

## Action Required
1. Analyze the repository structure
2. Understand the task requirements above
3. Implement the necessary changes
4. **IMPORTANT**: Update the task status in \`tasks/tasks.json\` from "IN_PROGRESS" to "COMPLETED" for task ID: ${nextTask.schema.id}

## Files to Check
- \`tasks/tasks.json\` - Update task status when complete
- Repository files as needed for the task

Please complete this task and update the status accordingly.
`;
      
      fs.writeFileSync(contextPath, contextContent);
      
      try {
        // Execute Claude with the context file
        const os = await import('os');
        let command: string;
        
        if (os.platform() === 'win32') {
          // On Windows, use WSL to run claude
          const wslPath = contextPath.replace(/^C:/i, '/mnt/c').replace(/\\/g, '/');
          command = `wsl -- claude --dangerously-skip-permissions "${wslPath}"`;
        } else {
          // On Unix-like systems, run directly
          command = `claude --dangerously-skip-permissions "${contextPath}"`;
        }
        
        const result = execSync(
          command,
          {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 300000 // 5 minute timeout
          }
        );
        
        // Clean up context file
        fs.unlinkSync(contextPath);
        
        // Check if task was completed by reading the updated task
        const updatedTaskResult = await this.taskManager.getTask(nextTask.schema.id);
        const updatedTask = updatedTaskResult.data;
        
        if (updatedTask && updatedTask.status === TaskStatus.COMPLETED) {
          return {
            content: [
              {
                type: 'text',
                text: `✅ **Task Executed Successfully!**

**Task:** ${nextTask.schema.title}
**ID:** ${nextTask.schema.id}
**Agent:** Claude Code
**Status:** COMPLETED

The task has been completed and the status has been updated in tasks.json.

**Execution Output:**
${result.substring(0, 1000)}${result.length > 1000 ? '...' : ''}`
              }
            ]
          };
        } else {
          // Task wasn't marked as completed, needs review
          await this.taskManager.updateTaskStatus(nextTask.schema.id, TaskStatus.NEEDS_REVIEW);
          
          return {
            content: [
              {
                type: 'text',
                text: `⚠️ **Task Execution Needs Review**

**Task:** ${nextTask.schema.title}
**ID:** ${nextTask.schema.id}
**Agent:** Claude Code
**Status:** NEEDS_REVIEW

The task execution completed but the task wasn't marked as COMPLETED in tasks.json.
This may mean the task needs manual review or intervention.

**Execution Output:**
${result.substring(0, 1000)}${result.length > 1000 ? '...' : ''}`
              }
            ]
          };
        }
      } catch (error) {
        // Clean up context file if it exists
        if (fs.existsSync(contextPath)) {
          fs.unlinkSync(contextPath);
        }
        
        // Update task status to needs review
        await this.taskManager.updateTaskStatus(nextTask.schema.id, TaskStatus.NEEDS_REVIEW);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Task Execution Failed**

**Task:** ${nextTask.schema.title}
**ID:** ${nextTask.schema.id}
**Agent:** Claude Code
**Status:** NEEDS_REVIEW

**Error:**
${errorMessage}

The task has been marked for manual review.`
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
              text: `❌ Error running next task: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
        isError: true
      };
    }
  }
}