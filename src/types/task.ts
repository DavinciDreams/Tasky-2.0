// Tasky Task Management Types - Adapted from Agent System
// Removed: category, priority fields as requested
// Renamed: All "Looper" references to "TaskManager" or "Tasky"

export type TaskId = string & { readonly brand: unique symbol };
export type FilePath = string & { readonly brand: unique symbol };

// Branded types for type safety
export const createTaskId = (id: string): TaskId => id as TaskId;
// export const createFilePath = (path: string): FilePath => path as FilePath; // unused

// Simplified Task Schema for Tasky (removed category and priority)
export interface TaskyTaskSchema {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
  
  // Simplified fields
  tags?: string[];
  affectedFiles?: string[];
  estimatedDuration?: number; // in minutes
  dependencies?: string[]; // Task IDs this task depends on
  // Development-task specific (optional)
  assignedAgent?: 'gemini' | 'claude';
  executionPath?: string; // e.g., "src/middleware"
}

// Main Task interface for Tasky
export interface TaskyTask {
  schema: TaskyTaskSchema;
  status: TaskStatus;
  humanApproved: boolean;
  result?: string;
  completedAt?: Date;
  
  // Tasky-specific features
  reminderEnabled?: boolean;
  reminderTime?: string;
  notificationSent?: boolean;
  
  metadata?: {
    version: number;
    createdBy: string;
    lastModified: Date;
    archivedAt?: Date;
  };
}

// Status enumeration
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  ARCHIVED = 'ARCHIVED'
}

// Task filtering options
export interface TaskFilterOptions {
  status?: TaskStatus[];
  tags?: string[];
  search?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  hasFiles?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

// Task statistics
export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byTags: Record<string, number>;
  averageCompletionTime: number;
  completionRate: number;
  overdueCount: number;
  dueTodayCount: number;
  productivityTrend: 'increasing' | 'decreasing' | 'stable';
}

// Task analytics
export interface TaskAnalytics {
  productivity: {
    tasksCompletedToday: number;
    tasksCompletedThisWeek: number;
    averageTasksPerDay: number;
  };
  completionRate: number;
  averageCompletionTime: number; // in hours
  taskDistribution: {
    [key in TaskStatus]: number;
  };
  trends: {
    dailyCompletion: Array<{ date: string; completed: number }>;
    weeklyProductivity: Array<{ week: string; productivity: number }>;
  };
}

// Task observation (simplified from OODA loop)
export interface TaskObservation {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  todaysDueTasks: number;
  nextDueTask?: TaskyTask;
}

// Task strategy (simplified from OODA loop)
export interface TaskStrategy {
  focusTask?: TaskyTask;
  suggestedActions: TaskSuggestion[];
  urgentAlerts: TaskAlert[];
}

// Task suggestion
export interface TaskSuggestion {
  type: 'focus' | 'break_down' | 'reschedule' | 'archive';
  taskId: string;
  message: string;
  reasoning: string;
}

// Task alert
export interface TaskAlert {
  type: 'overdue' | 'due_soon' | 'blocked' | 'long_pending';
  taskId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

// Task action
export interface TaskAction {
  type: 'focus' | 'notify' | 'archive' | 'break_down';
  taskId: string;
  message: string;
  data?: any;
}

// Event system types
export interface TaskEvent<T = unknown> {
  readonly type: string;
  readonly timestamp: Date;
  readonly taskId: TaskId;
  readonly payload: T;
}

export interface TaskCreatedEvent {
  readonly task: TaskyTask;
  readonly source: 'user' | 'import' | 'conversion';
}

export interface TaskUpdatedEvent {
  readonly task: TaskyTask;
  readonly previousStatus: TaskStatus;
  readonly changes: string[];
}

export interface TaskCompletedEvent {
  readonly task: TaskyTask;
  readonly duration: number; // time taken to complete in minutes
  readonly completionMethod: 'manual' | 'auto';
}

export interface TaskOverdueEvent {
  readonly task: TaskyTask;
  readonly overdueDuration: number; // minutes overdue
}

export interface TaskDueEvent {
  readonly task: TaskyTask;
  readonly timeUntilDue: number; // minutes until due
}

export type TaskEventMap = {
  'task:created': TaskCreatedEvent;
  'task:updated': TaskUpdatedEvent;
  'task:completed': TaskCompletedEvent;
  'task:overdue': TaskOverdueEvent;
  'task:due': TaskDueEvent;
};

// File storage types
export interface TaskFile {
  version: string;
  lastSaved: string;
  tasks: TaskyTask[];
  metadata?: {
    totalTasks: number;
    lastTaskId: string;
    settings?: TaskManagerSettings;
  };
}

// Task manager settings
export interface TaskManagerSettings {
  autoArchiveCompleted: boolean;
  defaultDueDateOffset: number; // days
  enableTaskNotifications: boolean;
  notificationOffset: number; // minutes before due date
  defaultTags: string[];
  taskSortBy: 'dueDate' | 'created' | 'status' | 'title';
  taskSortOrder: 'asc' | 'desc';
  maxTasksPerPage: number;
}

// Input types for task creation
export interface CreateTaskInput {
  title: string;
  description?: string;
  dueDate?: Date;
  tags?: string[];
  affectedFiles?: string[];
  estimatedDuration?: number;
  dependencies?: string[];
  reminderEnabled?: boolean;
  reminderTime?: string;
  // Development-task extras
  assignedAgent?: string;
  executionPath?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  dueDate?: Date;
  tags?: string[];
  affectedFiles?: string[];
  estimatedDuration?: number;
  dependencies?: string[];
  status?: TaskStatus;
  reminderEnabled?: boolean;
  reminderTime?: string;
  // Development-task extras
  assignedAgent?: string;
  executionPath?: string;
}

// Result wrapper type
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error types
export class TaskNotFoundError extends Error {
  constructor(public readonly taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class TaskValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(`Task validation failed: ${message}`);
    this.name = 'TaskValidationError';
  }
}

export class TaskStorageError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(`Task storage error: ${message}`);
    this.name = 'TaskStorageError';
  }
}

