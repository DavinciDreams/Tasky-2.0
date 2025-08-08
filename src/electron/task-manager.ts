import { ipcMain, app, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { TaskyEngine } from '../core/task-manager/tasky-engine';
import { TaskyTask, TaskyTaskSchema, TaskStatus, CreateTaskInput, UpdateTaskInput } from '../types/task';

export class ElectronTaskManager {
  private engine: TaskyEngine;
  private notificationManager: TaskNotificationManager;

  constructor() {
    // Prefer a shared path so MCP and Electron read/write the same store
    const envTasksPath = process.env.TASKY_TASKS_PATH;
    const resolvedTasksPath = envTasksPath
      ? path.isAbsolute(envTasksPath)
        ? envTasksPath
        : path.join(process.cwd(), envTasksPath)
      : path.join(app.getPath('userData'), 'tasky-tasks.json');

    this.engine = new TaskyEngine(resolvedTasksPath);
    this.notificationManager = new TaskNotificationManager();
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // Task CRUD operations
    ipcMain.handle('task:create', async (event, taskInput: CreateTaskInput) => {
      try {
        const result = await this.engine.createTask(taskInput);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create task');
        }
        
        const task = result.data!;
        
        // Schedule notification if task has due date
        if (task.schema.dueDate) {
          this.notificationManager.scheduleTaskDueNotification(task);
        }
        
        return task;
      } catch (error) {
        console.error('Error creating task:', error);
        throw error;
      }
    });

    ipcMain.handle('task:update', async (event, id: string, updates: UpdateTaskInput) => {
      try {
        const result = await this.engine.updateTask(id, updates);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update task');
        }
        
        const task = result.data!;
        
        // Update notification if due date changed
        if (task.schema.dueDate) {
          this.notificationManager.cancelNotification(id);
          if (task.reminderEnabled !== false) {
            this.notificationManager.scheduleTaskDueNotification(task);
          }
        }
        
        return task;
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    });

    ipcMain.handle('task:delete', async (event, id: string) => {
      try {
        const result = await this.engine.deleteTask(id);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to delete task');
        }
        
        this.notificationManager.cancelNotification(id);
        return result.data;
      } catch (error) {
        console.error('Error deleting task:', error);
        // Attempt a soft-reload of tasks storage and report a friendly error
        try {
          await this.engine.initialize();
        } catch {}
        throw error;
      }
    });

    ipcMain.handle('task:get', async (event, id: string) => {
      try {
        const result = await this.engine.getTask(id);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to get task');
        }
        
        return result.data;
      } catch (error) {
        console.error('Error getting task:', error);
        throw error;
      }
    });

    ipcMain.handle('task:list', async (event, filters?: any) => {
      try {
        const result = await this.engine.getTasks(filters);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to list tasks');
        }
        
        return result.data || [];
      } catch (error) {
        console.error('Error listing tasks:', error);
        throw error;
      }
    });

    ipcMain.handle('task:stats', async (event) => {
      try {
        const result = await this.engine.getTaskAnalytics();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to get task stats');
        }
        
        return result.data;
      } catch (error) {
        console.error('Error getting task stats:', error);
        throw error;
      }
    });

    // Task analysis and insights
    ipcMain.handle('task:analyze', async (event) => {
      try {
        const observation = await this.engine.observe();
        const strategy = await this.engine.orient(observation);
        const actions = await this.engine.decide(strategy);
        
        return {
          observation,
          strategy,
          suggestedActions: actions
        };
      } catch (error) {
        console.error('Error analyzing tasks:', error);
        throw error;
      }
    });

    // Bulk operations
    ipcMain.handle('task:bulk-update-status', async (event, taskIds: string[], status: TaskStatus) => {
      try {
        const results = [];
        for (const id of taskIds) {
          const result = await this.engine.updateTask(id, { status });
          if (result.success && result.data) {
            results.push(result.data);
          }
        }
        return results;
      } catch (error) {
        console.error('Error bulk updating tasks:', error);
        throw error;
      }
    });

    // Archive completed tasks
    ipcMain.handle('task:archive-completed', async (event) => {
      try {
        const tasksResult = await this.engine.getTasks();
        
        if (!tasksResult.success || !tasksResult.data) {
          throw new Error(tasksResult.error || 'Failed to get tasks');
        }
        
        const completedTasks = tasksResult.data.filter((t: TaskyTask) => t.status === TaskStatus.COMPLETED);
        const results = [];
        
        for (const task of completedTasks) {
          const archiveResult = await this.engine.updateTask(task.schema.id, { 
            status: TaskStatus.ARCHIVED
          });
          
          if (archiveResult.success && archiveResult.data) {
            results.push(archiveResult.data);
          }
        }
        
        return results;
      } catch (error) {
        console.error('Error archiving completed tasks:', error);
        throw error;
      }
    });

    // Import/Export functionality
    ipcMain.handle('task:export', async (event) => {
      try {
        const tasks = await this.engine.getTasks();
        return {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          tasks: tasks
        };
      } catch (error) {
        console.error('Error exporting tasks:', error);
        throw error;
      }
    });

    ipcMain.handle('task:import', async (event, importData: any) => {
      try {
        const results = [];
        for (const taskData of importData.tasks) {
          // Remove id and createdAt to create new tasks
          const { id, createdAt, ...taskInput } = taskData.schema;
          const task = await this.engine.createTask(taskInput);
          results.push(task);
        }
        return results;
      } catch (error) {
        console.error('Error importing tasks:', error);
        throw error;
      }
    });

    // Execute a task in an external terminal via assigned agent
    ipcMain.handle('task:execute', async (event, id: string, options?: { agent?: 'claude' | 'gemini' }) => {
      try {
        const taskResult = await this.engine.getTask(id);
        if (!taskResult.success || !taskResult.data) {
          throw new Error(taskResult.error || 'Failed to get task');
        }
        const task = taskResult.data;

        // Quick built-in actions (no external CLI)
        const baseDir = (() => {
          try {
            if (task.schema.executionPath) {
              return path.isAbsolute(task.schema.executionPath)
                ? task.schema.executionPath
                : path.join(process.cwd(), task.schema.executionPath);
            }
          } catch {}
          return process.cwd();
        })();

        const text = `${task.schema.title || ''}\n${task.schema.description || ''}`.toLowerCase();

        // Create folder pattern: "create a folder named X" or "create folder X"
        const folderMatch = text.match(/create\s+(?:a\s+)?(?:new\s+)?(?:folder|directory)\s+(?:named\s+)?\"?([\w\-\.\s]+)\"?/i);
        if (folderMatch && folderMatch[1]) {
          const rawName = folderMatch[1].trim();
          const safeName = rawName.replace(/[\\/:*?"<>|]/g, '').trim();
          if (!safeName) {
            return { success: false, error: 'Invalid folder name' };
          }
          const target = path.join(baseDir, safeName);
          try {
            fs.mkdirSync(target, { recursive: true });
            try {
              new Notification({ title: 'Tasky', body: `Created folder: ${target}` }).show();
            } catch {}
            return { success: true, performed: 'mkdir', path: target };
          } catch (e) {
            return { success: false, error: `Failed to create folder: ${(e as Error).message}` };
          }
        }

        // Fallback to external agent execution
        const provider: 'claude' | 'gemini' = (options?.agent as any)
          || (task.schema.assignedAgent?.toLowerCase() === 'claude' ? 'claude' : undefined)
          || 'gemini';

        const { AgentTerminalExecutor } = await import('./agent-executor');
        const exec = new AgentTerminalExecutor();
        await exec.execute(task, provider);
        return { success: true };
      } catch (error) {
        console.error('Error executing task:', error);
        throw error;
      }
    });
  }

  // Initialize task system
  async initialize(): Promise<void> {
    try {
      // Initialize the engine first
      const initResult = await this.engine.initialize();
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize task engine');
      }
      
      // Load existing tasks and schedule notifications
      const tasksResult = await this.engine.getTasks();
      
      if (!tasksResult.success || !tasksResult.data) {
        console.warn('Failed to load tasks for notification scheduling:', tasksResult.error);
        return;
      }
      
      const tasks = tasksResult.data;
      
      for (const task of tasks) {
        if (task.schema.dueDate && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.ARCHIVED) {
          this.notificationManager.scheduleTaskDueNotification(task);
        }
      }
      
      console.log(`Initialized task manager with ${tasks.length} tasks`);
    } catch (error) {
      console.error('Error initializing task manager:', error);
    }
  }

  // Cleanup method
  cleanup(): void {
    this.notificationManager.cleanup();
  }
}

