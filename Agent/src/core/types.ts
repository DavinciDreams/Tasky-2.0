// Core type definitions with advanced TypeScript features
export type TaskId = string & { readonly brand: unique symbol };
export type FilePath = string & { readonly brand: unique symbol };
export type GitHash = string & { readonly brand: unique symbol };

// Branded types for type safety
export const createTaskId = (id: string): TaskId => id as TaskId;
export const createFilePath = (path: string): FilePath => path as FilePath;
export const createGitHash = (hash: string): GitHash => hash as GitHash;

// Repository context interface
export interface RepoContext {
  readonly rootPath: string;
  readonly projectType: ProjectType;
  readonly currentBranch: string;
  readonly modifiedFiles: readonly string[];
  readonly recentCommits: readonly string[];
}

// Task schema interface - simplified for easy creation
export interface TaskSchema {
  id: string;
  title: string;
  description?: string;
  category?: IssueCategory;
  priority?: Priority;
  createdAt: Date;

  // Optional detailed fields
  affectedFiles?: string[];
}

// Task interface
export interface Task {
  schema: TaskSchema;
  status: TaskStatus;
  humanApproved: boolean;
  assignedAgent?: AgentType;
  result?: string;
  notes?: string;
  metadata?: {
    version: number;
    createdBy: string;
    lastModified: Date;
    archivedAt?: Date;
  };
}

// Enums
export enum ProjectType {
  NODE_REACT = 'node/react',
  PYTHON = 'python',
  JAVA = 'java',
  RUST = 'rust',
  UNKNOWN = 'unknown'
}

export enum IssueCategory {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  DATABASE = 'database',
  API = 'api',
  CONFIG = 'config'
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum TaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  NEEDS_REVIEW = 'NEEDS_REVIEW'
}

export enum AgentType {
  CLAUDE_CODE = 'claude',
  GEMINI_CLI = 'gemini'
}

// Advanced union types
export type TaskTransition =
  | { from: 'pending'; to: 'completed'; trigger: 'execution_success' }
  | { from: 'pending'; to: 'needs_review'; trigger: 'execution_needs_review' }
  | { from: 'completed'; to: 'pending'; trigger: 'reopen_task' }
  | { from: 'needs_review'; to: 'completed'; trigger: 'review_approved' }
  | { from: 'needs_review'; to: 'pending'; trigger: 'review_rejected' };

// Conditional types for agent capabilities
export type AgentCapability<T extends AgentType> = T extends AgentType.CLAUDE_CODE
  ? {
      codeReview: true;
      complexAnalysis: true;
      multiFileRefactor: true;
      architecturalInsights: true;
    }
  : T extends AgentType.GEMINI_CLI
    ? {
        quickFixes: true;
        scriptGeneration: true;
        simpleDebugging: true;
        terminalOperations: true;
      }
    : never;

// Template literal types for better string validation
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
export type ConfigPath = `config/${string}.yaml`;
export type TaskPattern = `task_${number}`;

// Mapped types for configuration
export interface Config {
  readonly version: string;
  readonly environment: string;
  readonly features: {
    readonly autoExecute: boolean;
    readonly humanReview: boolean;
    readonly logging: boolean;
  };
  readonly agents: {
    readonly claude: {
      readonly enabled: boolean;
      readonly apiKey?: string;
    };
    readonly gemini: {
      readonly enabled: boolean;
      readonly apiKey?: string;
    };
  };
}

export type ConfigSchema = {
  readonly [K in keyof Config]: Config[K] extends object ? Readonly<Config[K]> : Config[K];
};

// Utility types
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

// Event system types
export interface TaskEvent<T = unknown> {
  readonly type: string;
  readonly timestamp: Date;
  readonly taskId: TaskId;
  readonly payload: T;
}

export interface TaskCreatedEvent {
  readonly task: Task;
}

export interface TaskUpdatedEvent {
  readonly task: Task;
  readonly previousStatus: TaskStatus;
}

export interface TaskCompletedEvent {
  readonly task: Task;
  readonly result: string;
  readonly duration: number;
}

export interface TaskFailedEvent {
  readonly task: Task;
  readonly error: Error;
}

export interface AgentSelectedEvent {
  readonly taskId: TaskId;
  readonly agent: AgentType;
}

export interface HumanInterventionEvent {
  readonly taskId: TaskId;
  readonly action: 'approve' | 'reject' | 'modify';
  readonly reason?: string;
}

export type TaskEventMap = {
  'task:created': TaskCreatedEvent;
  'task:updated': TaskUpdatedEvent;
  'task:completed': TaskCompletedEvent;
  'task:failed': TaskFailedEvent;
  'agent:selected': AgentSelectedEvent;
  'human:intervention': HumanInterventionEvent;
};

// File discovery types
export interface SuggestedFile {
  readonly path: string;
  readonly confidence: number;
  readonly reason: string;
}

// Task assessment types
export interface TaskAssessment {
  readonly urgency: number;
  readonly complexity: number;
  readonly businessImpact: number;
  readonly overallCriticality: number;
}

// Execution result types
export interface ExecutionResult {
  readonly agent: AgentType;
  readonly output: string;
  readonly duration: number;
  readonly confidence: number;
  readonly filesAnalyzed: string[];
  readonly codeChanges?: string;
  readonly summary: string;
}

export interface TaskResult {
  readonly task: Task;
  readonly result: ExecutionResult;
  readonly action: 'completed' | 'retry' | 'failed';
}

// Error types
export class TaskNotFoundError extends Error {
  constructor(public readonly taskId: TaskId) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

export class AgentSelectionError extends Error {
  constructor(message: string) {
    super(`Agent selection failed: ${message}`);
    this.name = 'AgentSelectionError';
  }
}

export class ExecutionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ExecutionError';
  }
}

export class ReviewError extends Error {
  constructor(message: string) {
    super(`Review failed: ${message}`);
    this.name = 'ReviewError';
  }
}
