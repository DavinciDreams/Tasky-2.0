import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import {
  Task,
  TaskFile,
  TaskFileSchema,
  CreateTaskInput,
  TaskFilterOptions,
  TaskStatistics,
  TaskStatus,
  TaskCategory,
  Priority,
  TaskSchemaType,
  ToolResult
} from '../types/index.js';

export class TaskManager {
  private tasksFilePath: string;
  private watchCallback?: (tasks: Task[]) => void;

  constructor(projectPath?: string) {
    this.tasksFilePath = path.join(projectPath || process.cwd(), 'tasks', 'tasks.json');
  }

  /**
   * Initialize task file if it doesn't exist
   */
  async initialize(): Promise<ToolResult<void>> {
    try {
      const tasksDir = path.dirname(this.tasksFilePath);
      await fs.mkdir(tasksDir, { recursive: true });

      if (!(fsSync.existsSync(this.tasksFilePath))) {
        const initialTaskFile: TaskFile = {
          version: '1.0',
          lastSaved: new Date().toISOString(),
          tasks: []
        };
        await fs.writeFile(this.tasksFilePath, JSON.stringify(initialTaskFile, null, 2));
      }

      return { success: true, message: 'Task file initialized successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize task file'
      };
    }
  }

  /**
   * Load all tasks from the task file
   */
  async loadTasks(): Promise<ToolResult<Task[]>> {
    try {
      if (!(fsSync.existsSync(this.tasksFilePath))) {
        await this.initialize();
        return { success: true, data: [] };
      }

      const fileContent = JSON.parse(await fs.readFile(this.tasksFilePath, 'utf8'));
      const taskFile = TaskFileSchema.parse(fileContent);
      
      return { success: true, data: taskFile.tasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load tasks'
      };
    }
  }

