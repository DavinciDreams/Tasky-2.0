// Task Manager Module Exports
// Main entry point for Tasky task management system

export { TaskyEngine } from './tasky-engine';
export { TaskStorage } from './task-storage';
export { TypedEventBus, AsyncEventBus, MiddlewareEventBus, createEventBus } from './events';

// Re-export types for convenience
export type {
  TaskyTask,
  TaskyTaskSchema,
  TaskStatus,
  TaskFilterOptions,
  TaskStatistics,
  TaskAnalytics,
  TaskObservation,
  TaskStrategy,
  TaskAction,
  TaskSuggestion,
  TaskAlert,
  CreateTaskInput,
  UpdateTaskInput,
  ToolResult,
  TaskEventMap
} from '../../types/task';
