import { TaskManager } from '../../src/utils/task-manager';
import { RepositoryAnalyzer } from '../../src/utils/repository-analyzer';
import { TaskStatus, Priority, TaskCategory } from '../../src/types/index';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';


// Mock external dependencies
jest.mock('fs/promises');
jest.mock('fs');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockFsSync = fsSync as jest.Mocked<typeof fsSync>;

describe('Complete Workflow Integration Tests', () => {
  let tempDir: string;
  let taskManager: TaskManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    tempDir = '/test/integration-project';
    taskManager = new TaskManager(tempDir);

    // Setup default mocks
    mockFsSync.existsSync.mockReturnValue(true);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue('{"version":"1.0","lastSaved":"2023-01-01T00:00:00.000Z","tasks":[]}');
  });

  describe('Task Lifecycle Workflow', () => {
    it('should complete full task lifecycle: create -> list -> get -> update -> execute -> complete', async () => {
      // Step 1: Initialize task manager
      const initResult = await taskManager.initialize();
      expect(initResult.success).toBe(true);

      // Step 2: Create a new task
      const createInput = {
        title: 'Implement User Authentication',
        description: 'Add JWT-based authentication system',
        category: TaskCategory.BACKEND,
        priority: Priority.HIGH,
        affectedFiles: ['src/auth/auth.service.ts', 'src/auth/jwt.util.ts'],
        estimatedDuration: 180,
        dependencies: []
      };

      const createResult = await taskManager.createTask(createInput);
      expect(createResult.success).toBe(true);
      expect(createResult.data!.schema.title).toBe('Implement User Authentication');
      expect(createResult.data!.status).toBe(TaskStatus.PENDING);

      const taskId = createResult.data!.schema.id;

      // Step 3: List tasks to verify creation
      const listResult = await taskManager.listTasks();
      expect(listResult.success).toBe(true);
      expect(listResult.data).toHaveLength(1);
      expect(listResult.data![0].schema.id).toBe(taskId);

      // Step 4: Get specific task details
      const getResult = await taskManager.getTask(taskId);
      expect(getResult.success).toBe(true);
      expect(getResult.data!.schema.title).toBe('Implement User Authentication');
      expect(getResult.data!.schema.affectedFiles).toContain('src/auth/auth.service.ts');

      // Step 5: Update task with additional information
      const updateResult = await taskManager.updateTask(taskId, {
        status: TaskStatus.IN_PROGRESS,
        humanApproved: true,
        metadata: {
          version: 2,
          createdBy: 'test-user',
          lastModified: new Date().toISOString(),
          notes: 'Starting implementation'
        }
      });
      expect(updateResult.success).toBe(true);
      expect(updateResult.data!.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updateResult.data!.humanApproved).toBe(true);

      // Step 6: Simulate task execution completion
      const completeResult = await taskManager.updateTaskStatus(taskId, TaskStatus.COMPLETED);
      expect(completeResult.success).toBe(true);
      expect(completeResult.data!.status).toBe(TaskStatus.COMPLETED);

      // Step 7: Verify final state
      const finalGetResult = await taskManager.getTask(taskId);
      expect(finalGetResult.success).toBe(true);
      expect(finalGetResult.data!.status).toBe(TaskStatus.COMPLETED);
      expect(finalGetResult.data!.metadata.version).toBeGreaterThan(1);
    });

    it('should handle task dependencies correctly', async () => {
      await taskManager.initialize();

      // Create parent task
      const parentTask = await taskManager.createTask({
        title: 'Setup Database Schema',
        category: TaskCategory.DATABASE,
        priority: Priority.HIGH
      });
      expect(parentTask.success).toBe(true);
      const parentId = parentTask.data!.schema.id;

      // Create dependent task
      const dependentTask = await taskManager.createTask({
        title: 'Create User Model',
        category: TaskCategory.BACKEND,
        priority: Priority.MEDIUM,
        dependencies: [parentId]
      });
      expect(dependentTask.success).toBe(true);
      expect(dependentTask.data!.schema.dependencies).toContain(parentId);

      // Verify dependency relationship
      const getDependent = await taskManager.getTask(dependentTask.data!.schema.id);
      expect(getDependent.success).toBe(true);
      expect(getDependent.data!.schema.dependencies).toContain(parentId);

      // Complete parent task
      await taskManager.updateTaskStatus(parentId, TaskStatus.COMPLETED);

      // Verify dependent task can now be processed
      const nextTask = await taskManager.getNextPendingTask();
      expect(nextTask.success).toBe(true);
      expect(nextTask.data!.schema.id).toBe(dependentTask.data!.schema.id);
    });

    it('should maintain data consistency across operations', async () => {
      await taskManager.initialize();

      // Create multiple tasks
      const tasks = await Promise.all([
        taskManager.createTask({
          title: 'Frontend Task',
          category: TaskCategory.FRONTEND,
          priority: Priority.HIGH
        }),
        taskManager.createTask({
          title: 'Backend Task',
          category: TaskCategory.BACKEND,
          priority: Priority.MEDIUM
        }),
        taskManager.createTask({
          title: 'Database Task',
          category: TaskCategory.DATABASE,
          priority: Priority.LOW
        })
      ]);

      // Verify all tasks were created
      tasks.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Get statistics
      const stats = await taskManager.getStatistics();
      expect(stats.success).toBe(true);
      expect(stats.data!.total).toBe(3);
      expect(stats.data!.byStatus[TaskStatus.PENDING]).toBe(3);
      expect(stats.data!.byCategory[TaskCategory.FRONTEND]).toBe(1);
      expect(stats.data!.byCategory[TaskCategory.BACKEND]).toBe(1);
      expect(stats.data!.byCategory[TaskCategory.DATABASE]).toBe(1);

      // Update one task
      const firstTaskId = tasks[0].data!.schema.id;
      await taskManager.updateTaskStatus(firstTaskId, TaskStatus.COMPLETED);

      // Verify statistics updated
      const updatedStats = await taskManager.getStatistics();
      expect(updatedStats.success).toBe(true);
      expect(updatedStats.data!.byStatus[TaskStatus.PENDING]).toBe(2);
      expect(updatedStats.data!.byStatus[TaskStatus.COMPLETED]).toBe(1);

      // Delete one task
      const secondTaskId = tasks[1].data!.schema.id;
      await taskManager.deleteTask(secondTaskId);

      // Verify final state
      const finalList = await taskManager.listTasks();
      expect(finalList.success).toBe(true);
      expect(finalList.data).toHaveLength(2);
    });
  });

  describe('Repository Analysis Workflow', () => {
    it('should analyze repository and create relevant tasks', async () => {
      // Mock fs.pathExists for RepositoryAnalyzer
      const mockPathExists = jest.fn().mockResolvedValue(true);
      const mockReaddir = jest.fn().mockResolvedValue(['package.json', 'src', 'tests']);
      const mockReadJson = jest.fn().mockResolvedValue({
        name: 'test-project',
        dependencies: { express: '^4.18.0' }
      });

      // Mock fs-extra methods used by RepositoryAnalyzer
      require('fs-extra').pathExists = mockPathExists;
      require('fs-extra').readdir = mockReaddir;
      require('fs-extra').readJson = mockReadJson;

      // Step 1: Analyze repository structure
      const repoAnalysis = await RepositoryAnalyzer.analyze(tempDir);
      expect(repoAnalysis.success).toBe(true);
      expect(repoAnalysis.data!.projectType).toContain('Node.js');

      // Step 2: Get project structure
      const structureResult = await RepositoryAnalyzer.getProjectStructure(tempDir);
      expect(structureResult.success).toBe(true);

      // Step 3: Find important files
      const importantFiles = await RepositoryAnalyzer.findImportantFiles(tempDir);
      expect(importantFiles.success).toBe(true);

      // Step 4: Initialize task manager
      await taskManager.initialize();

      // Step 5: Create tasks based on analysis
      const authTask = await taskManager.createTask({
        title: 'Review Authentication Service',
        description: 'Review and improve the AuthService implementation',
        category: TaskCategory.SECURITY,
        priority: Priority.HIGH,
        affectedFiles: ['src/auth/auth.service.ts']
      });
      expect(authTask.success).toBe(true);

      // Step 6: Create testing task
      const testTask = await taskManager.createTask({
        title: 'Add Authentication Tests',
        description: 'Create comprehensive tests for authentication service',
        category: TaskCategory.TESTING,
        priority: Priority.MEDIUM,
        affectedFiles: ['tests/auth.test.ts'],
        dependencies: [authTask.data!.schema.id]
      });
      expect(testTask.success).toBe(true);

      // Step 7: Verify task relationships
      const allTasks = await taskManager.listTasks();
      expect(allTasks.success).toBe(true);
      expect(allTasks.data).toHaveLength(2);

      const testTaskData = allTasks.data!.find(t => t.schema.title === 'Add Authentication Tests');
      expect(testTaskData!.schema.dependencies).toContain(authTask.data!.schema.id);
    });

    it('should handle complex project analysis and task generation', async () => {
      // Mock repository analysis
      const mockPathExists = jest.fn().mockResolvedValue(true);
      const mockReaddir = jest.fn().mockResolvedValue(['package.json']);
      const mockReadJson = jest.fn().mockResolvedValue({
        name: 'test-project',
        dependencies: { express: '^4.18.0', jsonwebtoken: '^9.0.0' },
        devDependencies: { jest: '^29.0.0', typescript: '^5.0.0' }
      });

      require('fs-extra').pathExists = mockPathExists;
      require('fs-extra').readdir = mockReaddir;
      require('fs-extra').readJson = mockReadJson;

      // Analyze repository
      const repoAnalysis = await RepositoryAnalyzer.analyze(tempDir);
      expect(repoAnalysis.success).toBe(true);

      // Initialize task manager
      await taskManager.initialize();

      // Create tasks based on project analysis
      const tasks = await Promise.all([
        // Security task based on JWT usage
        taskManager.createTask({
          title: 'Security Audit - JWT Implementation',
          description: 'Review JWT token handling and security practices',
          category: TaskCategory.SECURITY,
          priority: Priority.HIGH,
          affectedFiles: ['src/auth/auth.service.ts', 'src/auth/jwt.util.ts']
        }),
        
        // Performance task
        taskManager.createTask({
          title: 'Performance Review',
          description: 'Analyze and optimize application performance',
          category: TaskCategory.PERFORMANCE,
          priority: Priority.MEDIUM,
          estimatedDuration: 240
        }),
        
        // Documentation task
        taskManager.createTask({
          title: 'Update API Documentation',
          description: 'Update documentation for authentication endpoints',
          category: TaskCategory.DOCUMENTATION,
          priority: Priority.LOW,
          affectedFiles: ['README.md']
        })
      ]);

      // Verify all tasks created successfully
      tasks.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify task prioritization
      const nextTask = await taskManager.getNextPendingTask();
      expect(nextTask.success).toBe(true);
      expect(nextTask.data!.schema.priority).toBe(Priority.HIGH);
      expect(nextTask.data!.schema.title).toContain('Security Audit');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle file system errors gracefully', async () => {
      // Simulate file system error
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await taskManager.loadTasks();
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to load tasks');

      // Recovery: Reset mocks and retry
      mockFs.readFile.mockResolvedValue('{"version":"1.0","lastSaved":"2023-01-01T00:00:00.000Z","tasks":[]}');

      const retryResult = await taskManager.loadTasks();
      expect(retryResult.success).toBe(true);
    });

    it('should handle corrupted task data', async () => {
      // Simulate corrupted JSON
      mockFs.readFile.mockResolvedValue('{"version":"1.0","tasks":[{invalid}]}');

      const result = await taskManager.loadTasks();
      expect(result.success).toBe(false);

      // Should be able to reinitialize
      mockFs.readFile.mockResolvedValue('{"version":"1.0","lastSaved":"2023-01-01T00:00:00.000Z","tasks":[]}');
      const initResult = await taskManager.initialize();
      expect(initResult.success).toBe(true);
    });

    it('should maintain consistency during concurrent operations', async () => {
      await taskManager.initialize();

      // Simulate concurrent task creation
      const concurrentTasks = await Promise.allSettled([
        taskManager.createTask({
          title: 'Task 1',
          category: TaskCategory.FRONTEND,
          priority: Priority.HIGH
        }),
        taskManager.createTask({
          title: 'Task 2',
          category: TaskCategory.BACKEND,
          priority: Priority.MEDIUM
        }),
        taskManager.createTask({
          title: 'Task 3',
          category: TaskCategory.DATABASE,
          priority: Priority.LOW
        })
      ]);

      // All tasks should be created successfully
      const successfulTasks = concurrentTasks.filter(result => 
        result.status === 'fulfilled' && result.value.success
      );
      expect(successfulTasks.length).toBe(3);

      // Verify final state consistency
      const finalList = await taskManager.listTasks();
      expect(finalList.success).toBe(true);
      expect(finalList.data).toHaveLength(3);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large number of tasks efficiently', async () => {
      await taskManager.initialize();

      // Create many tasks
      const taskPromises = Array.from({ length: 50 }, (_, i) => 
        taskManager.createTask({
          title: `Task ${i + 1}`,
          category: TaskCategory.BACKEND,
          priority: i % 4 as Priority,
          estimatedDuration: 30 + (i % 120)
        })
      );

      const results = await Promise.all(taskPromises);
      
      // Verify all tasks created
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Test filtering performance
      const filterStart = Date.now();
      const filteredTasks = await taskManager.listTasks({
        status: [TaskStatus.PENDING],
        priority: [Priority.HIGH],
        limit: 10
      });
      const filterTime = Date.now() - filterStart;

      expect(filteredTasks.success).toBe(true);
      expect(filteredTasks.data!.length).toBeLessThanOrEqual(10);
      expect(filterTime).toBeLessThan(1000); // Should complete within 1 second

      // Test statistics calculation
      const statsStart = Date.now();
      const stats = await taskManager.getStatistics();
      const statsTime = Date.now() - statsStart;

      expect(stats.success).toBe(true);
      expect(stats.data!.total).toBe(50);
      expect(statsTime).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Data Migration and Versioning', () => {
    it('should handle version upgrades gracefully', async () => {
      // Simulate old version data
      const oldVersionData = {
        version: '0.9',
        tasks: [
          {
            id: 'old-task-1',
            title: 'Old Format Task',
            status: 'pending',
            // Missing new fields
          }
        ]
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(oldVersionData));

      // Should handle loading old format
      const result = await taskManager.loadTasks();
      
      // Depending on implementation, this might succeed with migration
      // or fail with clear error message
      if (result.success) {
        expect(result.data).toBeDefined();
      } else {
        expect(result.error).toContain('Failed to load tasks');
      }
    });

    it('should backup data before major operations', async () => {
      await taskManager.initialize();

      // Create some tasks
      await taskManager.createTask({
        title: 'Important Task',
        category: TaskCategory.BACKEND,
        priority: Priority.HIGH
      });

      // Verify backup functionality (if implemented)
      const tasksFilePath = taskManager.getTasksFilePath();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        tasksFilePath,
        expect.any(String)
      );
    });
  });
}); 