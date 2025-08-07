import { TaskManager } from '../../src/utils/task-manager';
import { TaskStatus, Priority, TaskCategory, CreateTaskInput } from '../../src/types/index';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { TestUtils } from '../setup.js';

// Mock fs modules
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

jest.mock('date-fns', () => ({
  format: jest.fn(() => '20231201_120000')
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockFsSync = fsSync as jest.Mocked<typeof fsSync>;

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let tempDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    tempDir = '/test/project';
    taskManager = new TaskManager(tempDir);

    // Setup default mocks
    mockFsSync.existsSync.mockReturnValue(true);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{"version":"1.0","lastSaved":"2023-01-01T00:00:00.000Z","tasks":[]}');
  });

  describe('Constructor', () => {
    it('should create TaskManager with default project path', () => {
      const manager = new TaskManager();
      expect(manager.getTasksFilePath()).toContain('tasks.json');
    });

    it('should create TaskManager with custom project path', () => {
      const customPath = '/custom/project';
      const manager = new TaskManager(customPath);
      expect(manager.getTasksFilePath()).toBe(path.join(customPath, 'tasks', 'tasks.json'));
    });
  });

  describe('Initialization', () => {
    it('should initialize tasks directory and file', async () => {
      mockFsSync.existsSync.mockReturnValue(false);

      const result = await taskManager.initialize();

      expect(result.success).toBe(true);
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(tempDir, 'tasks'),
        { recursive: true }
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(tempDir, 'tasks', 'tasks.json'),
        expect.stringContaining('"tasks":[]')
      );
    });

    it('should not overwrite existing tasks file', async () => {
      mockFsSync.existsSync.mockReturnValue(true);

      const result = await taskManager.initialize();

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      const result = await taskManager.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to initialize task file');
    });
  });

  describe('Task Loading', () => {
    it('should load tasks from file', async () => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          {
            schema: {
              id: 'task-1',
              title: 'Test Task',
              category: TaskCategory.BACKEND,
              priority: Priority.HIGH,
              createdAt: '2023-01-01T00:00:00.000Z'
            },
            status: TaskStatus.PENDING,
            humanApproved: false,
            metadata: {
              version: 1,
              createdBy: 'test',
              lastModified: '2023-01-01T00:00:00.000Z'
            }
          }
        ]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));

      const result = await taskManager.loadTasks();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].schema.id).toBe('task-1');
    });

    it('should initialize if file does not exist', async () => {
      mockFsSync.existsSync.mockReturnValue(false);

      const result = await taskManager.loadTasks();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      const result = await taskManager.loadTasks();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load tasks');
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File read error'));

      const result = await taskManager.loadTasks();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load tasks');
    });
  });

  describe('Task Saving', () => {
    it('should save tasks to file', async () => {
      const tasks = [TestUtils.createMockTask({
        schema: { category: TaskCategory.BACKEND, priority: Priority.MEDIUM },
        status: TaskStatus.PENDING
      })];

      const result = await taskManager.saveTasks(tasks);

      expect(result.success).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        taskManager.getTasksFilePath(),
        expect.stringContaining('"tasks":[')
      );
    });

    it('should handle save errors', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Write error'));

      const result = await taskManager.saveTasks([]);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to save tasks');
    });
  });

  describe('Task Creation', () => {
    beforeEach(() => {
      // Mock successful load/save operations
      mockFs.readFile.mockResolvedValue('{"version":"1.0","lastSaved":"2023-01-01T00:00:00.000Z","tasks":[]}');
    });

    it('should create a new task', async () => {
      const input: CreateTaskInput = {
        title: 'New Task',
        description: 'Task description',
        category: TaskCategory.FRONTEND,
        priority: Priority.HIGH,
        affectedFiles: ['src/test.ts'],
        estimatedDuration: 60,
        dependencies: []
      };

      const result = await taskManager.createTask(input);

      expect(result.success).toBe(true);
      expect(result.data!.schema.title).toBe('New Task');
      expect(result.data!.schema.category).toBe(TaskCategory.FRONTEND);
      expect(result.data!.schema.priority).toBe(Priority.HIGH);
      expect(result.data!.status).toBe(TaskStatus.PENDING);
      expect(result.data!.humanApproved).toBe(false);
      expect(result.data!.metadata.version).toBe(1);
      expect(result.data!.metadata.createdBy).toBe('mcp-agent');
    });

    it('should generate unique task ID', async () => {
      const input: CreateTaskInput = {
        title: 'Test Task',
        category: TaskCategory.BACKEND,
        priority: Priority.MEDIUM
      };

      const result = await taskManager.createTask(input);

      expect(result.success).toBe(true);
      expect(result.data!.schema.id).toMatch(/^test_task_\d+_[a-z0-9]+$/);
    });

    it('should set default values for optional fields', async () => {
      const input: CreateTaskInput = {
        title: 'Minimal Task',
        category: TaskCategory.BACKEND,
        priority: Priority.MEDIUM
      };

      const result = await taskManager.createTask(input);

      expect(result.success).toBe(true);
      expect(result.data!.schema.affectedFiles).toEqual([]);
      expect(result.data!.schema.dependencies).toEqual([]);
      expect(result.data!.schema.description).toBeUndefined();
    });

    it('should handle creation errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Load error'));

      const input: CreateTaskInput = {
        title: 'Test Task',
        category: TaskCategory.BACKEND,
        priority: Priority.MEDIUM
      };

      const result = await taskManager.createTask(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Load error');
    });
  });

  describe('Task Retrieval', () => {
    beforeEach(() => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          TestUtils.createMockTask({
            schema: { id: 'task-1', title: 'Task 1', category: TaskCategory.BACKEND, priority: Priority.MEDIUM },
            status: TaskStatus.PENDING
          }),
          TestUtils.createMockTask({
            schema: { id: 'task-2', title: 'Task 2', category: TaskCategory.BACKEND, priority: Priority.MEDIUM },
            status: TaskStatus.PENDING
          })
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));
    });

    it('should get task by ID', async () => {
      const result = await taskManager.getTask('task-1');

      expect(result.success).toBe(true);
      expect(result.data!.schema.id).toBe('task-1');
      expect(result.data!.schema.title).toBe('Task 1');
    });

    it('should return error for non-existent task', async () => {
      const result = await taskManager.getTask('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle load errors during get', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Load error'));

      const result = await taskManager.getTask('task-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Load error');
    });
  });

  describe('Task Updates', () => {
    beforeEach(() => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          TestUtils.createMockTask({
            schema: { id: 'task-1', title: 'Original Task', category: TaskCategory.BACKEND, priority: Priority.MEDIUM },
            status: TaskStatus.PENDING,
            metadata: { version: 1 }
          })
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));
    });

    it('should update task successfully', async () => {
      const updates = {
        status: TaskStatus.COMPLETED,
        humanApproved: true
      };

      const result = await taskManager.updateTask('task-1', updates);

      expect(result.success).toBe(true);
      expect(result.data!.schema.title).toBe('Original Task'); // Title unchanged
      expect(result.data!.status).toBe(TaskStatus.COMPLETED);
      expect(result.data!.humanApproved).toBe(true);
      expect(result.data!.metadata.version).toBe(2);
    });

    it('should handle partial updates', async () => {
      const updates = {
        status: TaskStatus.IN_PROGRESS
      };

      const result = await taskManager.updateTask('task-1', updates);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(TaskStatus.IN_PROGRESS);
      expect(result.data!.schema.title).toBe('Original Task'); // Should remain unchanged
    });

    it('should return error for non-existent task', async () => {
      const result = await taskManager.updateTask('non-existent', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle save errors during update', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Save error'));

      const result = await taskManager.updateTask('task-1', { status: TaskStatus.COMPLETED });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Save error');
    });
  });

  describe('Task Deletion', () => {
    beforeEach(() => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          TestUtils.createMockTask({
            schema: { id: 'task-1', title: 'Task to Delete' }
          }),
          TestUtils.createMockTask({
            schema: { id: 'task-2', title: 'Task to Keep' }
          })
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));
    });

    it('should delete task successfully', async () => {
      const result = await taskManager.deleteTask('task-1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should return error for non-existent task', async () => {
      const result = await taskManager.deleteTask('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Task Listing and Filtering', () => {
    beforeEach(() => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          TestUtils.createMockTask({
            schema: { 
              id: 'task-1', 
              title: 'Frontend Task',
              category: TaskCategory.FRONTEND,
              priority: Priority.HIGH,
              createdAt: '2023-01-01T00:00:00.000Z'
            },
            status: TaskStatus.PENDING
          }),
          TestUtils.createMockTask({
            schema: { 
              id: 'task-2', 
              title: 'Backend Task',
              category: TaskCategory.BACKEND,
              priority: Priority.LOW,
              createdAt: '2023-01-02T00:00:00.000Z'
            },
            status: TaskStatus.COMPLETED
          }),
          TestUtils.createMockTask({
            schema: { 
              id: 'task-3', 
              title: 'API Task',
              category: TaskCategory.API,
              priority: Priority.MEDIUM,
              createdAt: '2023-01-03T00:00:00.000Z'
            },
            status: TaskStatus.PENDING
          })
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));
    });

    it('should list all tasks', async () => {
      const result = await taskManager.listTasks();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const result = await taskManager.listTasks({
        status: [TaskStatus.PENDING]
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data!.every(task => task.status === TaskStatus.PENDING)).toBe(true);
    });

    it('should filter by category', async () => {
      const result = await taskManager.listTasks({
        category: [TaskCategory.FRONTEND]
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].schema.category).toBe(TaskCategory.FRONTEND);
    });

    it('should filter by priority', async () => {
      const result = await taskManager.listTasks({
        priority: [Priority.HIGH]
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].schema.priority).toBe(Priority.HIGH);
    });

    it('should search by text', async () => {
      const result = await taskManager.listTasks({
        search: 'Frontend'
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].schema.title).toContain('Frontend');
    });

    it('should apply pagination', async () => {
      const result = await taskManager.listTasks({
        limit: 2,
        offset: 1
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should sort by priority and creation date', async () => {
      const result = await taskManager.listTasks();

      expect(result.success).toBe(true);
      // Should be sorted by priority (highest first), then by creation date (newest first)
      expect(result.data![0].schema.priority).toBe(Priority.HIGH);
    });

    it('should combine multiple filters', async () => {
      const result = await taskManager.listTasks({
        status: [TaskStatus.PENDING],
        category: [TaskCategory.FRONTEND, TaskCategory.API],
        priority: [Priority.HIGH, Priority.MEDIUM]
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2); // Frontend (HIGH) and API (MEDIUM) tasks
    });
  });

  describe('Task Statistics', () => {
    beforeEach(() => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          TestUtils.createMockTask({
            schema: { category: TaskCategory.FRONTEND, priority: Priority.HIGH },
            status: TaskStatus.PENDING
          }),
          TestUtils.createMockTask({
            schema: { category: TaskCategory.BACKEND, priority: Priority.LOW },
            status: TaskStatus.COMPLETED
          }),
          TestUtils.createMockTask({
            schema: { category: TaskCategory.FRONTEND, priority: Priority.MEDIUM },
            status: TaskStatus.COMPLETED
          })
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));
    });

    it('should calculate task statistics', async () => {
      const result = await taskManager.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data!.total).toBe(3);
      expect(result.data!.byStatus[TaskStatus.PENDING]).toBe(1);
      expect(result.data!.byStatus[TaskStatus.COMPLETED]).toBe(2);
      expect(result.data!.byCategory[TaskCategory.FRONTEND]).toBe(2);
      expect(result.data!.byCategory[TaskCategory.BACKEND]).toBe(1);
      expect(result.data!.byPriority[Priority.HIGH]).toBe(1);
      expect(result.data!.byPriority[Priority.MEDIUM]).toBe(1);
      expect(result.data!.byPriority[Priority.LOW]).toBe(1);
    });

    it('should handle empty task list', async () => {
      mockFs.readFile.mockResolvedValue('{"version":"1.0","lastSaved":"2023-01-01T00:00:00.000Z","tasks":[]}');

      const result = await taskManager.getStatistics();

      expect(result.success).toBe(true);
      expect(result.data!.total).toBe(0);
    });
  });

  describe('Utility Methods', () => {
    it('should update task status', async () => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [TestUtils.createMockTask({ schema: { id: 'task-1' } })]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));

      const result = await taskManager.updateTaskStatus('task-1', TaskStatus.COMPLETED);

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe(TaskStatus.COMPLETED);
    });

    it('should get next pending task', async () => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          TestUtils.createMockTask({
            schema: { id: 'task-1', priority: Priority.HIGH },
            status: TaskStatus.PENDING
          }),
          TestUtils.createMockTask({
            schema: { id: 'task-2', priority: Priority.LOW },
            status: TaskStatus.PENDING
          })
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));

      const result = await taskManager.getNextPendingTask();

      expect(result.success).toBe(true);
      expect(result.data!.schema.id).toBe('task-1'); // Higher priority task
    });

    it('should return null when no pending tasks', async () => {
      const mockTaskData = {
        version: '1.0',
        lastSaved: '2023-01-01T00:00:00.000Z',
        tasks: [
          TestUtils.createMockTask({ status: TaskStatus.COMPLETED })
        ]
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTaskData));

      const result = await taskManager.getNextPendingTask();

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should check if tasks file exists', async () => {
      mockFsSync.existsSync.mockReturnValue(true);

      const exists = await taskManager.exists();

      expect(exists).toBe(true);
      expect(mockFsSync.existsSync).toHaveBeenCalledWith(taskManager.getTasksFilePath());
    });

    it('should get tasks file path', () => {
      const filePath = taskManager.getTasksFilePath();

      expect(filePath).toBe(path.join(tempDir, 'tasks', 'tasks.json'));
    });
  });

  describe('ID Generation', () => {
    it('should generate valid task IDs', () => {
      const generateTaskId = (taskManager as any).generateTaskId;
      
      const id1 = generateTaskId.call(taskManager, 'Test Task Title');
      const id2 = generateTaskId.call(taskManager, 'Another Task');

      expect(id1).toMatch(/^test_task_title_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^another_task_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should handle special characters in titles', () => {
      const generateTaskId = (taskManager as any).generateTaskId;
      
      const id = generateTaskId.call(taskManager, 'Fix Bug #123 & Update API!');

      expect(id).toMatch(/^fix_bug_update_\d+_[a-z0-9]+$/);
    });

    it('should limit prefix to 3 words', () => {
      const generateTaskId = (taskManager as any).generateTaskId;
      
      const id = generateTaskId.call(taskManager, 'This is a very long task title with many words');

      expect(id).toMatch(/^this_is_a_\d+_[a-z0-9]+$/);
    });
  });
}); 