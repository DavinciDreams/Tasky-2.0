import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskyEngine } from './tasky-engine';
import { ITaskStorage } from '../storage/ITaskStorage';
import { TaskStatus, TaskyTask } from '../../types/task';

// --- Helper to create a mock ITaskStorage ---
function createMockStorage(initialTasks: TaskyTask[] = []): ITaskStorage {
  let tasks = [...initialTasks];
  return {
    initialize: vi.fn().mockResolvedValue({ success: true }),
    loadAllTasks: vi.fn().mockImplementation(async () => ({
      success: true,
      data: [...tasks],
    })),
    saveTask: vi.fn().mockImplementation(async (task: TaskyTask) => {
      const idx = tasks.findIndex(t => t.schema.id === task.schema.id);
      if (idx >= 0) tasks[idx] = task;
      else tasks.push(task);
      return { success: true };
    }),
    deleteTask: vi.fn().mockImplementation(async (id: string) => {
      tasks = tasks.filter(t => t.schema.id !== id);
      return { success: true };
    }),
  };
}

// --- Helper to build a task object ---
function makeTask(overrides: Partial<TaskyTask> & { schema: Partial<TaskyTask['schema']> }): TaskyTask {
  const now = new Date();
  return {
    status: TaskStatus.PENDING,
    metadata: { version: 1, createdBy: 'test', lastModified: now },
    ...overrides,
    schema: {
      id: 'test-id',
      title: 'Test Task',
      createdAt: now,
      updatedAt: now,
      tags: [],
      affectedFiles: [],
      dependencies: [],
      ...overrides.schema,
    },
  };
}

