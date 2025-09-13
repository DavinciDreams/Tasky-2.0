import {
  TaskyTask,
  TaskyTaskSchema,
  TaskStatus,
  TaskObservation,
  TaskStrategy,
  TaskAction,
  TaskAnalytics,
  TaskStatistics,
  TaskFilterOptions,
  CreateTaskInput,
  UpdateTaskInput,
  ToolResult,
  TaskNotFoundError,
  TaskValidationError,
  TaskSuggestion,
  TaskAlert,
  TaskEventMap,
  createTaskId
} from '../../types/task';
import { ITaskStorage } from '../storage/ITaskStorage';
import { TypedEventBus } from './events';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

/**
 * TaskyEngine
 *
 * Core task management engine responsible for:
 * - Loading/saving tasks via TaskStorage (with date serialization)
 * - CRUD operations with validation and schema/top-level separation
 * - Filtering, analytics, and simple and automated execution.
 * - Emitting typed events for creation/update/completion
 */
export class TaskyEngine {
  private eventBus = new TypedEventBus<TaskEventMap>();
  private storage: ITaskStorage;
  private tasks: TaskyTask[] = [];
  private lastUpdatedAt: number = Date.now();

  constructor(_storagePath?: string, storageImpl?: ITaskStorage) {
    if (!storageImpl) {
      throw new Error('TaskyEngine requires an ITaskStorage implementation');
    }
    this.storage = storageImpl;
  }

  /**
   * Initialize the task engine
   */
  async initialize(): Promise<ToolResult<void>> {
    try {
      const result = await this.storage.initialize();
      if (!result.success) {
        return result;
      }

      await this.loadTasks();
      return { success: true, message: 'TaskyEngine initialized successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize TaskyEngine'
      };
    }
  }

  /**
   * Observe - Monitor current task state with automated execution.
   */
  async observe(): Promise<TaskObservation> {
    await this.loadTasks();
    const now = new Date();
    
    const pendingTasks = this.tasks.filter(t => t.status === TaskStatus.PENDING);
    const completedTasks = this.tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const overdueTasks = this.getOverdueTasks(now);
    const todaysDueTasks = this.getTodaysDueTasks(now);
    
    return {
      totalTasks: this.tasks.length,
      pendingTasks: pendingTasks.length,
      completedTasks: completedTasks.length,
      overdueTasks: overdueTasks.length,
      todaysDueTasks: todaysDueTasks.length,
      nextDueTask: this.getNextDueTask(now)
    };
  }

  /**
   * Orient - Analyze current situation and form strategy
   */
  async orient(observation: TaskObservation): Promise<TaskStrategy> {
    const suggestions = this.generateSuggestions(observation);
    const alerts = this.generateAlerts(observation);
    
    return {
      focusTask: observation.nextDueTask,
      suggestedActions: suggestions,
      urgentAlerts: alerts
    };
  }

  /**
   * Decide - Choose actions based on strategy
   */
  async decide(strategy: TaskStrategy): Promise<TaskAction[]> {
    const actions: TaskAction[] = [];
    
    // Focus on next due task
    if (strategy.focusTask) {
      actions.push({
        type: 'focus',
        taskId: strategy.focusTask.schema.id,
        message: `Focus on: ${strategy.focusTask.schema.title}`,
        data: { dueDate: strategy.focusTask.schema.dueDate }
      });
    }
    
    // Handle urgent alerts
    for (const alert of strategy.urgentAlerts) {
      if (alert.severity === 'high') {
        actions.push({
          type: 'notify',
          taskId: alert.taskId,
          message: alert.message,
          data: { severity: alert.severity }
        });
      }
    }
    
    return actions;
  }

