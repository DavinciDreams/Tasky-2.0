import { Task, TaskSchema, TaskStatus, AgentType, IssueCategory, Priority } from '../core/types';
import { Result, Success, Failure, Maybe } from '../core/functional';
import * as fs from 'fs-extra';
import * as path from 'path';

import { watch, FSWatcher } from 'chokidar';

export interface TaskQuery {
  status?: TaskStatus[];
  priority?: number[];
  category?: IssueCategory[];
  assignedAgent?: AgentType[];
  humanApproved?: boolean;
  searchTerm?: string;
  search?: string;
  sortBy?: 'createdAt' | 'priority' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  category?: IssueCategory;
  assignedAgent?: AgentType;
  humanApproved?: boolean;
  result?: string;
  notes?: string;
}

export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byPriority: Record<number, number>;
  byCategory: Record<string, number>;
  completionRate: number;
  averageCompletionTime?: number;
}

export class TaskStore {
  private static instance: TaskStore;
  private storePath: string;
  private tasks: Map<string, Task> = new Map();
  private fileWatcher: FSWatcher | undefined;
  private isUpdatingFromFile: boolean = false;
  private lastModified: Date = new Date(0);

  private constructor() {
    // Store tasks in project's tasks/tasks.json file
    this.storePath = path.join(process.cwd(), 'tasks', 'tasks.json');

    // Ensure directory exists
    fs.ensureDirSync(path.dirname(this.storePath));

    // Load existing tasks
    this.loadTasks();

    // Start watching the file for changes
    this.startFileWatcher();
  }

  static getInstance(): TaskStore {
    if (!TaskStore.instance) {
      TaskStore.instance = new TaskStore();
    }
    return TaskStore.instance;
  }

  /**
   * Create a new task
   */
  async create(schema: TaskSchema): Promise<Result<Task, string>> {
    try {
      // Generate unique ID if not provided
      if (!schema.id) {
        schema.id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      const task: Task = {
        schema: {
          ...schema,
          createdAt: schema.createdAt || new Date(),
          description: schema.description || '',
          category: schema.category || IssueCategory.BACKEND,
          priority: schema.priority || Priority.MEDIUM,
          affectedFiles: schema.affectedFiles || []
        },
        status: TaskStatus.PENDING,
        humanApproved: false,
        metadata: {
          version: 1,
          createdBy: process.env.USER || 'unknown',
          lastModified: new Date()
        }
      };

      this.tasks.set(task.schema.id, task);
      await this.save();

      return new Success(task);
    } catch (error) {
      return new Failure(`Failed to create task: ${error}`);
    }
  }

  /**
   * Get a task by ID
   */
  async get(taskId: string): Promise<Maybe<Task>> {
    const task = this.tasks.get(taskId);
    return task ? Maybe.of(task) : Maybe.none();
  }

  /**
   * Update a task
   */
  async update(taskId: string, updates: TaskUpdate): Promise<Result<Task, string>> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return new Failure(`Task ${taskId} not found`);
    }