describe('TaskyEngine', () => {
  let engine: TaskyEngine;
  let storage: ITaskStorage;

  beforeEach(() => {
    storage = createMockStorage();
    engine = new TaskyEngine(undefined, storage);
  });

  // ---- Constructor ----
  describe('constructor', () => {
    it('throws if no storage implementation is provided', () => {
      expect(() => new TaskyEngine(undefined, undefined as any)).toThrow(
        'TaskyEngine requires an ITaskStorage implementation'
      );
    });
  });

  // ---- initialize ----
  describe('initialize()', () => {
    it('initializes storage and loads tasks', async () => {
      const result = await engine.initialize();
      expect(result.success).toBe(true);
      expect(storage.initialize).toHaveBeenCalled();
      expect(storage.loadAllTasks).toHaveBeenCalled();
    });

    it('returns failure when storage.initialize fails', async () => {
      (storage.initialize as any).mockResolvedValue({ success: false, error: 'db error' });
      const result = await engine.initialize();
      expect(result.success).toBe(false);
    });
  });

  // ---- createTask ----
  describe('createTask()', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('creates a task with valid input', async () => {
      const result = await engine.createTask({ title: 'New Task' });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.schema.title).toBe('New Task');
      expect(result.data!.status).toBe(TaskStatus.PENDING);
      expect(storage.saveTask).toHaveBeenCalled();
    });

    it('rejects empty title', async () => {
      const result = await engine.createTask({ title: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('title');
    });

    it('rejects whitespace-only title', async () => {
      const result = await engine.createTask({ title: '   ' });
      expect(result.success).toBe(false);
    });

    it('rejects title longer than 200 characters', async () => {
      const result = await engine.createTask({ title: 'A'.repeat(201) });
      expect(result.success).toBe(false);
      expect(result.error).toContain('title');
    });

    it('rejects past due date', async () => {
      const pastDate = new Date(Date.now() - 100000);
      const result = await engine.createTask({ title: 'Test', dueDate: pastDate });
      expect(result.success).toBe(false);
      expect(result.error).toContain('past');
    });

    it('rejects invalid assignedAgent', async () => {
      const result = await engine.createTask({ title: 'Test', assignedAgent: 'invalid-agent' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('assignedAgent');
    });

    it('accepts valid assignedAgent "gemini"', async () => {
      const result = await engine.createTask({ title: 'Test', assignedAgent: 'gemini' });
      expect(result.success).toBe(true);
      expect(result.data!.schema.assignedAgent).toBe('gemini');
    });

    it('generates a unique task ID', async () => {
      const r1 = await engine.createTask({ title: 'Task One' });
      const r2 = await engine.createTask({ title: 'Task Two' });
      expect(r1.data!.schema.id).not.toBe(r2.data!.schema.id);
    });

    it('emits task:created event', async () => {
      const handler = vi.fn();
      engine.getEventBus().on('task:created', handler);
      await engine.createTask({ title: 'Evented' });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ task: expect.objectContaining({ schema: expect.objectContaining({ title: 'Evented' }) }) })
      );
    });
  });

  // ---- updateTask ----
  describe('updateTask()', () => {
    let taskId: string;

    beforeEach(async () => {
      storage = createMockStorage();
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();
      const r = await engine.createTask({ title: 'Original' });
      taskId = r.data!.schema.id;
    });

    it('updates the title of an existing task', async () => {
      const result = await engine.updateTask(taskId, { title: 'Updated' });
      expect(result.success).toBe(true);
      expect(result.data!.schema.title).toBe('Updated');
    });

    it('returns failure for non-existent task', async () => {
      const result = await engine.updateTask('nonexistent', { title: 'X' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('sets completedAt when status transitions to COMPLETED', async () => {
      const result = await engine.updateTask(taskId, { status: TaskStatus.COMPLETED });
      expect(result.success).toBe(true);
      expect(result.data!.completedAt).toBeInstanceOf(Date);
    });

    it('does not reset completedAt when updating already completed task', async () => {
      await engine.updateTask(taskId, { status: TaskStatus.COMPLETED });
      const result = await engine.updateTask(taskId, { title: 'Still done' });
      // completedAt should still be set from the first completion
      expect(result.data!.completedAt).toBeInstanceOf(Date);
    });

    it('increments metadata version on update', async () => {
      const r1 = await engine.updateTask(taskId, { title: 'V2' });
      expect(r1.data!.metadata!.version).toBe(2);
      const r2 = await engine.updateTask(taskId, { title: 'V3' });
      expect(r2.data!.metadata!.version).toBe(3);
    });

    it('emits task:updated event', async () => {
      const handler = vi.fn();
      engine.getEventBus().on('task:updated', handler);
      await engine.updateTask(taskId, { title: 'New' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('emits task:completed event on completion', async () => {
      const handler = vi.fn();
      engine.getEventBus().on('task:completed', handler);
      await engine.updateTask(taskId, { status: TaskStatus.COMPLETED });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ completionMethod: 'manual' })
      );
    });
  });

  // ---- deleteTask ----
  describe('deleteTask()', () => {
    let taskId: string;

    beforeEach(async () => {
      storage = createMockStorage();
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();
      const r = await engine.createTask({ title: 'To Delete' });
      taskId = r.data!.schema.id;
    });

    it('deletes an existing task', async () => {
      const result = await engine.deleteTask(taskId);
      expect(result.success).toBe(true);
      expect(storage.deleteTask).toHaveBeenCalledWith(taskId);
    });

    it('returns failure for non-existent task', async () => {
      const result = await engine.deleteTask('nonexistent');
      expect(result.success).toBe(false);
    });

    it('task is gone after deletion', async () => {
      await engine.deleteTask(taskId);
      const getResult = await engine.getTask(taskId);
      expect(getResult.success).toBe(false);
    });
  });

  // ---- getTasks with filters ----
  describe('getTasks()', () => {
    beforeEach(async () => {
      const tasks = [
        makeTask({ status: TaskStatus.PENDING, schema: { id: 't1', title: 'Alpha bug', tags: ['bug'], createdAt: new Date('2025-01-01') } }),
        makeTask({ status: TaskStatus.COMPLETED, schema: { id: 't2', title: 'Beta feature', tags: ['feature'], createdAt: new Date('2025-01-02') } }),
        makeTask({ status: TaskStatus.PENDING, schema: { id: 't3', title: 'Gamma bug', tags: ['bug', 'urgent'], dueDate: new Date('2025-06-01'), createdAt: new Date('2025-01-03') } }),
      ];
      storage = createMockStorage(tasks);
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();
    });

    it('returns all tasks with no filters', async () => {
      const result = await engine.getTasks();
      expect(result.success).toBe(true);
      expect(result.data!.length).toBe(3);
    });

    it('filters by status', async () => {
      const result = await engine.getTasks({ status: [TaskStatus.PENDING] });
      expect(result.data!.length).toBe(2);
      expect(result.data!.every(t => t.status === TaskStatus.PENDING)).toBe(true);
    });

    it('filters by tags', async () => {
      const result = await engine.getTasks({ tags: ['urgent'] });
      expect(result.data!.length).toBe(1);
      expect(result.data![0].schema.id).toBe('t3');
    });

    it('filters by search text in title', async () => {
      const result = await engine.getTasks({ search: 'bug' });
      expect(result.data!.length).toBe(2);
    });

    it('filters by search text case-insensitively', async () => {
      const result = await engine.getTasks({ search: 'BETA' });
      expect(result.data!.length).toBe(1);
    });

    it('applies date range filter', async () => {
      const result = await engine.getTasks({
        dueDateFrom: new Date('2025-05-01'),
        dueDateTo: new Date('2025-07-01'),
      });
      expect(result.data!.length).toBe(1);
      expect(result.data![0].schema.id).toBe('t3');
    });

    it('applies pagination (offset + limit)', async () => {
      const result = await engine.getTasks({ offset: 1, limit: 1 });
      expect(result.data!.length).toBe(1);
    });

    it('sorts tasks with dueDate first', async () => {
      const result = await engine.getTasks();
      // t3 has a dueDate, should appear before tasks without
      const ids = result.data!.map(t => t.schema.id);
      expect(ids[0]).toBe('t3');
    });
  });

  // ---- getTaskStats ----
  describe('getTaskStats()', () => {
    it('returns correct counts by status', async () => {
      const tasks = [
        makeTask({ status: TaskStatus.PENDING, schema: { id: 't1', title: 'A', createdAt: new Date() } }),
        makeTask({ status: TaskStatus.PENDING, schema: { id: 't2', title: 'B', createdAt: new Date() } }),
        makeTask({ status: TaskStatus.COMPLETED, completedAt: new Date(), schema: { id: 't3', title: 'C', createdAt: new Date() } }),
      ];
      storage = createMockStorage(tasks);
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();

      const result = await engine.getTaskStats();
      expect(result.success).toBe(true);
      expect(result.data!.total).toBe(3);
      expect(result.data!.byStatus[TaskStatus.PENDING]).toBe(2);
      expect(result.data!.byStatus[TaskStatus.COMPLETED]).toBe(1);
    });
  });

  // ---- getTaskAnalytics ----
  describe('getTaskAnalytics()', () => {
    it('returns analytics object with expected shape', async () => {
      const tasks = [
        makeTask({ status: TaskStatus.COMPLETED, completedAt: new Date(), schema: { id: 't1', title: 'Done', createdAt: new Date(Date.now() - 3600000) } }),
        makeTask({ status: TaskStatus.PENDING, schema: { id: 't2', title: 'Todo', createdAt: new Date() } }),
      ];
      storage = createMockStorage(tasks);
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();

      const result = await engine.getTaskAnalytics();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('productivity');
      expect(result.data).toHaveProperty('completionRate');
      expect(result.data).toHaveProperty('averageCompletionTime');
      expect(result.data).toHaveProperty('taskDistribution');
      expect(result.data).toHaveProperty('trends');
      expect(result.data!.completionRate).toBe(50);
    });
  });

  // ---- archiveTask ----
  describe('archiveTask()', () => {
    it('sets status to ARCHIVED', async () => {
      storage = createMockStorage();
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();
      const created = await engine.createTask({ title: 'To Archive' });
      const taskId = created.data!.schema.id;

      const result = await engine.archiveTask(taskId);
      expect(result.success).toBe(true);

      const task = await engine.getTask(taskId);
      expect(task.data!.status).toBe(TaskStatus.ARCHIVED);
    });

    it('returns failure for non-existent task', async () => {
      storage = createMockStorage();
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();
      const result = await engine.archiveTask('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  // ---- observe ----
  describe('observe()', () => {
    it('returns an observation with correct counts', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 86400000); // yesterday
      const tasks = [
        makeTask({ status: TaskStatus.PENDING, schema: { id: 't1', title: 'A', dueDate: pastDate, createdAt: now } }),
        makeTask({ status: TaskStatus.COMPLETED, schema: { id: 't2', title: 'B', createdAt: now } }),
      ];
      storage = createMockStorage(tasks);
      engine = new TaskyEngine(undefined, storage);
      await engine.initialize();

      const obs = await engine.observe();
      expect(obs.totalTasks).toBe(2);
      expect(obs.pendingTasks).toBe(1);
      expect(obs.completedTasks).toBe(1);
      expect(obs.overdueTasks).toBe(1);
    });
  });

  // ---- getLastUpdated ----
  describe('getLastUpdated()', () => {
    it('returns a numeric timestamp', async () => {
      storage = createMockStorage();
      engine = new TaskyEngine(undefined, storage);
      const ts = engine.getLastUpdated();
      expect(typeof ts).toBe('number');
      expect(ts).toBeGreaterThan(0);
    });
  });
});
