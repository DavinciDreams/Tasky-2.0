import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW' | 'ARCHIVED';

type TaskyTask = {
  schema: {
    id: string;
    title: string;
    description?: string;
    dueDate?: Date;
    createdAt: Date;
    updatedAt?: Date;
    tags?: string[];
    affectedFiles?: string[];
    estimatedDuration?: number;
    dependencies?: string[];
    assignedAgent?: string;
    executionPath?: string;
  };
  status: TaskStatus;
  humanApproved: boolean;
  result?: string;
  completedAt?: Date;
  reminderEnabled?: boolean;
  reminderTime?: string;
  notificationSent?: boolean;
  metadata?: {
    version: number;
    createdBy: string;
    lastModified: Date;
    archivedAt?: Date;
  };
};

type TaskFile = {
  version: string;
  lastSaved: string;
  tasks: TaskyTask[];
  metadata?: { totalTasks: number; lastTaskId: string };
};

const nowIso = () => new Date().toISOString();
const toDate = (v?: string | Date) => (v ? new Date(v) : undefined);

// Serialization helpers to persist Date fields as ISO strings
const serializeTask = (task: TaskyTask) => ({
  ...task,
  schema: {
    ...task.schema,
    createdAt: task.schema.createdAt?.toISOString(),
    updatedAt: task.schema.updatedAt?.toISOString(),
    dueDate: task.schema.dueDate?.toISOString()
  },
  completedAt: task.completedAt?.toISOString(),
  metadata: task.metadata
    ? {
        ...task.metadata,
        lastModified: task.metadata.lastModified?.toISOString(),
        archivedAt: task.metadata.archivedAt?.toISOString()
      }
    : undefined
});

const deserializeTask = (raw: any): TaskyTask => ({
  ...raw,
  schema: {
    ...raw.schema,
    createdAt: new Date(raw.schema.createdAt),
    updatedAt: raw.schema.updatedAt ? new Date(raw.schema.updatedAt) : undefined,
    dueDate: raw.schema.dueDate ? new Date(raw.schema.dueDate) : undefined
  },
  completedAt: raw.completedAt ? new Date(raw.completedAt) : undefined,
  metadata: raw.metadata
    ? {
        ...raw.metadata,
        lastModified: new Date(raw.metadata.lastModified),
        archivedAt: raw.metadata.archivedAt ? new Date(raw.metadata.archivedAt) : undefined
      }
    : undefined
});

export class TaskBridge {
  private tasksPath: string;

  constructor(tasksPath?: string) {
    this.tasksPath = tasksPath || path.join(process.cwd(), 'data', 'tasky-tasks.json');
    this.ensureFile();
  }