  /**
   * Act - Execute the decided actions
   */
  async act(actions: TaskAction[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(action);
    }
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<ToolResult<TaskyTask>> {
    try {
      this.validateTaskInput(input);
      
      const taskId = this.generateTaskId(input.title);
      const now = new Date();
      
      const newTask: TaskyTask = {
        schema: {
          id: taskId,
          title: input.title,
          description: input.description,
          dueDate: input.dueDate,
          createdAt: now,
          updatedAt: now,
          tags: input.tags || [],
          affectedFiles: input.affectedFiles || [],
          estimatedDuration: input.estimatedDuration,
          dependencies: input.dependencies || [],
          assignedAgent: input.assignedAgent && (input.assignedAgent === 'gemini' || input.assignedAgent === 'claude')
            ? input.assignedAgent
            : undefined,
          executionPath: input.executionPath
        },
        status: TaskStatus.PENDING,
        reminderEnabled: input.reminderEnabled || false,
        reminderTime: input.reminderTime,
        metadata: {
          version: 1,
          createdBy: 'tasky-user',
          lastModified: now
        }
      };

      const saveResult = await this.storage.saveTask(newTask);
      if (!saveResult.success) {
        return { success: false, message: saveResult.message, data: null as any };
      }

      this.tasks.push(newTask);
      this.lastUpdatedAt = Date.now();
      
      // Emit event
      this.eventBus.emit('task:created', {
        task: newTask,
        source: 'user'
      });

      return { success: true, data: newTask, message: 'Task created successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create task'
      };
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: UpdateTaskInput): Promise<ToolResult<TaskyTask>> {
    try {
      const taskIndex = this.tasks.findIndex(t => t.schema.id === taskId);
      if (taskIndex === -1) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      const existingTask = this.tasks[taskIndex];
      const previousStatus = existingTask.status;
      const now = new Date();

      // Separate schema vs top-level updates to avoid polluting the root
      const schemaFieldNames = new Set<keyof TaskyTaskSchema>([
        'title',
        'description',
        'dueDate',
        'tags',
        'affectedFiles',
        'estimatedDuration',
        'dependencies',
        'assignedAgent',
        'executionPath'
      ]);
      const topLevelFieldNames = new Set<keyof TaskyTask>([
        'status',
        'reminderEnabled',
        'reminderTime',
        'result'
      ]);

      const schemaUpdates: Partial<TaskyTaskSchema> = {};
      const topLevelUpdates: Partial<TaskyTask> = {};

      if (updates && typeof updates === 'object') {
        for (const [key, value] of Object.entries(updates)) {
          if (schemaFieldNames.has(key as keyof TaskyTaskSchema)) {
            // Ensure dueDate stays a Date or undefined
            if (key === 'dueDate') {
              (schemaUpdates as any)[key] = value ? new Date(value as any) : undefined;
            } else {
              (schemaUpdates as any)[key] = value as any;
            }
          } else if (topLevelFieldNames.has(key as keyof TaskyTask)) {
            (topLevelUpdates as any)[key] = value as any;
          }
        }
      }

      const updatedTask: TaskyTask = {
        ...existingTask,
        ...topLevelUpdates,
        schema: {
          ...existingTask.schema,
          ...schemaUpdates,
          updatedAt: now
        },
        metadata: {
          version: (existingTask.metadata?.version || 1) + 1,
          createdBy: existingTask.metadata?.createdBy || 'tasky-user',
          lastModified: now,
          archivedAt: existingTask.metadata?.archivedAt
        }
      };

      // Handle completion
      if (updates.status === TaskStatus.COMPLETED && previousStatus !== TaskStatus.COMPLETED) {
        updatedTask.completedAt = now;
      }

      const saveResult = await this.storage.saveTask(updatedTask);
      if (!saveResult.success) {
        return { success: false, message: saveResult.message, data: null as any };
      }

      this.tasks[taskIndex] = updatedTask;
      this.lastUpdatedAt = Date.now();
      
      // Emit events
      this.eventBus.emit('task:updated', {
        task: updatedTask,
        previousStatus,
        changes: Object.keys(updates)
      });

      if (updates.status === TaskStatus.COMPLETED && previousStatus !== TaskStatus.COMPLETED) {
        const duration = this.calculateCompletionDuration(updatedTask);
        this.eventBus.emit('task:completed', {
          task: updatedTask,
          duration,
          completionMethod: 'manual'
        });
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
      const taskIndex = this.tasks.findIndex(t => t.schema.id === taskId);
      if (taskIndex === -1) {
        return { success: false, error: `Task ${taskId} not found` };
      }

      const deleteResult = await this.storage.deleteTask(taskId);
      if (!deleteResult.success) {
        return deleteResult;
      }

      this.tasks.splice(taskIndex, 1);
      this.lastUpdatedAt = Date.now();
      
      return { success: true, message: 'Task deleted successfully' };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete task'
      };
    }
  }

  /**
   * Return a cheap monotonically increasing value to detect external changes
   * Check database for actual last modification time to detect external changes
   */
  getLastUpdated(): number {
    try {
      // Try to get the actual last modified time from the database
      const result = (this.storage as any).getLastModified?.();
      if (typeof result === 'number') {
        return result;
      }
    } catch {
      // Fall back to in-memory timestamp if database query fails
    }
    return this.lastUpdatedAt;
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<ToolResult<TaskyTask>> {
    try {
      const task = this.tasks.find(t => t.schema.id === taskId);
      if (!task) {
        return { success: false, error: `Task ${taskId} not found` };
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
   * Get filtered list of tasks
   */
  async getTasks(filters?: TaskFilterOptions): Promise<ToolResult<TaskyTask[]>> {
    try {
      await this.loadTasks();
      let filteredTasks = [...this.tasks];

      if (filters) {
        // Apply status filter
        if (filters.status && filters.status.length > 0) {
          filteredTasks = filteredTasks.filter(task => filters.status!.includes(task.status));
        }

        // Apply tags filter
        if (filters.tags && filters.tags.length > 0) {
          filteredTasks = filteredTasks.filter(task => 
            filters.tags!.some(tag => task.schema.tags?.includes(tag))
          );
        }

        // Apply search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredTasks = filteredTasks.filter(task =>
            task.schema.title.toLowerCase().includes(searchLower) ||
            (task.schema.description && task.schema.description.toLowerCase().includes(searchLower)) ||
            (task.schema.tags && task.schema.tags.some(tag => tag.toLowerCase().includes(searchLower)))
          );
        }

        // Apply date filters
        if (filters.dueDateFrom) {
          filteredTasks = filteredTasks.filter(task =>
            task.schema.dueDate && task.schema.dueDate >= filters.dueDateFrom!
          );
        }

        if (filters.dueDateTo) {
          filteredTasks = filteredTasks.filter(task =>
            task.schema.dueDate && task.schema.dueDate <= filters.dueDateTo!
          );
        }

        // Apply pagination
        if (filters.offset) {
          filteredTasks = filteredTasks.slice(filters.offset);
        }

        if (filters.limit) {
          filteredTasks = filteredTasks.slice(0, filters.limit);
        }
      }

      // Sort by due date, then by creation date
      filteredTasks.sort((a, b) => {
        if (a.schema.dueDate && b.schema.dueDate) {
          return a.schema.dueDate.getTime() - b.schema.dueDate.getTime();
        }
        if (a.schema.dueDate) return -1;
        if (b.schema.dueDate) return 1;
        return b.schema.createdAt.getTime() - a.schema.createdAt.getTime();
      });

      return { success: true, data: filteredTasks };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tasks'
      };
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<ToolResult<TaskStatistics>> {
    try {
      await this.loadTasks();
      const now = new Date();

      const stats: TaskStatistics = {
        total: this.tasks.length,
        byStatus: this.getStatusDistribution(),
        byTags: this.getTagDistribution(),
        averageCompletionTime: this.calculateAverageCompletionTime(),
        completionRate: this.calculateCompletionRate(),
        overdueCount: this.getOverdueTasks(now).length,
        dueTodayCount: this.getTodaysDueTasks(now).length,
        productivityTrend: this.analyzeProductivityTrend()
      };

      return { success: true, data: stats };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task statistics'
      };
    }
  }

  /**
   * Get detailed task analytics
   */
  async getTaskAnalytics(): Promise<ToolResult<TaskAnalytics>> {
    try {
      await this.loadTasks();
      
      const analytics: TaskAnalytics = {
        productivity: this.calculateProductivityMetrics(),
        completionRate: this.calculateCompletionRate(),
        averageCompletionTime: this.calculateAverageCompletionTime(),
        taskDistribution: this.getStatusDistribution(),
        trends: this.calculateTrends()
      };

      return { success: true, data: analytics };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get task analytics'
      };
    }
  }

  /**
   * Archive a completed task
   */
  async archiveTask(taskId: string): Promise<ToolResult<void>> {
    const task = this.tasks.find(t => t.schema.id === taskId);
    if (!task) {
      return { success: false, error: `Task ${taskId} not found` };
    }

    return await this.updateTask(taskId, { 
      status: TaskStatus.ARCHIVED
    }).then(async result => {
      if (result.success && result.data) {
        // Update metadata separately
        const archivedTask = result.data;
        archivedTask.metadata = {
          version: archivedTask.metadata?.version || 1,
          createdBy: archivedTask.metadata?.createdBy || 'tasky-user',
          lastModified: new Date(),
          archivedAt: new Date()
        };
        await this.storage.saveTask(archivedTask);
      }
      return { success: result.success, error: result.success ? undefined : result.message };
    });
  }

  // Private helper methods

  private async loadTasks(): Promise<void> {
    const result = await this.storage.loadAllTasks();
    if (result.success && result.data) {
      this.tasks = result.data;
    }
  }

  private validateTaskInput(input: CreateTaskInput): void {
    if (!input.title || input.title.trim().length === 0) {
      throw new TaskValidationError('Task title is required', 'title');
    }

    if (input.title.length > 200) {
      throw new TaskValidationError('Task title too long (max 200 characters)', 'title');
    }

    if (input.description && input.description.length > 2000) {
      throw new TaskValidationError('Task description too long (max 2000 characters)', 'description');
    }

    if (input.dueDate && input.dueDate < new Date()) {
      throw new TaskValidationError('Due date cannot be in the past', 'dueDate');
    }

    if (input.assignedAgent && input.assignedAgent !== 'gemini' && input.assignedAgent !== 'claude') {
      throw new TaskValidationError("assignedAgent must be 'gemini' or 'claude'", 'assignedAgent');
    }
  }

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

  private getOverdueTasks(now: Date): TaskyTask[] {
    return this.tasks.filter(task =>
      task.schema.dueDate &&
      task.schema.dueDate < now &&
      task.status !== TaskStatus.COMPLETED &&
      task.status !== TaskStatus.ARCHIVED
    );
  }

  private getTodaysDueTasks(now: Date): TaskyTask[] {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return this.tasks.filter(task =>
      task.schema.dueDate &&
      task.schema.dueDate >= today &&
      task.schema.dueDate < tomorrow &&
      task.status !== TaskStatus.COMPLETED &&
      task.status !== TaskStatus.ARCHIVED
    );
  }

  private getNextDueTask(now: Date): TaskyTask | undefined {
    const pendingTasks = this.tasks.filter(task =>
      task.status === TaskStatus.PENDING &&
      task.schema.dueDate &&
      task.schema.dueDate >= now
    );

    return pendingTasks.sort(
      (a, b) => a.schema.dueDate!.getTime() - b.schema.dueDate!.getTime()
    )[0];
  }

  private generateSuggestions(observation: TaskObservation): TaskSuggestion[] {
    const suggestions: TaskSuggestion[] = [];

    if (observation.overdueTasks > 0) {
      suggestions.push({
        type: 'reschedule',
        taskId: 'multiple',
        message: `You have ${observation.overdueTasks} overdue tasks`,
        reasoning: 'Consider rescheduling or breaking down overdue tasks'
      });
    }

    if (observation.todaysDueTasks > 5) {
      suggestions.push({
        type: 'focus',
        taskId: 'multiple',
        message: `${observation.todaysDueTasks} tasks due today`,
        reasoning: 'Consider prioritizing tasks due today'
      });
    }

    return suggestions;
  }

  private generateAlerts(observation: TaskObservation): TaskAlert[] {
    const alerts: TaskAlert[] = [];

    if (observation.overdueTasks > 0) {
      alerts.push({
        type: 'overdue',
        taskId: 'multiple',
        message: `${observation.overdueTasks} tasks are overdue`,
        severity: 'high'
      });
    }

    if (observation.todaysDueTasks > 0) {
      alerts.push({
        type: 'due_soon',
        taskId: 'multiple',
        message: `${observation.todaysDueTasks} tasks due today`,
        severity: 'medium'
      });
    }

    return alerts;
  }

  private async executeAction(action: TaskAction): Promise<void> {
    // Implementation would depend on the specific action type
    // This is where you'd integrate with notification systems, UI updates, etc.
    // Reduced verbosity: keep engine quiet in production
  }

  private getStatusDistribution(): Record<TaskStatus, number> {
    const distribution: Record<TaskStatus, number> = {
      [TaskStatus.PENDING]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.COMPLETED]: 0,
      [TaskStatus.NEEDS_REVIEW]: 0,
      [TaskStatus.ARCHIVED]: 0
    };

    for (const task of this.tasks) {
      distribution[task.status]++;
    }

    return distribution;
  }

  private getTagDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const task of this.tasks) {
      if (task.schema.tags) {
        for (const tag of task.schema.tags) {
          distribution[tag] = (distribution[tag] || 0) + 1;
        }
      }
    }

    return distribution;
  }

