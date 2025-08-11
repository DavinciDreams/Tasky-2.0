import { TaskyTask, ToolResult } from '../../types/task';

export interface ITaskStorage {
  initialize(): Promise<ToolResult<void>>;
  loadAllTasks(): Promise<ToolResult<TaskyTask[]>>;
  saveTask(task: TaskyTask): Promise<ToolResult<void>>;
  deleteTask(taskId: string): Promise<ToolResult<void>>;
}


