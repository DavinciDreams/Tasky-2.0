// Use require to avoid TS module resolution issues with electron types in lint
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcMain, app, BrowserWindow } = require('electron');
import * as path from 'path';
import * as fs from 'fs';
import { TaskyEngine } from '../core/task-manager/tasky-engine';
import { SqliteTaskStorage } from '../core/storage/SqliteTaskStorage';
import { TaskyTask, TaskyTaskSchema, TaskStatus, CreateTaskInput, UpdateTaskInput } from '../types/task';
import logger from '../lib/logger';
import { notificationUtility } from './notification-utility';

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
  private dbPath: string;

  constructor() {
    // Always use SQLite as the single source of truth
    const envDbPath = process.env.TASKY_DB_PATH;
    this.dbPath = envDbPath && typeof envDbPath === 'string' && envDbPath.trim().length > 0
      ? (path.isAbsolute(envDbPath) ? envDbPath : path.join(process.cwd(), envDbPath))
      : path.join(process.cwd(), 'data', 'tasky.db');

    const storageImpl = new SqliteTaskStorage(this.dbPath);
    logger.info('Using SQLite task storage at', this.dbPath);

    this.engine = new TaskyEngine(undefined, storageImpl);
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
    ipcMain.handle('task:create', async (event: any, taskInput: CreateTaskInput) => {
      try {
        validateCreateTask(taskInput);
        const result = await this.engine.createTask(taskInput);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to create task');
        }
        
        const task = result.data!;
        
        // Show creation notification
        notificationUtility.showTaskCreatedNotification(
          task.schema.title,
          task.schema.description
        );
        
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

    ipcMain.handle('task:update', async (event: any, id: string, updates: UpdateTaskInput) => {
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

    ipcMain.handle('task:delete', async (event: any, id: string) => {
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

    ipcMain.handle('task:get', async (event: any, id: string) => {
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

    ipcMain.handle('task:list', async (event: any, filters?: any) => {
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

    ipcMain.handle('task:stats', async (event: any) => {
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

    // Cheap last-updated value to support lightweight polling in renderer
    ipcMain.handle('task:last-updated', async () => {
      try {
        // Touch engine load to ensure cache is warm
        await this.engine.getTasks();
        return (this.engine as any).getLastUpdated ? (this.engine as any).getLastUpdated() : Date.now();
      } catch {
        return Date.now();
      }
    });

    // Task analysis and insights
    ipcMain.handle('task:analyze', async (event: any) => {
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
    ipcMain.handle('task:bulk-update-status', async (event: any, taskIds: string[], status: TaskStatus) => {
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
    ipcMain.handle('task:archive-completed', async (event: any) => {
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
    ipcMain.handle('task:export', async (event: any) => {
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

    ipcMain.handle('task:import', async (event: any, importPayload: any) => {
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

        const parseCsvLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // skip escaped quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (ch === ',' && !inQuotes) {
              result.push(current);
              current = '';
            } else {
              current += ch;
            }
          }
          result.push(current);
          return result.map((s) => s.trim());
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
              const first = lines[0].replace(/^\uFEFF/, '');
              const headers: string[] = parseCsvLine(first).map((h: string) => h.trim());
              records = lines.slice(1).map((line: string) => {
                const cols: string[] = parseCsvLine(line);
                const obj: any = {};
                headers.forEach((h: string, i: number) => (obj[h] = (cols[i] ?? '').trim()));
                return obj;
              });
            }
          } else if (ext === 'yaml' || ext === 'yml') {
            // lazy load at runtime to avoid TS type requirement
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const yaml = require('yaml');
            const parsed = yaml.parse(raw);
            if (Array.isArray(parsed)) records = parsed;
            else if (parsed && Array.isArray(parsed.tasks)) records = parsed.tasks;
          } else if (ext === 'xml') {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    ipcMain.handle('task:execute', async (event: any, id: string, options?: { agent?: 'claude' | 'gemini' }) => {
      return this.executeTask(id, options);
    });

    // Mark task as completed (explicit endpoint for integrations or quick-complete)
    ipcMain.handle('task:mark-completed', async (event: any, id: string) => {
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

  /**
   * Execute a task - public method that can be called directly or via IPC
   */
  public async executeTask(id: string, options?: { agent?: 'claude' | 'gemini' }): Promise<any> {
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

      // Determine execution directory
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

      // Always use external agent execution - no built-in actions
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
                // Use Tasky assistant notification instead of Windows notification
                try {
                  const assistant: any = (global as any).assistant;
                  if (assistant && typeof assistant.speak === 'function') {
                    assistant.speak(`Completed: ${result.data.schema.title}`);
                  }
                } catch {}
              }
            } catch {}
          } else if (Date.now() - start > maxWaitMs) {
            clearInterval(interval);
          }
        } catch {
          clearInterval(interval);
        }
      }, pollIntervalMs);

      return { success: true, performed: 'external agent execution', provider, taskId: id };
    } catch (error) {
      logger.error('Error executing task:', error);
      throw error;
    }
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
        logger.warn('Failed to load tasks for notification scheduling:', tasksResult.error);
        return;
      }
      
      let tasks = tasksResult.data;
      
      for (const task of tasks) {
        if (task.schema.dueDate && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.ARCHIVED) {
          this.notificationManager.scheduleTaskDueNotification(task);
        }
      }
      
      logger.info(`Initialized task manager with ${tasks.length} tasks`);
    } catch (error) {
      logger.error('Error initializing task manager:', error);
      throw error;
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

   logger.debug(`Scheduled notification for task "${task.schema.title}" at ${notificationTime.toLocaleString()}`);
  }

  private sendTaskDueNotification(task: TaskyTask): void {
    try {
      // Use Tasky assistant notification instead of Windows notification
      const assistant: any = (global as any).assistant;
      if (assistant && typeof assistant.speak === 'function') {
        assistant.speak(`Task due soon: ${task.schema.title}`);
      }
      
      // Remove from tracking after showing
      this.notifications.delete(task.schema.id);
      
      logger.debug(`Sent notification for task: ${task.schema.title}`);
    } catch (error) {
      logger.warn('Error sending task notification:', error);
    }
  }

  cancelNotification(taskId: string): void {
    const timeout = this.notifications.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.notifications.delete(taskId);
    logger.debug(`Cancelled notification for task: ${taskId}`);
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
   logger.debug('Cleaned up all task notifications');
  }
}