export class TaskNotificationManager {
  private notifications: Map<string, NodeJS.Timeout> = new Map();

  scheduleTaskDueNotification(task: TaskyTask): void {
    if (!task.schema.dueDate || task.reminderEnabled === false) return;

    const now = new Date();
    const dueDate = new Date(task.schema.dueDate);
    
    // Schedule notification 15 minutes before due time
    const notificationTime = new Date(dueDate.getTime() - 15 * 60 * 1000);
    
    // Only schedule if notification time is in the future
    if (notificationTime <= now) return;

    const timeout = setTimeout(() => {
      this.sendTaskDueNotification(task);
    }, notificationTime.getTime() - now.getTime());

    // Cancel any existing notification for this task
    this.cancelNotification(task.schema.id);
    this.notifications.set(task.schema.id, timeout);

    console.log(`Scheduled notification for task "${task.schema.title}" at ${notificationTime.toLocaleString()}`);
  }

  private sendTaskDueNotification(task: TaskyTask): void {
    try {
      const notification = new Notification({
        title: '📋 Tasky Task Due Soon',
        body: `Task "${task.schema.title}" is due in 15 minutes!`,
        icon: path.join(__dirname, '../assets/icon.ico'),
        sound: path.join(__dirname, '../assets/notification.mp3'),
        urgency: 'normal',
        timeoutType: 'default'
      });

      notification.on('click', () => {
        // Focus the main window when notification is clicked
        // This would be handled by the main window manager
        console.log(`Notification clicked for task: ${task.schema.id}`);
      });

      notification.show();
      
      // Remove from tracking after showing
      this.notifications.delete(task.schema.id);
      
      console.log(`Sent notification for task: ${task.schema.title}`);
    } catch (error) {
      console.error('Error sending task notification:', error);
    }
  }

  cancelNotification(taskId: string): void {
    const timeout = this.notifications.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.notifications.delete(taskId);
      console.log(`Cancelled notification for task: ${taskId}`);
    }
  }

  cleanup(): void {
    // Cancel all pending notifications
    Array.from(this.notifications.keys()).forEach(taskId => {
      const timeout = this.notifications.get(taskId);
      if (timeout) {
        clearTimeout(timeout);
      }
    });
    this.notifications.clear();
    console.log('Cleaned up all task notifications');
  }
}