    try {
      // Update task fields
      if (updates.title !== undefined) task.schema.title = updates.title;
      if (updates.description !== undefined) task.schema.description = updates.description;
      if (updates.status !== undefined) task.status = updates.status;
      if (updates.priority !== undefined) task.schema.priority = updates.priority;
      if (updates.category !== undefined) task.schema.category = updates.category;
      if (updates.assignedAgent !== undefined) task.assignedAgent = updates.assignedAgent;
      if (updates.humanApproved !== undefined) task.humanApproved = updates.humanApproved;
      if (updates.result !== undefined) task.result = updates.result;
      if (updates.notes !== undefined) task.notes = updates.notes;

      // Update metadata
      if (task.metadata?.archivedAt) {
        task.metadata = {
          version: (task.metadata?.version || 0) + 1,
          createdBy: task.metadata?.createdBy || process.env.USER || 'unknown',
          lastModified: new Date(),
          archivedAt: task.metadata.archivedAt
        };
      } else {
        task.metadata = {
          version: (task.metadata?.version || 0) + 1,
          createdBy: task.metadata?.createdBy || process.env.USER || 'unknown',
          lastModified: new Date()
        };
      }

      await this.save();
      return new Success(task);
    } catch (error) {
      return new Failure(`Failed to update task: ${error}`);
    }
  }

  /**
   * Delete a task
   */
  async delete(taskId: string): Promise<Result<void, string>> {
    if (!this.tasks.has(taskId)) {
      return new Failure(`Task ${taskId} not found`);
    }

    try {
      this.tasks.delete(taskId);
      await this.save();
      return new Success(undefined);
    } catch (error) {
      return new Failure(`Failed to delete task: ${error}`);
    }
  }

  /**
   * Archive a task (soft delete)
   */
  async archive(taskId: string): Promise<Result<Task, string>> {
    const task = this.tasks.get(taskId);
    if (!task) {
      return new Failure(`Task ${taskId} not found`);
    }

    try {
      // Task is deleted, no status change needed
      task.metadata = {
        version: (task.metadata?.version || 0) + 1,
        createdBy: task.metadata?.createdBy || process.env.USER || 'unknown',
        lastModified: new Date(),
        archivedAt: new Date()
      };

      await this.save();
      return new Success(task);
    } catch (error) {
      return new Failure(`Failed to archive task: ${error}`);
    }
  }

  /**
   * Query tasks with filters
   */
  async query(query: TaskQuery = {}): Promise<Task[]> {
    let results = Array.from(this.tasks.values());

    // Filter by status
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      results = results.filter(task => statuses.includes(task.status));
    }

    // Filter by priority
    if (query.priority !== undefined) {
      const priorities = Array.isArray(query.priority) ? query.priority : [query.priority];
      results = results.filter(task =>
        priorities.includes(task.schema.priority || Priority.MEDIUM)
      );
    }

    // Filter by category
    if (query.category) {
      const categories = Array.isArray(query.category) ? query.category : [query.category];
      results = results.filter(task =>
        categories.includes(task.schema.category || IssueCategory.FRONTEND)
      );
    }

    // Search in title and description
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      results = results.filter(
        task =>
          task.schema.title.toLowerCase().includes(searchLower) ||
          (task.schema.description || '').toLowerCase().includes(searchLower)
      );
    }

    // Sort results
    if (query.sortBy) {
      results.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (query.sortBy) {
          case 'createdAt':
            aVal = a.schema.createdAt.getTime();
            bVal = b.schema.createdAt.getTime();
            break;
          case 'priority':
            aVal = a.schema.priority;
            bVal = b.schema.priority;
            break;
          case 'title':
            aVal = a.schema.title.toLowerCase();
            bVal = b.schema.title.toLowerCase();
            break;
          default:
            return 0;
        }

        const order = query.sortOrder === 'asc' ? 1 : -1;
        return aVal < bVal ? -order : aVal > bVal ? order : 0;
      });
    }

    // Apply pagination
    if (query.offset !== undefined || query.limit !== undefined) {
      const offset = query.offset || 0;
      const limit = query.limit || results.length;
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  /**
   * Get task statistics
   */
  async getStatistics(): Promise<TaskStatistics> {
    const tasks = Array.from(this.tasks.values());

    const stats: TaskStatistics = {
      total: tasks.length,
      byStatus: {} as Record<TaskStatus, number>,
      byPriority: {},
      byCategory: {},
      completionRate: 0
    };

    // Initialize status counts
    Object.values(TaskStatus).forEach(status => {
      stats.byStatus[status as TaskStatus] = 0;
    });

    // Count tasks
    tasks.forEach(task => {
      stats.byStatus[task.status]++;

      const priority = task.schema.priority || Priority.MEDIUM;
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      const category = task.schema.category || IssueCategory.FRONTEND;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    // Calculate completion rate
    const completed = stats.byStatus[TaskStatus.COMPLETED] || 0;
    stats.completionRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

    return stats;
  }

  /**
   * Clone a task
   */
  async clone(taskId: string, modifications?: Partial<TaskSchema>): Promise<Result<Task, string>> {
    const original = this.tasks.get(taskId);
    if (!original) {
      return new Failure(`Task ${taskId} not found`);
    }

    const newSchema: TaskSchema = {
      ...original.schema,
      ...modifications,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      title: modifications?.title || `Copy of ${original.schema.title}`
    };

    return this.create(newSchema);
  }

  /**
   * Export tasks to JSON
   */
  async export(taskIds?: string[]): Promise<Result<string, string>> {
    try {
      const tasksToExport = taskIds
        ? (taskIds.map(id => this.tasks.get(id)).filter(Boolean) as Task[])
        : Array.from(this.tasks.values());

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tasks: tasksToExport
      };

      return new Success(JSON.stringify(exportData, null, 2));
    } catch (error) {
      return new Failure(`Failed to export tasks: ${error}`);
    }
  }

  /**
   * Import tasks from JSON
   */
  async import(jsonData: string, overwrite: boolean = false): Promise<Result<number, string>> {
    try {
      const importData = JSON.parse(jsonData);

      if (!importData.tasks || !Array.isArray(importData.tasks)) {
        return new Failure('Invalid import format');
      }

      let imported = 0;
      for (const taskData of importData.tasks) {
        if (!overwrite && this.tasks.has(taskData.schema.id)) {
          // Skip existing tasks unless overwrite is true
          continue;
        }

        // Recreate dates
        if (taskData.schema.createdAt) {
          taskData.schema.createdAt = new Date(taskData.schema.createdAt);
        }
        if (taskData.metadata?.lastModified) {
          taskData.metadata.lastModified = new Date(taskData.metadata.lastModified);
        }

        this.tasks.set(taskData.schema.id, taskData);
        imported++;
      }

      await this.save();
      return new Success(imported);
    } catch (error) {
      return new Failure(`Failed to import tasks: ${error}`);
    }
  }

  /**
   * Start watching the tasks file for external changes
   */
  private startFileWatcher(): void {
    try {
      this.fileWatcher = watch(this.storePath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      this.fileWatcher.on('change', async () => {
        if (this.isUpdatingFromFile) {
          // Prevent infinite loops when we're the ones updating the file
          return;
        }

        console.log('📁 Tasks file changed externally, reloading...');
        await this.reloadFromFile();
      });

      this.fileWatcher.on('error', error => {
        console.error('File watcher error:', error);
      });
    } catch (error) {
      console.warn('Could not start file watcher:', error);
    }
  }

  /**
   * Stop the file watcher
   */
  private stopFileWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
  }

  /**
   * Reload tasks from file when external changes are detected
   */
  private async reloadFromFile(): Promise<void> {
    try {
      if (!fs.existsSync(this.storePath)) {
        return;
      }

      const stats = await fs.stat(this.storePath);

      // Only reload if the file is actually newer
      if (stats.mtime <= this.lastModified) {
        return;
      }

      this.isUpdatingFromFile = true;

      const data = await fs.readJson(this.storePath);
      const oldTaskCount = this.tasks.size;

      // Clear current tasks
      this.tasks.clear();

      // Reload tasks from file
      if (data.tasks && Array.isArray(data.tasks)) {
        data.tasks.forEach((task: any) => {
          // Recreate dates
          if (task.schema.createdAt) {
            task.schema.createdAt = new Date(task.schema.createdAt);
          }
          if (task.metadata?.lastModified) {
            task.metadata.lastModified = new Date(task.metadata.lastModified);
          }
          if (task.metadata?.archivedAt) {
            task.metadata.archivedAt = new Date(task.metadata.archivedAt);
          }

          this.tasks.set(task.schema.id, task);
        });
      }

      this.lastModified = stats.mtime;

      const newTaskCount = this.tasks.size;
      const changeType =
        newTaskCount > oldTaskCount
          ? 'added'
          : newTaskCount < oldTaskCount
            ? 'removed'
            : 'modified';

      console.log(
        `✅ Tasks reloaded: ${newTaskCount} tasks (${Math.abs(newTaskCount - oldTaskCount)} ${changeType})`
      );
    } catch (error) {
      console.error('Failed to reload tasks from file:', error);
    } finally {
      this.isUpdatingFromFile = false;
    }
  }

  /**
   * Enhanced save method with conflict detection
   */
  private async save(): Promise<void> {
    try {
      // Check if file was modified externally before saving
      if (fs.existsSync(this.storePath)) {
        const stats = await fs.stat(this.storePath);
        if (stats.mtime > this.lastModified && !this.isUpdatingFromFile) {
          console.warn('⚠️  Tasks file was modified externally. Merging changes...');
          await this.mergeExternalChanges();
        }
      }

      const data = {
        version: '1.0',
        lastSaved: new Date().toISOString(),
        tasks: Array.from(this.tasks.values())
      };

      // Temporarily disable file watcher to prevent triggering on our own write
      this.isUpdatingFromFile = true;

      await fs.writeJson(this.storePath, data, { spaces: 2 });

      // Update our last modified timestamp
      const stats = await fs.stat(this.storePath);
      this.lastModified = stats.mtime;
    } catch (error) {
      console.error('Failed to save tasks:', error);
      throw error;
    } finally {
      this.isUpdatingFromFile = false;
    }
  }

  /**
   * Merge external changes with current in-memory tasks
   */
  private async mergeExternalChanges(): Promise<void> {
    try {
      const data = await fs.readJson(this.storePath);

      if (!data.tasks || !Array.isArray(data.tasks)) {
        return;
      }

      const externalTasks = new Map<string, Task>();

      // Parse external tasks
      data.tasks.forEach((task: any) => {
        // Recreate dates
        if (task.schema.createdAt) {
          task.schema.createdAt = new Date(task.schema.createdAt);
        }
        if (task.metadata?.lastModified) {
          task.metadata.lastModified = new Date(task.metadata.lastModified);
        }
        if (task.metadata?.archivedAt) {
          task.metadata.archivedAt = new Date(task.metadata.archivedAt);
        }

        externalTasks.set(task.schema.id, task);
      });

      // Merge strategy:
      // 1. Keep tasks that exist in both (prefer newer version based on lastModified)
      // 2. Add tasks that only exist externally
      // 3. Keep tasks that only exist in memory (they'll be saved)

      let mergedCount = 0;
      let addedCount = 0;

      for (const [taskId, externalTask] of externalTasks) {
        const memoryTask = this.tasks.get(taskId);

        if (!memoryTask) {
          // Task only exists externally, add it
          this.tasks.set(taskId, externalTask);
          addedCount++;
        } else {
          // Task exists in both, use the newer version
          const externalModified = externalTask.metadata?.lastModified || new Date(0);
          const memoryModified = memoryTask.metadata?.lastModified || new Date(0);

          if (externalModified > memoryModified) {
            this.tasks.set(taskId, externalTask);
            mergedCount++;
          }
          // Otherwise keep the memory version (it's newer)
        }
      }

      if (mergedCount > 0 || addedCount > 0) {
        console.log(`🔄 Merged external changes: ${addedCount} added, ${mergedCount} updated`);
      }
    } catch (error) {
      console.error('Failed to merge external changes:', error);
    }
  }

  /**
   * Load tasks from disk
   */
  private loadTasks(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const data = fs.readJsonSync(this.storePath);

        // Update last modified timestamp
        const stats = fs.statSync(this.storePath);
        this.lastModified = stats.mtime;

        // Recreate Map from saved data
        if (data.tasks && Array.isArray(data.tasks)) {
          data.tasks.forEach((task: any) => {
            // Recreate dates
            if (task.schema.createdAt) {
              task.schema.createdAt = new Date(task.schema.createdAt);
            }
            if (task.metadata?.lastModified) {
              task.metadata.lastModified = new Date(task.metadata.lastModified);
            }
            if (task.metadata?.archivedAt) {
              task.metadata.archivedAt = new Date(task.metadata.archivedAt);
            }

            this.tasks.set(task.schema.id, task);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  }

  /**
   * Get all tasks (for compatibility)
   */
  async getAll(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  /**
   * Clear all tasks (use with caution!)
   */
  async clear(): Promise<void> {
    this.tasks.clear();
    await this.save();
  }

  /**
   * Manually refresh tasks from file (useful for testing or manual sync)
   */
  async refresh(): Promise<Result<number, string>> {
    try {
      const oldCount = this.tasks.size;
      await this.reloadFromFile();
      const newCount = this.tasks.size;

      return new Success(Math.abs(newCount - oldCount));
    } catch (error) {
      return new Failure(`Failed to refresh tasks: ${error}`);
    }
  }

  /**
   * Get file watching status
   */
  isWatchingFile(): boolean {
    return !!this.fileWatcher;
  }

  /**
   * Enable/disable file watching
   */
  setFileWatching(enabled: boolean): void {
    if (enabled && !this.fileWatcher) {
      this.startFileWatcher();
    } else if (!enabled && this.fileWatcher) {
      this.stopFileWatcher();
    }
  }

  /**
   * Clean up resources when shutting down
   */
  destroy(): void {
    this.stopFileWatcher();
  }
}
