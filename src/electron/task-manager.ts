import { ipcMain, app, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { TaskyEngine } from '../core/task-manager/tasky-engine';
import { TaskyTask, TaskyTaskSchema, TaskStatus, CreateTaskInput, UpdateTaskInput } from '../types/task';
import logger from '../lib/logger';

/**
 * ElectronTaskManager
 *
 * Bridges the renderer with TaskyEngine via IPC channels. Handles:
 * - Task CRUD, listing, stats/analytics, bulk actions, archiving
 * - Import/export helpers (file path or structured payloads)
 * - Due date notifications (15-min prior) through TaskNotificationManager
 */
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
    const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
    const isAssignedAgent = (v: any) => v === undefined || v === 'gemini' || v === 'claude';
    const validateCreateTask = (input: any) => {
      if (!input || !isNonEmptyString(input.title)) throw new Error('Invalid title');
      if (!isAssignedAgent(input.assignedAgent)) throw new Error("assignedAgent must be 'gemini' or 'claude'");
    };
    const validateUpdateTask = (updates: any) => {
      if (updates && updates.assignedAgent !== undefined && !isAssignedAgent(updates.assignedAgent)) {
        throw new Error("assignedAgent must be 'gemini' or 'claude'");
      }
      if (updates && updates.status !== undefined && !Object.values(TaskStatus).includes(updates.status)) {
        throw new Error('Invalid status');
      }
    };
    const validateImportPayload = (payload: any) => {
      if (!payload || (typeof payload !== 'object')) throw new Error('Invalid import payload');
      if ('filePath' in payload) {
        if (!isNonEmptyString(payload.filePath)) throw new Error('Invalid filePath');
        return;
      }
      if ('tasks' in payload) {
        if (!Array.isArray((payload as any).tasks)) throw new Error('Invalid tasks array');
        return;
      }
      throw new Error('Invalid import payload');
    };
    // Task CRUD operations
    ipcMain.handle('task:create', async (event, taskInput: CreateTaskInput) => {
      try {
        validateCreateTask(taskInput);
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
        logger.error('Error creating task:', error);
        throw error;
      }
    });

    ipcMain.handle('task:update', async (event, id: string, updates: UpdateTaskInput) => {
      try {
        if (!isNonEmptyString(id)) throw new Error('Invalid id');
        validateUpdateTask(updates);
        const result = await this.engine.updateTask(id, updates);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update task');
        }
        
        const task = result.data!;

        // Announce status changes via assistant bubble
        try {
          const assistant: any = (global as any).assistant;
          if (assistant && typeof assistant.speak === 'function' && updates && typeof updates === 'object') {
            if ((updates as any).status === TaskStatus.IN_PROGRESS) {
              assistant.speak(`Started: ${task.schema.title}`);
            }
            if ((updates as any).status === TaskStatus.COMPLETED) {
              assistant.speak(`Completed: ${task.schema.title}`);
            }
          }
        } catch {}
        
        // Update notification if due date changed
        if (task.schema.dueDate) {
          this.notificationManager.cancelNotification(id);
          if (task.reminderEnabled !== false) {
            this.notificationManager.scheduleTaskDueNotification(task);
          }
        }
        
        return task;
      } catch (error) {
        logger.error('Error updating task:', error);
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
        logger.error('Error deleting task:', error);
        // Attempt a soft-reload of tasks storage and report a friendly error
        try {
          await this.engine.initialize();
        } catch {}
        throw error;
      }
    });

    ipcMain.handle('task:get', async (event, id: string) => {
      try {
        if (!isNonEmptyString(id)) throw new Error('Invalid id');
        const result = await this.engine.getTask(id);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to get task');
        }
        
        return result.data;
      } catch (error) {
        logger.error('Error getting task:', error);
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
        logger.error('Error listing tasks:', error);
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
        logger.error('Error getting task stats:', error);
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
        logger.error('Error analyzing tasks:', error);
        throw error;
      }
    });

    // Bulk operations
    ipcMain.handle('task:bulk-update-status', async (event, taskIds: string[], status: TaskStatus) => {
      try {
        if (!Array.isArray(taskIds) || taskIds.some(id => !isNonEmptyString(id))) throw new Error('Invalid taskIds');
        if (!Object.values(TaskStatus).includes(status)) throw new Error('Invalid status');
        const results = [];
        for (const id of taskIds) {
          const result = await this.engine.updateTask(id, { status });
          if (result.success && result.data) {
            results.push(result.data);
          }
        }
        return results;
      } catch (error) {
        logger.error('Error bulk updating tasks:', error);
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
        logger.error('Error archiving completed tasks:', error);
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
          tasks: tasks.success && tasks.data ? tasks.data : []
        };
      } catch (error) {
        logger.error('Error exporting tasks:', error);
        throw error;
      }
    });

    ipcMain.handle('task:import', async (event, importPayload: any) => {
      try {
        validateImportPayload(importPayload);
        const createdTasks: TaskyTask[] = [];
        let failedCount = 0;

        // Helper: create a task safely and push to createdTasks on success
        const tryCreate = async (input: any) => {
          try {
            const result = await this.engine.createTask(input);
            if (result.success && result.data) {
              createdTasks.push(result.data);
            } else {
              failedCount++;
            }
          } catch {
            failedCount++;
          }
        };

        const toStringLoose = (v: any): string => {
          if (v === null || v === undefined) return '';
          if (Array.isArray(v)) return v.length ? String(v[0]) : '';
          return String(v);
        };

        const normalizeFiles = (v: any): string[] | undefined => {
          if (!v) return undefined;
          if (Array.isArray(v)) return v.map((s) => String(s)).filter(Boolean);
          const s = String(v);
          if (!s.trim()) return undefined;
          if (s.includes('|')) return s.split('|').map((p) => p.trim()).filter(Boolean);
          return [s.trim()];
        };

        const normalizeRecord = (rec: any) => {
          const title = toStringLoose(rec.title).trim();
          const description = toStringLoose(rec.description).trim();
          const agentRaw = toStringLoose(rec.assignedAgent).toLowerCase();
          const assignedAgent = agentRaw === 'claude' ? 'claude' : agentRaw === 'gemini' ? 'gemini' : undefined;
          const executionPath = toStringLoose(rec.executionPath).trim();
          const affectedFiles = normalizeFiles(rec.affectedFiles);
          const input: any = {};
          if (title) input.title = title;
          if (description) input.description = description;
          if (assignedAgent) input.assignedAgent = assignedAgent;
          if (executionPath) input.executionPath = executionPath;
          if (affectedFiles && affectedFiles.length) input.affectedFiles = affectedFiles;
          return input;
        };

        // Path A: import from file path
        if (importPayload && typeof importPayload === 'object' && importPayload.filePath) {
          const filePath = importPayload.filePath as string;
          const ext = (filePath.split('.').pop() || '').toLowerCase();
          const raw = require('fs').readFileSync(filePath, 'utf-8');
          let records: any[] = [];
          if (ext === 'json') {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) records = parsed;
              else if (parsed && Array.isArray(parsed.tasks)) records = parsed.tasks;
            } catch {}
          } else if (ext === 'csv') {
            const lines: string[] = raw.split(/\r?\n/).filter(Boolean);
            if (lines.length > 0) {
              const headers: string[] = lines[0].split(',').map((h: string) => h.trim());
              records = lines.slice(1).map((line: string) => {
                const cols: string[] = line.split(',');
                const obj: any = {};
                headers.forEach((h: string, i: number) => (obj[h] = cols[i]?.trim()));
                // affectedFiles normalization is handled later
                return obj;
              });
            }
          } else if (ext === 'yaml' || ext === 'yml') {
            const yaml = require('yaml');
            const parsed = yaml.parse(raw);
            if (Array.isArray(parsed)) records = parsed;
            else if (parsed && Array.isArray(parsed.tasks)) records = parsed.tasks;
          } else if (ext === 'xml') {
            const xml2js = require('xml2js');
            const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true, trim: true });
            const parsed = await parser.parseStringPromise(raw).catch(() => null);
            let tasks = parsed?.tasks?.task || [];
            if (!Array.isArray(tasks)) tasks = tasks ? [tasks] : [];
            // affectedFiles may be a single string or array of strings depending on repeats
            records = tasks;
          }
          for (const rec of records) {
            const input = normalizeRecord(rec);
            if (input.title) await tryCreate(input);
          }
          return createdTasks;
        }

        // Path B: import from structured payload { tasks: [...] }
        if (importPayload && Array.isArray(importPayload.tasks)) {
          for (const taskData of importPayload.tasks) {
            const rawRec = taskData.schema ? taskData.schema : taskData;
            const input = normalizeRecord(rawRec);
            if (input.title) await tryCreate(input);
          }
          return createdTasks;
        }

        return createdTasks;
      } catch (error) {
        logger.error('Error importing tasks:', error);
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

        // Announce start and attempt to set status to IN_PROGRESS
        try {
          const assistant: any = (global as any).assistant;
          if (assistant && typeof assistant.speak === 'function') {
            assistant.speak(`Executing: ${task.schema.title}`);
          }
        } catch {}
        try { await this.engine.updateTask(id, { status: TaskStatus.IN_PROGRESS } as any); } catch {}

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

        // Handle: "create <folder> with file <name>" in one built-in action
        const folderWithFileMatch = text.match(/create\s+(?:a\s+)?(?:new\s+)?(?:folder|directory)\s+(?:named\s+)?\"?([\w\-\.\s]+)\"?(?:\s+|.*?)(?:with\s+(?:a\s+)?)?(?:file|document)\s+(?:named\s+)?\"?([\w\-\.\s]+)\"?/i);
        if (folderWithFileMatch && folderWithFileMatch[1] && folderWithFileMatch[2]) {
          const rawFolder = folderWithFileMatch[1].trim();
          const rawFile = folderWithFileMatch[2].trim();
          const safeFolder = rawFolder.replace(/[\\\/:*?"<>|]/g, '').trim();
          const safeFile = rawFile.replace(/[\\\/:*?"<>|]/g, '').trim();
          if (!safeFolder || !safeFile) {
            return { success: false, error: 'Invalid folder or file name' };
          }
          const folderPath = path.join(baseDir, safeFolder);
          const filePath = path.join(folderPath, safeFile);
          try {
            fs.mkdirSync(folderPath, { recursive: true });
            fs.writeFileSync(filePath, 'Test file created successfully!\n', 'utf-8');
            try { new Notification({ title: 'Tasky', body: `Created: ${filePath}` }).show(); } catch {}
            try { await this.engine.updateTask(id, { status: TaskStatus.COMPLETED } as any); } catch {}
            return { success: true, performed: 'mkdir+file', folder: folderPath, file: filePath };
          } catch (e) {
            return { success: false, error: `Failed to create folder/file: ${(e as Error).message}` };
          }
        }

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
        // Watch for sentinel file to auto-complete
        const sentinelDir = path.join(baseDir, '.tasky', 'status');
        const sentinelFile = `done-${id}`;
        try { fs.mkdirSync(sentinelDir, { recursive: true }); } catch {}
        const sentinelPath = path.join(sentinelDir, sentinelFile);
        try { if (fs.existsSync(sentinelPath)) fs.unlinkSync(sentinelPath); } catch {}

        // Launch execution without blocking the event loop
        exec.execute(task, provider).catch((e) => logger.error('Agent execution failed:', e));

        // Start a short-lived watcher to detect completion
        const maxWaitMs = 60 * 1000; // 60s
        const pollIntervalMs = 1000;
        const start = Date.now();
        const interval = setInterval(async () => {
          try {
            if (fs.existsSync(sentinelPath)) {
              clearInterval(interval);
              try { fs.unlinkSync(sentinelPath); } catch {}
              try {
                const result = await this.engine.updateTask(id, { status: TaskStatus.COMPLETED } as any);
                if (result.success && result.data) {
                  try { new Notification({ title: 'Tasky', body: `Completed: ${result.data.schema.title}` }).show(); } catch {}
                }
              } catch {}
            } else if (Date.now() - start > maxWaitMs) {
              clearInterval(interval);
            }
          } catch {
            clearInterval(interval);
          }
        }, pollIntervalMs);

        return { success: true };
      } catch (error) {
        logger.error('Error executing task:', error);
        throw error;
      }
    });

    // Mark task as completed (explicit endpoint for integrations or quick-complete)
    ipcMain.handle('task:mark-completed', async (event, id: string) => {
      try {
        const result = await this.engine.updateTask(id, { status: TaskStatus.COMPLETED } as any);
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to mark task completed');
        }
        const task = result.data;
        // Assistant bubble notification
        try {
          const assistant: any = (global as any).assistant;
          if (assistant && typeof assistant.speak === 'function') {
            assistant.speak(`Completed: ${task.schema.title}`);
          }
        } catch {}
        return task;
      } catch (error) {
        logger.error('Error marking task completed:', error);
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
      logger.error('Error initializing task manager:', error);
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
