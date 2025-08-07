import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { TaskyTask, TaskFile, ToolResult } from '../../types/task';

export class TaskStorage {
  private tasksFilePath: string;

  constructor(storagePath?: string) {
    this.tasksFilePath = storagePath || this.getDefaultStoragePath();
  }

  /**
   * Initialize storage - create directories and files if they don't exist
   */
  async initialize(): Promise<ToolResult<void>> {
    try {
      const tasksDir = path.dirname(this.tasksFilePath);
      await fs.mkdir(tasksDir, { recursive: true });

      if (!fsSync.existsSync(this.tasksFilePath)) {
        await this.initializeTaskFile();
      }

      return { success: true, message: 'Task storage initialized successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize task storage'
      };
    }
  }

  /**
   * Save a single task
   */
  async saveTask(task: TaskyTask): Promise<ToolResult<void>> {
    try {
      const tasksResult = await this.loadAllTasks();
      if (!tasksResult.success || !tasksResult.data) {
        return { success: false, error: 'Failed to load existing tasks' };
      }

      const tasks = tasksResult.data;
      const existingIndex = tasks.findIndex(t => t.schema.id === task.schema.id);

      if (existingIndex >= 0) {
        tasks[existingIndex] = task;
      } else {
        tasks.push(task);
      }

      return await this.saveAllTasks(tasks);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save task'
      };
    }
  }

  /**
   * Load all tasks from storage
   */
  async loadAllTasks(): Promise<ToolResult<TaskyTask[]>> {
    try {
      if (!fsSync.existsSync(this.tasksFilePath)) {
        await this.initializeTaskFile();
        return { success: true, data: [] };
      }

      const fileContent = await fs.readFile(this.tasksFilePath, 'utf-8');
      const taskFile: TaskFile = JSON.parse(fileContent);
      
      // Convert date strings back to Date objects
      const tasks = taskFile.tasks.map(task => this.deserializeTask(task));
      
      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load tasks'
      };
    }
  }

  /**
   * Save all tasks to storage
   */
  async saveAllTasks(tasks: TaskyTask[]): Promise<ToolResult<void>> {
    try {
      // Serialize tasks (convert dates to strings)
      const serializedTasks = tasks.map(task => this.serializeTask(task));
      
      const taskFile: TaskFile = {
        version: '1.0',
        lastSaved: new Date().toISOString(),
        tasks: serializedTasks,
        metadata: {
          totalTasks: tasks.length,
          lastTaskId: tasks.length > 0 ? tasks[tasks.length - 1].schema.id : '',
        }
      };

      await fs.writeFile(this.tasksFilePath, JSON.stringify(taskFile, null, 2), 'utf-8');
      
      return { success: true, message: 'All tasks saved successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save tasks'
      };
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<ToolResult<TaskyTask | null>> {
    try {
      const tasksResult = await this.loadAllTasks();
      if (!tasksResult.success || !tasksResult.data) {
        return { success: false, error: 'Failed to load tasks' };
      }

      const task = tasksResult.data.find(t => t.schema.id === taskId);
      return { success: true, data: task || null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task'
      };
    }
  }

  /**
   * Delete a task by ID
   */
  async deleteTask(taskId: string): Promise<ToolResult<void>> {
    try {
      const tasksResult = await this.loadAllTasks();
      if (!tasksResult.success || !tasksResult.data) {
        return { success: false, error: 'Failed to load tasks' };
      }

      const tasks = tasksResult.data;
      const filteredTasks = tasks.filter(t => t.schema.id !== taskId);
      
      if (filteredTasks.length === tasks.length) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      return await this.saveAllTasks(filteredTasks);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete task'
      };
    }
  }

  /**
   * Get storage file path
   */
  getStoragePath(): string {
    return this.tasksFilePath;
  }

  /**
   * Check if storage file exists
   */
  async exists(): Promise<boolean> {
    return fsSync.existsSync(this.tasksFilePath);
  }

  /**
   * Backup current tasks to a backup file
   */
  async backup(): Promise<ToolResult<string>> {
    try {
      if (!await this.exists()) {
        return { success: false, error: 'No tasks file to backup' };
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = this.tasksFilePath.replace('.json', `_backup_${timestamp}.json`);
      
      const content = await fs.readFile(this.tasksFilePath, 'utf-8');
      await fs.writeFile(backupPath, content, 'utf-8');
      
      return { success: true, data: backupPath, message: 'Tasks backed up successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to backup tasks'
      };
    }
  }

  // Private helper methods

  private getDefaultStoragePath(): string {
    try {
      const userDataPath = app.getPath('userData');
      return path.join(userDataPath, 'tasky-tasks.json');
    } catch {
      // Fallback for non-Electron environments
      return path.join(process.cwd(), 'data', 'tasky-tasks.json');
    }
  }

  private async initializeTaskFile(): Promise<void> {
    const initialData: TaskFile = {
      version: '1.0',
      lastSaved: new Date().toISOString(),
      tasks: [],
      metadata: {
        totalTasks: 0,
        lastTaskId: ''
      }
    };

    const dir = path.dirname(this.tasksFilePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.tasksFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }

  private serializeTask(task: TaskyTask): any {
    return {
      ...task,
      schema: {
        ...task.schema,
        createdAt: task.schema.createdAt.toISOString(),
        updatedAt: task.schema.updatedAt?.toISOString(),
        dueDate: task.schema.dueDate?.toISOString()
      },
      completedAt: task.completedAt?.toISOString(),
      metadata: task.metadata ? {
        ...task.metadata,
        lastModified: task.metadata.lastModified.toISOString(),
        archivedAt: task.metadata.archivedAt?.toISOString()
      } : undefined
    };
  }

  private deserializeTask(serializedTask: any): TaskyTask {
    return {
      ...serializedTask,
      schema: {
        ...serializedTask.schema,
        createdAt: new Date(serializedTask.schema.createdAt),
        updatedAt: serializedTask.schema.updatedAt ? new Date(serializedTask.schema.updatedAt) : undefined,
        dueDate: serializedTask.schema.dueDate ? new Date(serializedTask.schema.dueDate) : undefined
      },
      completedAt: serializedTask.completedAt ? new Date(serializedTask.completedAt) : undefined,
      metadata: serializedTask.metadata ? {
        ...serializedTask.metadata,
        lastModified: new Date(serializedTask.metadata.lastModified),
        archivedAt: serializedTask.metadata.archivedAt ? new Date(serializedTask.metadata.archivedAt) : undefined
      } : undefined
    };
  }
}