  private calculateCompletionRate(): number {
    if (this.tasks.length === 0) return 0;
    const completed = this.tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    return (completed / this.tasks.length) * 100;
  }

  private calculateAverageCompletionTime(): number {
    const completedTasks = this.tasks.filter(t => 
      t.status === TaskStatus.COMPLETED && t.completedAt
    );

    if (completedTasks.length === 0) return 0;

    const totalTime = completedTasks.reduce((sum, task) => {
      const duration = this.calculateCompletionDuration(task);
      return sum + duration;
    }, 0);

    return totalTime / completedTasks.length / (1000 * 60 * 60); // Convert to hours
  }

  private calculateCompletionDuration(task: TaskyTask): number {
    if (!task.completedAt) return 0;
    return task.completedAt.getTime() - task.schema.createdAt.getTime();
  }

  private analyzeProductivityTrend(): 'increasing' | 'decreasing' | 'stable' {
    // Simple trend analysis - could be enhanced
    const last7Days = this.getCompletionTrend(7);
    const previous7Days = this.getCompletionTrend(14, 7);

    if (last7Days > previous7Days * 1.1) return 'increasing';
    if (last7Days < previous7Days * 0.9) return 'decreasing';
    return 'stable';
  }

  private getCompletionTrend(days: number, offset: number = 0): number {
    const now = new Date();
    const startDate = new Date(now.getTime() - (days + offset) * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);

    return this.tasks.filter(task =>
      task.status === TaskStatus.COMPLETED &&
      task.completedAt &&
      task.completedAt >= startDate &&
      task.completedAt <= endDate
    ).length;
  }

