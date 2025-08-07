import { LooperMCPTools } from '../../src/tools/index';
import { TaskManager } from '../../src/utils/task-manager';
import { RepositoryAnalyzer } from '../../src/utils/repository-analyzer';
import { TaskStatus, Priority, TaskCategory } from '../../src/types/index';
import { TestUtils } from '../setup.js';

// Mock dependencies
jest.mock('../../src/utils/task-manager');
jest.mock('../../src/utils/repository-analyzer');
jest.mock('child_process');

const MockTaskManager = TaskManager as jest.MockedClass<typeof TaskManager>;
const MockRepositoryAnalyzer = RepositoryAnalyzer as jest.MockedClass<typeof RepositoryAnalyzer>;

describe('MCP Tools', () => {
  let looperTools: LooperMCPTools;
  let mockTaskManager: jest.Mocked<TaskManager>;
  let mockRepositoryAnalyzer: jest.Mocked<RepositoryAnalyzer>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup TaskManager mock
    mockTaskManager = {
      initialize: jest.fn(),
      createTask: jest.fn(),
      listTasks: jest.fn(),
      getTask: jest.fn(),
      updateTask: jest.fn(),
      deleteTask: jest.fn(),
      getNextPendingTask: jest.fn(),
      updateTaskStatus: jest.fn(),
      getProjectPath: jest.fn().mockReturnValue('/test/project'),
      getTasksFilePath: jest.fn().mockReturnValue('/test/project/tasks/tasks.json'),
      loadTasks: jest.fn(),
      saveTasks: jest.fn(),
      getStatistics: jest.fn(),
      exists: jest.fn()
    } as any;

    // Setup RepositoryAnalyzer mock
    mockRepositoryAnalyzer = {
      analyzeRepository: jest.fn(),
      discoverFiles: jest.fn(),
      analyzeFile: jest.fn(),
      getProjectPath: jest.fn().mockReturnValue('/test/project')
    } as any;

    MockTaskManager.mockImplementation(() => mockTaskManager);
    MockRepositoryAnalyzer.mockImplementation(() => mockRepositoryAnalyzer);
    looperTools = new LooperMCPTools('/test/project');
  });

  describe('Tool Definitions', () => {
    it('should return all available tools', () => {
      const tools = looperTools.getTools();
      
      expect(tools).toHaveLength(6);
      expect(tools.map(t => t.name)).toEqual([
        'looper_create_task',
        'looper_list_tasks',
        'looper_get_task',
        'looper_update_task',
        'looper_delete_task',
        'looper_run_next_task'
      ]);
    });

    it('should have correct schema for create task tool', () => {
      const tools = looperTools.getTools();
      const createTool = tools.find(t => t.name === 'looper_create_task');
      
      expect(createTool).toBeDefined();
      expect(createTool!.inputSchema.required).toEqual(['title', 'category', 'priority']);
      expect((createTool!.inputSchema.properties as any).category.enum).toEqual(Object.values(TaskCategory));
      expect((createTool!.inputSchema.properties as any).priority.enum).toEqual([0, 1, 2, 3]);
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const mockTask = TestUtils.createMockTask({
        schema: {
          id: 'task-123',
          title: 'Test Task',
          category: TaskCategory.BACKEND,
          priority: Priority.HIGH
        }
      });

      mockTaskManager.createTask.mockResolvedValue({
        success: true,
        data: mockTask
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH,
            description: 'Test description',
            affectedFiles: ['src/test.ts'],
            estimatedDuration: 60,
            dependencies: []
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Task created successfully');
      expect(result.content[0].text).toContain('task-123');
      expect(mockTaskManager.createTask).toHaveBeenCalledWith({
        title: 'Test Task',
        category: TaskCategory.BACKEND,
        priority: Priority.HIGH,
        description: 'Test description',
        affectedFiles: ['src/test.ts'],
        estimatedDuration: 60,
        dependencies: []
      });
    });

    it('should handle task creation errors', async () => {
      mockTaskManager.createTask.mockResolvedValue({
        success: false,
        error: 'Failed to create task'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Failed to create task');
      expect(result.isError).toBe(true);
    });

    it('should handle missing required fields', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Missing required fields');
      expect(result.isError).toBe(true);
    });

    it('should validate task category', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: 'INVALID_CATEGORY' as any,
            priority: Priority.HIGH
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Invalid category');
      expect(result.isError).toBe(true);
    });

    it('should validate task priority', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: 999 as any
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Invalid priority');
      expect(result.isError).toBe(true);
    });
  });

  describe('listTasks', () => {
    it('should list all tasks', async () => {
      const mockTasks = [
        TestUtils.createMockTask({
          schema: { id: 'task-1', title: 'Task 1', category: TaskCategory.BACKEND, priority: Priority.HIGH },
          status: TaskStatus.PENDING
        }),
        TestUtils.createMockTask({
          schema: { id: 'task-2', title: 'Task 2', category: TaskCategory.FRONTEND, priority: Priority.MEDIUM },
          status: TaskStatus.COMPLETED
        })
      ];

      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: mockTasks
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_list_tasks',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Found 2 task(s)');
      expect(result.content[0].text).toContain('Task 1');
      expect(result.content[0].text).toContain('Task 2');
      expect(mockTaskManager.listTasks).toHaveBeenCalledWith({
        status: undefined,
        category: undefined,
        priority: undefined,
        search: undefined,
        limit: 20,
        offset: 0
      });
    });

    it('should list tasks with filters', async () => {
      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_list_tasks',
          arguments: {
            status: [TaskStatus.PENDING],
            category: [TaskCategory.FRONTEND],
            priority: [Priority.HIGH],
            search: 'test',
            limit: 10,
            offset: 0
          }
        }
      } as any);

      expect(result.content[0].text).toContain('No tasks found');
      expect(mockTaskManager.listTasks).toHaveBeenCalledWith({
        status: [TaskStatus.PENDING],
        category: [TaskCategory.FRONTEND],
        priority: [Priority.HIGH],
        search: 'test',
        limit: 10,
        offset: 0
      });
    });

    it('should handle list errors', async () => {
      mockTaskManager.listTasks.mockResolvedValue({
        success: false,
        error: 'Failed to load tasks'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_list_tasks',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Failed to list tasks');
      expect(result.isError).toBe(true);
    });

    it('should format task list output', async () => {
      const mockTasks = [
        TestUtils.createMockTask({
          schema: {
            id: 'task-1',
            title: 'Frontend Task',
            category: TaskCategory.FRONTEND,
            priority: Priority.HIGH,
            createdAt: '2023-01-01T00:00:00.000Z'
          },
          status: TaskStatus.PENDING
        })
      ];

      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: mockTasks
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_list_tasks',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Frontend Task');
      expect(result.content[0].text).toContain('FRONTEND');
      expect(result.content[0].text).toContain('HIGH');
      expect(result.content[0].text).toContain('PENDING');
    });
  });

  describe('getTask', () => {
    it('should get task by ID', async () => {
      const mockTask = TestUtils.createMockTask({
        schema: {
          id: 'task-123',
          title: 'Test Task',
          description: 'Task description',
          category: TaskCategory.BACKEND,
          priority: Priority.HIGH
        }
      });

      mockTaskManager.getTask.mockResolvedValue({
        success: true,
        data: mockTask
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_get_task',
          arguments: { taskId: 'task-123' }
        }
      } as any);

      expect(result.content[0].text).toContain('Test Task');
      expect(result.content[0].text).toContain('task-123');
      expect(mockTaskManager.getTask).toHaveBeenCalledWith('task-123');
    });

    it('should handle task not found', async () => {
      mockTaskManager.getTask.mockResolvedValue({
        success: false,
        error: 'Task not found'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_get_task',
          arguments: { taskId: 'non-existent' }
        }
      } as any);

      expect(result.content[0].text).toContain('Failed to get task');
      expect(result.isError).toBe(true);
    });

    it('should handle missing task ID', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_get_task',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Task ID is required');
      expect(result.isError).toBe(true);
    });

    it('should format task details', async () => {
      const mockTask = TestUtils.createMockTask({
        schema: {
          id: 'task-123',
          title: 'Detailed Task',
          description: 'This is a detailed task',
          category: TaskCategory.FRONTEND,
          priority: Priority.HIGH,
          affectedFiles: ['src/component.tsx', 'src/style.css'],
          dependencies: ['task-456'],
          estimatedDuration: 120
        },
        status: TaskStatus.IN_PROGRESS,
        humanApproved: true
      });

      mockTaskManager.getTask.mockResolvedValue({
        success: true,
        data: mockTask
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_get_task',
          arguments: { taskId: 'task-123' }
        }
      } as any);

      expect(result.content[0].text).toContain('Detailed Task');
      expect(result.content[0].text).toContain('This is a detailed task');
      expect(result.content[0].text).toContain('IN_PROGRESS');
      expect(result.content[0].text).toContain('src/component.tsx');
      expect(result.content[0].text).toContain('task-456');
      expect(result.content[0].text).toContain('120 minutes');
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updatedTask = TestUtils.createMockTask({
        schema: { id: 'task-123', title: 'Updated Task', category: TaskCategory.BACKEND, priority: Priority.HIGH },
        status: TaskStatus.COMPLETED
      });

      mockTaskManager.updateTask.mockResolvedValue({
        success: true,
        data: updatedTask
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_update_task',
          arguments: {
            taskId: 'task-123',
            title: 'Updated Task',
            status: TaskStatus.COMPLETED
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Task updated successfully');
      expect(mockTaskManager.updateTask).toHaveBeenCalledWith('task-123', {
        schema: { title: 'Updated Task' },
        status: TaskStatus.COMPLETED
      });
    });

    it('should handle update errors', async () => {
      mockTaskManager.updateTask.mockResolvedValue({
        success: false,
        error: 'Task not found'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_update_task',
          arguments: {
            taskId: 'task-123',
            status: TaskStatus.COMPLETED
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Failed to update task');
      expect(result.isError).toBe(true);
    });

    it('should handle missing task ID', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_update_task',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Task ID is required');
      expect(result.isError).toBe(true);
    });

    it('should validate status updates', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_update_task',
          arguments: {
            taskId: 'task-123',
            status: 'INVALID_STATUS' as any
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Invalid status');
      expect(result.isError).toBe(true);
    });

    it('should update multiple fields', async () => {
      const updatedTask = TestUtils.createMockTask();

      mockTaskManager.updateTask.mockResolvedValue({
        success: true,
        data: updatedTask
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_update_task',
          arguments: {
            taskId: 'task-123',
            title: 'New Title',
            description: 'New Description',
            status: TaskStatus.COMPLETED,
            priority: Priority.LOW,
            humanApproved: true,
            notes: 'Completed successfully'
          }
        }
      } as any);

      expect(mockTaskManager.updateTask).toHaveBeenCalledWith('task-123', {
        title: 'New Title',
        description: 'New Description',
        status: TaskStatus.COMPLETED,
        priority: Priority.LOW,
        humanApproved: true,
        notes: 'Completed successfully'
      });
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      mockTaskManager.deleteTask.mockResolvedValue({
        success: true,
        message: 'Task deleted successfully'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_delete_task',
          arguments: { taskId: 'task-123' }
        }
      } as any);

      expect(result.content[0].text).toContain('Task deleted successfully');
      expect(mockTaskManager.deleteTask).toHaveBeenCalledWith('task-123');
    });

    it('should handle delete errors', async () => {
      mockTaskManager.deleteTask.mockResolvedValue({
        success: false,
        error: 'Task not found'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_delete_task',
          arguments: { taskId: 'task-123' }
        }
      } as any);

      expect(result.content[0].text).toContain('Failed to delete task');
      expect(result.isError).toBe(true);
    });

    it('should handle missing task ID', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_delete_task',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Task ID is required');
      expect(result.isError).toBe(true);
    });
  });

  describe('runNextTask', () => {
    beforeEach(() => {
      // Mock child_process for task execution
      const mockExec = require('child_process').exec;
      mockExec.mockImplementation((command: string, callback: Function) => {
        setTimeout(() => callback(null, 'Task executed successfully', ''), 100);
      });
    });

    it('should run next pending task', async () => {
      const mockTask = TestUtils.createMockTask({
        schema: {
          id: 'task-123',
          title: 'Pending Task',
          category: TaskCategory.BACKEND,
          priority: Priority.HIGH
        },
        status: TaskStatus.PENDING
      });

      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: [mockTask]
      });

      mockTaskManager.updateTaskStatus.mockResolvedValue({
        success: true,
        data: { ...mockTask, status: TaskStatus.COMPLETED }
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_run_next_task',
          arguments: { autoApprove: true }
        }
      } as any);

      expect(result.content[0].text).toContain('Pending Task');
      expect(mockTaskManager.listTasks).toHaveBeenCalledWith({
        status: [TaskStatus.PENDING],
        limit: 1,
        offset: 0
      });
    });

    it('should handle no pending tasks', async () => {
      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: []
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_run_next_task',
          arguments: { autoApprove: true }
        }
      } as any);

      expect(result.content[0].text).toContain('No Pending Tasks Available');
    });

    it('should handle task execution errors', async () => {
      const mockTask = TestUtils.createMockTask({
        schema: { id: 'task-123', title: 'Failing Task' }
      });

      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: [mockTask]
      });

      const mockExec = require('child_process').exec;
      mockExec.mockImplementation((command: string, callback: Function) => {
        setTimeout(() => callback(new Error('Execution failed'), '', 'Error output'), 100);
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_run_next_task',
          arguments: { autoApprove: true }
        }
      } as any);

      expect(result.content[0].text).toContain('Task execution failed');
      expect(mockTaskManager.updateTaskStatus).toHaveBeenCalledWith('task-123', TaskStatus.FAILED);
    });

    it('should require approval when autoApprove is false', async () => {
      const mockTask = TestUtils.createMockTask({
        schema: { id: 'task-123', title: 'Pending Task' },
        humanApproved: false
      });

      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: [mockTask]
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_run_next_task',
          arguments: { autoApprove: false }
        }
      } as any);

      expect(result.content[0].text).toContain('Pending Task requires human approval');
    });

    it('should skip unapproved tasks when autoApprove is true', async () => {
      const mockTask = TestUtils.createMockTask({
        schema: { id: 'task-123', title: 'Unapproved Task' },
        humanApproved: false
      });

      mockTaskManager.listTasks.mockResolvedValue({
        success: true,
        data: [mockTask]
      });

      mockTaskManager.updateTask.mockResolvedValue({
        success: true,
        data: { ...mockTask, humanApproved: true }
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_run_next_task',
          arguments: { autoApprove: true }
        }
      } as any);

      expect(mockTaskManager.updateTask).toHaveBeenCalledWith('task-123', {
        humanApproved: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tools', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'unknown_tool',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('Unknown tool: unknown_tool');
      expect(result.isError).toBe(true);
    });

    it('should handle tool execution errors', async () => {
      mockTaskManager.createTask.mockRejectedValue(new Error('Database connection failed'));

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Error executing tool');
      expect(result.content[0].text).toContain('Database connection failed');
      expect(result.isError).toBe(true);
    });

    it('should handle tool initialization errors', async () => {
      mockTaskManager.initialize.mockResolvedValue({
        success: false,
        error: 'Initialization failed'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Failed to initialize');
      expect(result.isError).toBe(true);
    });

    it('should format error messages consistently', async () => {
      mockTaskManager.getTask.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_get_task',
          arguments: { taskId: 'task-123' }
        }
      } as any);

      expect(result.content[0].text).toMatch(/^Error: /);
      expect(result.content[0].text).toContain('Database connection failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockTaskManager.listTasks.mockRejectedValue(new Error('Unexpected error'));

      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_list_tasks',
          arguments: {}
        }
      } as any);

      expect(result.content[0].text).toContain('An unexpected error occurred');
      expect(result.isError).toBe(true);
    });
  });

  describe('Input Validation', () => {
    it('should validate enum values', async () => {
      const invalidCategory = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: 'NOT_A_CATEGORY' as any,
            priority: Priority.HIGH
          }
        }
      } as any);

      expect(invalidCategory.content[0].text).toContain('Invalid category');
      expect(invalidCategory.isError).toBe(true);

      const invalidPriority = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: 'NOT_A_PRIORITY' as any
          }
        }
      } as any);

      expect(invalidPriority.content[0].text).toContain('Invalid priority');
      expect(invalidPriority.isError).toBe(true);
    });

    it('should validate array inputs', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_list_tasks',
          arguments: {
            status: ['INVALID_STATUS'] as any
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Invalid status values');
      expect(result.isError).toBe(true);
    });

    it('should validate numeric inputs', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH,
            estimatedDuration: -1
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Estimated duration must be positive');
      expect(result.isError).toBe(true);
    });

    it('should validate string inputs', async () => {
      const result = await looperTools.handleToolCall({
        params: {
          name: 'looper_create_task',
          arguments: {
            title: '',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH
          }
        }
      } as any);

      expect(result.content[0].text).toContain('Title cannot be empty');
      expect(result.isError).toBe(true);
    });
  });
}); 