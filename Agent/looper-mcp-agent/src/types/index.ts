import { z } from 'zod';

// Task Status Enum
export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  NEEDS_REVIEW = 'NEEDS_REVIEW'
}

// Task Priority Enum
export enum Priority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Task Category Enum
export enum TaskCategory {
  FRONTEND = 'FRONTEND',
  BACKEND = 'BACKEND',
  DATABASE = 'DATABASE',
  API = 'API',
  UI_UX = 'UI_UX',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  TESTING = 'TESTING',
  DOCUMENTATION = 'DOCUMENTATION',
  CONFIG = 'CONFIG',
  REFACTOR = 'REFACTOR',
  BUGFIX = 'BUGFIX',
  FEATURE = 'FEATURE'
}

// Agent Provider Enum
export enum AgentProvider {
  CLAUDE = 'claude',
  GEMINI = 'gemini'
}

// Zod schemas for validation
export const TaskSchemaSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  category: z.nativeEnum(TaskCategory),
  priority: z.nativeEnum(Priority),
  affectedFiles: z.array(z.string()).optional(),
  createdAt: z.string(),
  estimatedDuration: z.number().optional(),
  dependencies: z.array(z.string()).optional()
});

export const TaskMetadataSchema = z.object({
  version: z.number(),
  createdBy: z.string(),
  lastModified: z.string(),
  executedBy: z.string().optional(),
  executionTime: z.number().optional(),
  notes: z.string().optional()
});

export const TaskSchema = z.object({
  schema: TaskSchemaSchema,
  status: z.nativeEnum(TaskStatus),
  humanApproved: z.boolean(),
  metadata: TaskMetadataSchema
});

export const TaskFileSchema = z.object({
  version: z.string(),
  lastSaved: z.string(),
  tasks: z.array(TaskSchema)
});

// TypeScript interfaces derived from Zod schemas
export type TaskSchemaType = z.infer<typeof TaskSchemaSchema>;
export type TaskMetadata = z.infer<typeof TaskMetadataSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskFile = z.infer<typeof TaskFileSchema>;

// Repository context types
export interface RepoContext {
  rootPath: string;
  projectType: string;
  currentBranch: string;
  modifiedFiles: string[];
  hasGit: boolean;
  packageManager?: string;
  framework?: string;
  language?: string;
}

// Execution result types
export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  filesModified?: string[];
  exitCode?: number;
  taskId: string;
  agentUsed: AgentProvider;
}

// Task statistics
export interface TaskStatistics {
  total: number;
  byStatus: Record<TaskStatus, number>;
  byCategory: Record<TaskCategory, number>;
  byPriority: Record<Priority, number>;
}

// MCP tool result types
export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Task creation input
export interface CreateTaskInput {
  title: string;
  description?: string;
  category: TaskCategory;
  priority: Priority;
  affectedFiles?: string[];
  estimatedDuration?: number;
  dependencies?: string[];
}

// Task filter options
export interface TaskFilterOptions {
  status?: TaskStatus[];
  category?: TaskCategory[];
  priority?: Priority[];
  search?: string;
  limit?: number;
  offset?: number;
}

// Agent configuration
export interface AgentConfig {
  provider: AgentProvider;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

// Looper engine configuration
export interface LooperConfig {
  agents: Record<string, AgentConfig>;
  execution: {
    defaultTimeout: number;
    maxRetries: number;
    streamOutput: boolean;
  };
  features: {
    autoCommit: boolean;
    createBranches: boolean;
    openPullRequests: boolean;
  };
}

export default {
  TaskStatus,
  Priority,
  TaskCategory,
  AgentProvider,
  TaskSchemaSchema,
  TaskMetadataSchema,
  TaskSchema,
  TaskFileSchema
}; 