  private calculateProductivityMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today.getTime() - today.getDay() * 24 * 60 * 60 * 1000);

    return {
      tasksCompletedToday: this.tasks.filter(t =>
        t.status === TaskStatus.COMPLETED &&
        t.completedAt &&
        t.completedAt >= today
      ).length,
      tasksCompletedThisWeek: this.tasks.filter(t =>
        t.status === TaskStatus.COMPLETED &&
        t.completedAt &&
        t.completedAt >= weekStart
      ).length,
      averageTasksPerDay: this.calculateAverageTasksPerDay()
    };
  }

  private calculateAverageTasksPerDay(): number {
    const completedTasks = this.tasks.filter(t => t.status === TaskStatus.COMPLETED);
    if (completedTasks.length === 0) return 0;

    const firstTask = completedTasks.reduce((earliest, task) =>
      task.completedAt && (!earliest.completedAt || task.completedAt < earliest.completedAt)
        ? task : earliest
    );

    if (!firstTask.completedAt) return 0;

    const daysSinceFirst = Math.max(1, 
      Math.ceil((Date.now() - firstTask.completedAt.getTime()) / (24 * 60 * 60 * 1000))
    );

    return completedTasks.length / daysSinceFirst;
  }

  private calculateTrends() {
    // Simplified trend calculation
    return {
      dailyCompletion: this.getDailyCompletionTrend(),
      weeklyProductivity: this.getWeeklyProductivityTrend()
    };
  }

  private getDailyCompletionTrend() {
    const trends = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      const completed = this.tasks.filter(task =>
        task.status === TaskStatus.COMPLETED &&
        task.completedAt &&
        task.completedAt >= dayStart &&
        task.completedAt < dayEnd
      ).length;

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        completed
      });
    }

    return trends;
  }

  private getWeeklyProductivityTrend() {
    // Simplified weekly trend - could be enhanced
    return [
      { week: 'This week', productivity: this.getCompletionTrend(7) },
      { week: 'Last week', productivity: this.getCompletionTrend(7, 7) },
      { week: '2 weeks ago', productivity: this.getCompletionTrend(7, 14) },
      { week: '3 weeks ago', productivity: this.getCompletionTrend(7, 21) }
    ];
  }

  /**
   * Get event bus for external event subscriptions
   */
  getEventBus(): TypedEventBus<TaskEventMap> {
    return this.eventBus;
  }
}