// Integration with existing Tasky types
export interface TaskyIntegrationSettings {
  enableTaskManagement: boolean;
  taskStoragePath?: string;
  syncWithReminders: boolean;
  autoConvertReminders: boolean;
  taskNotificationSound: boolean;
  showTaskStatsInTray: boolean;
}

// Reminder to Task conversion interface
export interface ReminderTaskConversion {
  reminderId: string;
  taskId: string;
  conversionDate: Date;
  preserveOriginal: boolean;
}

// Task to Reminder conversion interface
export interface TaskReminderConversion {
  taskId: string;
  reminderId: string;
  conversionDate: Date;
  preserveOriginal: boolean;
}

// Enhanced Electron API for tasks
export interface TaskElectronAPI {
  // Task CRUD
  createTask: (input: CreateTaskInput) => Promise<ToolResult<TaskyTask>>;
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<ToolResult<TaskyTask>>;
  deleteTask: (id: string) => Promise<ToolResult<void>>;
  getTask: (id: string) => Promise<ToolResult<TaskyTask>>;
  getTasks: (filters?: TaskFilterOptions) => Promise<ToolResult<TaskyTask[]>>;
  
  // Task analytics
  getTaskStats: () => Promise<ToolResult<TaskStatistics>>;
  getTaskAnalytics: () => Promise<ToolResult<TaskAnalytics>>;
  
  // Task management
  archiveTask: (id: string) => Promise<ToolResult<void>>;
  duplicateTask: (id: string) => Promise<ToolResult<TaskyTask>>;
  bulkUpdateTasks: (ids: string[], updates: Partial<TaskyTask>) => Promise<ToolResult<TaskyTask[]>>;
  
  // Integration features
  convertReminderToTask: (reminderId: string) => Promise<ToolResult<TaskyTask>>;
  convertTaskToReminder: (taskId: string) => Promise<ToolResult<any>>;
  
  // File operations
  exportTasks: (format: 'json' | 'csv') => Promise<ToolResult<string>>;
  importTasks: (filePath: string) => Promise<ToolResult<TaskyTask[]>>;
  
  // Event listeners
  onTaskCreated: (callback: (task: TaskyTask) => void) => void;
  onTaskUpdated: (callback: (task: TaskyTask) => void) => void;
  onTaskCompleted: (callback: (task: TaskyTask) => void) => void;
  onTaskOverdue: (callback: (task: TaskyTask) => void) => void;
}

// Utility types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// export type NonEmptyArray<T> = [T, ...T[]]; // unused

// export type TaskEventHandler<K extends keyof TaskEventMap> = (event: TaskEventMap[K]) => void; // unused

// Template literal types for better validation
// export type TaskIdPattern = `task_${string}`; // unused
// export type TagPattern = `#${string}`; // unused
// export type TimePattern = `${number}:${number}`; // unused

// Conditional types
// export type TaskWithReminder<T extends TaskyTask> = T extends { reminderEnabled: true } 
//   ? T & Required<Pick<T, 'reminderTime'>> 
//   : T; // unused

// export type CompletedTask<T extends TaskyTask> = T extends { status: TaskStatus.COMPLETED }
//   ? T & Required<Pick<T, 'completedAt'>>
//   : never; // unused