  /**
   * Save tasks to the task file
   */
  async saveTasks(tasks: Task[]): Promise<ToolResult<void>> {
    try {
      const taskFile: TaskFile = {
        version: '1.0',
        lastSaved: new Date().toISOString(),
        tasks
      };

      await fs.writeFile(this.tasksFilePath, JSON.stringify(taskFile, null, 2));
      
      return { success: true, message: 'Tasks saved successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save tasks'
      };
    }
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<ToolResult<Task>> {
    try {
      const tasksResult = await this.loadTasks();
      if (!tasksResult.success) {
        return { success: false, error: tasksResult.error };
      }

      const tasks = tasksResult.data || [];
      const taskId = this.generateTaskId(input.title);

      const newTask: Task = {
        schema: {
          id: taskId,
          title: input.title,
          description: input.description,
          category: input.category,
          priority: input.priority,
          affectedFiles: input.affectedFiles || [],
          createdAt: new Date().toISOString(),
          estimatedDuration: input.estimatedDuration,
          dependencies: input.dependencies || []
        },
        status: TaskStatus.PENDING,
        humanApproved: false,
        metadata: {
          version: 1,
          createdBy: 'mcp-agent',
          lastModified: new Date().toISOString()
        }
      };

      tasks.push(newTask);
      const saveResult = await this.saveTasks(tasks);
      
      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      return { success: true, data: newTask, message: 'Task created successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task'
      };
    }
  }

  /**
   * Get a task by ID
   */
  async getTask(taskId: string): Promise<ToolResult<Task>> {
    try {
      const tasksResult = await this.loadTasks();
      if (!tasksResult.success) {
        return { success: false, error: tasksResult.error };
      }

      const tasks = tasksResult.data || [];
      const task = tasks.find(t => t.schema.id === taskId);

      if (!task) {
        return { success: false, error: `Task with ID ${taskId} not found` };
      }

      return { success: true, data: task };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task'
      };
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<ToolResult<Task>> {
    try {
      const tasksResult = await this.loadTasks();
      if (!tasksResult.success) {
        return { success: false, error: tasksResult.error };
      }

      const tasks = tasksResult.data || [];
      const taskIndex = tasks.findIndex(t => t.schema.id === taskId);

      if (taskIndex === -1) {
        return { success: false, error: `Task with ID ${taskId} not found` };
      }

      // Update the task
      const updatedTask: Task = {
        ...tasks[taskIndex],
        ...updates,
        metadata: {
          ...tasks[taskIndex].metadata,
          ...updates.metadata,
          lastModified: new Date().toISOString(),
          version: tasks[taskIndex].metadata.version + 1
        }
      };

      tasks[taskIndex] = updatedTask;
      const saveResult = await this.saveTasks(tasks);

      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      return { success: true, data: updatedTask, message: 'Task updated successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update task'
      };
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<ToolResult<void>> {
    try {
      const tasksResult = await this.loadTasks();
      if (!tasksResult.success) {
        return { success: false, error: tasksResult.error };
      }

      const tasks = tasksResult.data || [];
      const taskIndex = tasks.findIndex(t => t.schema.id === taskId);

      if (taskIndex === -1) {
        return { success: false, error: `Task with ID ${taskId} not found` };
      }

      tasks.splice(taskIndex, 1);
      const saveResult = await this.saveTasks(tasks);

      if (!saveResult.success) {
        return { success: false, error: saveResult.error };
      }

      return { success: true, message: 'Task deleted successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete task'
      };
    }
  }

  /**
   * List tasks with optional filtering
   */
  async listTasks(options: TaskFilterOptions = {}): Promise<ToolResult<Task[]>> {
    try {
      const tasksResult = await this.loadTasks();
      if (!tasksResult.success) {
        return { success: false, error: tasksResult.error };
      }

      let tasks = tasksResult.data || [];

      // Apply filters
      if (options.status && options.status.length > 0) {
        tasks = tasks.filter(task => options.status!.includes(task.status));
      }

      if (options.category && options.category.length > 0) {
        tasks = tasks.filter(task => options.category!.includes(task.schema.category));
      }

      if (options.priority && options.priority.length > 0) {
        tasks = tasks.filter(task => options.priority!.includes(task.schema.priority));
      }

      if (options.search) {
        const searchLower = options.search.toLowerCase();
        tasks = tasks.filter(task => 
          task.schema.title.toLowerCase().includes(searchLower) ||
          (task.schema.description && task.schema.description.toLowerCase().includes(searchLower))
        );
      }

      // Sort by priority (highest first) and then by creation date
      tasks.sort((a, b) => {
        if (a.schema.priority !== b.schema.priority) {
          return b.schema.priority - a.schema.priority;
        }
        return new Date(b.schema.createdAt).getTime() - new Date(a.schema.createdAt).getTime();
      });

      // Apply pagination
      if (options.offset || options.limit) {
        const offset = options.offset || 0;
        const limit = options.limit || tasks.length;
        tasks = tasks.slice(offset, offset + limit);
      }

      return { success: true, data: tasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tasks'
      };
    }
  }

  /**
   * Get task statistics
   */
  async getStatistics(): Promise<ToolResult<TaskStatistics>> {
    try {
      const tasksResult = await this.loadTasks();
      if (!tasksResult.success) {
        return { success: false, error: tasksResult.error };
      }

      const tasks = tasksResult.data || [];

      const stats: TaskStatistics = {
        total: tasks.length,
        byStatus: Object.values(TaskStatus).reduce((acc, status) => {
          acc[status] = tasks.filter(task => task.status === status).length;
          return acc;
        }, {} as Record<TaskStatus, number>),
        byCategory: Object.values(TaskCategory).reduce((acc, category) => {
          acc[category] = tasks.filter(task => task.schema.category === category).length;
          return acc;
        }, {} as Record<TaskCategory, number>),
        byPriority: Object.values(Priority).reduce((acc, priority) => {
          if (typeof priority === 'number') {
            acc[priority as Priority] = tasks.filter(task => task.schema.priority === priority).length;
          }
          return acc;
        }, {} as Record<Priority, number>)
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get statistics'
      };
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<ToolResult<Task>> {
    return this.updateTask(taskId, { status });
  }

  /**
   * Get next pending task by priority
   */
  async getNextPendingTask(): Promise<ToolResult<Task | null>> {
    try {
      const tasksResult = await this.listTasks({ 
        status: [TaskStatus.PENDING],
        limit: 1 
      });
      
      if (!tasksResult.success) {
        return { success: false, error: tasksResult.error };
      }

      const tasks = tasksResult.data || [];
      return { success: true, data: tasks.length > 0 ? tasks[0] : null };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get next pending task'
      };
    }
  }

  /**
   * Generate a unique task ID based on title
   */
  private generateTaskId(title: string): string {
    const prefix = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 3)
      .join('_');
    
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const uuid = uuidv4().slice(0, 8);
    
    return `${prefix}_${timestamp}_${uuid}`;
  }

  /**
   * Get the tasks file path
   */
  getTasksFilePath(): string {
    return this.tasksFilePath;
  }

  /**
   * Check if tasks file exists
   */
  async exists(): Promise<boolean> {
    return fsSync.existsSync(this.tasksFilePath);
  }
} 