  private ensureFile() {
    const dir = path.dirname(this.tasksPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.tasksPath)) {
      const initial = { version: '1.0', lastSaved: nowIso(), tasks: [], metadata: { totalTasks: 0, lastTaskId: '' } };
      fs.writeFileSync(this.tasksPath, JSON.stringify(initial, null, 2), 'utf-8');
    }
  }

  private read(): TaskFile {
    try {
      const raw = fs.readFileSync(this.tasksPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const tasks: TaskyTask[] = Array.isArray(parsed.tasks) ? parsed.tasks.map(deserializeTask) : [];
      return { version: parsed.version || '1.0', lastSaved: parsed.lastSaved || nowIso(), tasks, metadata: parsed.metadata };
    } catch {
      return { version: '1.0', lastSaved: nowIso(), tasks: [], metadata: { totalTasks: 0, lastTaskId: '' } };
    }
  }

  private write(file: TaskFile) {
    file.lastSaved = nowIso();
    const last = file.tasks.length > 0 ? file.tasks[file.tasks.length - 1] : undefined;
    file.metadata = file.metadata || { totalTasks: file.tasks.length, lastTaskId: last?.schema.id || '' };
    file.metadata.totalTasks = file.tasks.length;
    file.metadata.lastTaskId = last?.schema.id || '';
    const toWrite = {
      version: file.version,
      lastSaved: file.lastSaved,
      tasks: file.tasks.map(serializeTask),
      metadata: file.metadata
    };
    // Atomic write: write to temp file then rename
    const dir = path.dirname(this.tasksPath);
    const tmpPath = path.join(dir, `.tmp_${path.basename(this.tasksPath)}_${Date.now()}`);
    fs.writeFileSync(tmpPath, JSON.stringify(toWrite, null, 2), 'utf-8');
    try {
      fs.renameSync(tmpPath, this.tasksPath);
    } catch (e) {
      // Fallback to direct write if rename fails
      fs.writeFileSync(this.tasksPath, JSON.stringify(toWrite, null, 2), 'utf-8');
      try { fs.unlinkSync(tmpPath); } catch {}
    }
  }

  private generateTaskId(title: string): string {
    const prefix = String(title)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .slice(0, 3)
      .join('_');
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const uuid = uuidv4().slice(0, 8);
    return `${prefix}_${timestamp}_${uuid}`;
  }

  async createTask(args: any): Promise<CallToolResult> {
    if (!args?.title || typeof args.title !== 'string') {
      return { content: [{ type: 'text', text: 'title is required' }], isError: true };
    }
    const file = this.read();
    const now = new Date();
    const task: TaskyTask = {
      schema: {
        id: this.generateTaskId(args.title),
        title: args.title,
        description: args.description,
        dueDate: toDate(args.dueDate),
        createdAt: now,
        updatedAt: now,
        tags: args.tags || [],
        affectedFiles: args.affectedFiles || [],
        estimatedDuration: args.estimatedDuration,
        dependencies: args.dependencies || [],
        assignedAgent: args.assignedAgent,
        executionPath: args.executionPath
      },
      status: 'PENDING',
      humanApproved: false,
      reminderEnabled: !!args.reminderEnabled,
      reminderTime: args.reminderTime,
      metadata: { version: 1, createdBy: 'tasky-mcp', lastModified: now }
    };
    file.tasks.push(task);
    this.write(file);
    return { content: [{ type: 'text', text: JSON.stringify(task) }] };
  }

  async updateTask(args: any): Promise<CallToolResult> {
    const { id, updates } = args || {};
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const file = this.read();
    const idx = file.tasks.findIndex(t => t.schema.id === id);
    if (idx < 0) return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
    const prev = file.tasks[idx];
    const now = new Date();
    const nextStatus: TaskStatus | undefined = updates?.status;
    const completedAt = nextStatus === 'COMPLETED' && prev.status !== 'COMPLETED' ? now : prev.completedAt;

    const schemaFieldNames = new Set([
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
    const topLevelFieldNames = new Set([
      'status',
      'reminderEnabled',
      'reminderTime',
      'result',
      'humanApproved'
    ]);

    const schemaUpdates: any = {};
    const topLevelUpdates: any = {};

    if (updates && typeof updates === 'object') {
      for (const [key, value] of Object.entries(updates)) {
        if (schemaFieldNames.has(key)) {
          schemaUpdates[key] = key === 'dueDate' ? toDate(value as any) : value;
        } else if (topLevelFieldNames.has(key)) {
          topLevelUpdates[key] = value;
        }
      }
    }

    const next: TaskyTask = {
      ...prev,
      ...topLevelUpdates,
      status: nextStatus ?? prev.status,
      schema: {
        ...prev.schema,
        ...schemaUpdates,
        updatedAt: now
      },
      completedAt,
      metadata: {
        version: (prev.metadata?.version || 1) + 1,
        createdBy: prev.metadata?.createdBy || 'tasky-mcp',
        lastModified: now,
        archivedAt: prev.metadata?.archivedAt
      }
    };
    file.tasks[idx] = next;
    this.write(file);
    return { content: [{ type: 'text', text: JSON.stringify(next) }] };
  }

  async deleteTask(args: any): Promise<CallToolResult> {
    const { id } = args || {};
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const file = this.read();
    const before = file.tasks.length;
    file.tasks = file.tasks.filter(t => t.schema.id !== id);
    if (file.tasks.length === before) return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
    this.write(file);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
  }

  async getTask(args: any): Promise<CallToolResult> {
    const { id } = args || {};
    if (!id) return { content: [{ type: 'text', text: 'id is required' }], isError: true };
    const file = this.read();
    const task = file.tasks.find(t => t.schema.id === id);
    if (!task) return { content: [{ type: 'text', text: 'Task not found' }], isError: true };
    // Provide both a brief summary and a resource link to the underlying file
    const summary = `Task ${task.schema.id}: ${task.schema.title}`;
    const normalizedPath = this.tasksPath.replace(/\\/g, '/');
    const fileUri = `file:///${normalizedPath}`;
    return {
      content: [
        { type: 'text', text: summary },
        { type: 'text', text: JSON.stringify(task) },
        { type: 'resource_link', uri: fileUri, name: 'tasky-tasks.json', mimeType: 'application/json', description: 'Tasks storage file' as any }
      ] as any
    };
  }

  async listTasks(args: any): Promise<CallToolResult> {
    const file = this.read();
    let tasks = [...file.tasks];
    if (Array.isArray(args?.status) && args.status.length) tasks = tasks.filter(t => args.status.includes(t.status));
    if (Array.isArray(args?.tags) && args.tags.length) tasks = tasks.filter(t => (t.schema.tags || []).some((tag) => args.tags.includes(tag)));
    if (args?.search) {
      const s = String(args.search).toLowerCase();
      tasks = tasks.filter(t => t.schema.title.toLowerCase().includes(s) || (t.schema.description || '').toLowerCase().includes(s));
    }
    if (args?.dueDateFrom) {
      const from = new Date(args.dueDateFrom).getTime();
      tasks = tasks.filter(t => t.schema.dueDate && new Date(t.schema.dueDate).getTime() >= from);
    }
    if (args?.dueDateTo) {
      const to = new Date(args.dueDateTo).getTime();
      tasks = tasks.filter(t => t.schema.dueDate && new Date(t.schema.dueDate).getTime() <= to);
    }
    // Sort: dueDate asc, then createdAt desc
    tasks.sort((a, b) => {
      if (a.schema.dueDate && b.schema.dueDate) return new Date(a.schema.dueDate).getTime() - new Date(b.schema.dueDate).getTime();
      if (a.schema.dueDate) return -1;
      if (b.schema.dueDate) return 1;
      return new Date(b.schema.createdAt).getTime() - new Date(a.schema.createdAt).getTime();
    });
    const offset = args?.offset || 0;
    const limit = args?.limit || tasks.length;
    const page = tasks.slice(offset, offset + limit);
    const normalizedPath = this.tasksPath.replace(/\\/g, '/');
    const fileUri = `file:///${normalizedPath}`;
    return {
      content: [
        { type: 'text', text: `Returned ${page.length} of ${tasks.length} tasks` },
        { type: 'text', text: JSON.stringify(page) },
        { type: 'resource_link', uri: fileUri, name: 'tasky-tasks.json', mimeType: 'application/json', description: 'Tasks storage file' as any }
      ] as any
    };
  }

  async executeTask(args: any): Promise<CallToolResult> {
    const status: TaskStatus = (args?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS');
    const updates: any = { status };
    return this.updateTask({ id: args?.id, updates });
  }
}


