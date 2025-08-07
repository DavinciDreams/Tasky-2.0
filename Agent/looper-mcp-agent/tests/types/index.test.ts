import {
  TaskStatus,
  Priority,
  TaskCategory,
  AgentProvider,
  TaskSchemaSchema,
  TaskMetadataSchema,
  TaskSchema,
  TaskFileSchema,
  Task,
  CreateTaskInput,
  TaskFilterOptions,
  ToolResult
} from '../../src/types/index';

describe('MCP Agent Types', () => {
  describe('Enums', () => {
    it('should have correct TaskStatus values', () => {
      expect(TaskStatus.PENDING).toBe('PENDING');
      expect(TaskStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(TaskStatus.COMPLETED).toBe('COMPLETED');
      expect(TaskStatus.FAILED).toBe('FAILED');
      expect(TaskStatus.CANCELLED).toBe('CANCELLED');
      expect(TaskStatus.NEEDS_REVIEW).toBe('NEEDS_REVIEW');
    });

    it('should have correct Priority values', () => {
      expect(Priority.LOW).toBe(0);
      expect(Priority.MEDIUM).toBe(1);
      expect(Priority.HIGH).toBe(2);
      expect(Priority.CRITICAL).toBe(3);
    });

    it('should have correct TaskCategory values', () => {
      expect(TaskCategory.FRONTEND).toBe('FRONTEND');
      expect(TaskCategory.BACKEND).toBe('BACKEND');
      expect(TaskCategory.DATABASE).toBe('DATABASE');
      expect(TaskCategory.API).toBe('API');
      expect(TaskCategory.UI_UX).toBe('UI_UX');
      expect(TaskCategory.PERFORMANCE).toBe('PERFORMANCE');
      expect(TaskCategory.SECURITY).toBe('SECURITY');
      expect(TaskCategory.TESTING).toBe('TESTING');
      expect(TaskCategory.DOCUMENTATION).toBe('DOCUMENTATION');
      expect(TaskCategory.CONFIG).toBe('CONFIG');
      expect(TaskCategory.REFACTOR).toBe('REFACTOR');
      expect(TaskCategory.BUGFIX).toBe('BUGFIX');
      expect(TaskCategory.FEATURE).toBe('FEATURE');
    });

    it('should have correct AgentProvider values', () => {
      expect(AgentProvider.CLAUDE).toBe('claude');
      expect(AgentProvider.GEMINI).toBe('gemini');
    });
  });

  describe('Schema Validation', () => {
    describe('TaskSchemaSchema', () => {
      it('should validate valid task schema', () => {
        const validSchema = {
          id: 'task-123',
          title: 'Test Task',
          description: 'Test description',
          category: TaskCategory.BACKEND,
          priority: Priority.HIGH,
          affectedFiles: ['src/test.ts'],
          createdAt: '2023-01-01T00:00:00.000Z',
          estimatedDuration: 60,
          dependencies: ['task-456']
        };

        const result = TaskSchemaSchema.safeParse(validSchema);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('task-123');
          expect(result.data.title).toBe('Test Task');
          expect(result.data.category).toBe(TaskCategory.BACKEND);
          expect(result.data.priority).toBe(Priority.HIGH);
        }
      });

      it('should validate minimal task schema', () => {
        const minimalSchema = {
          id: 'task-123',
          title: 'Test Task',
          category: TaskCategory.BACKEND,
          priority: Priority.HIGH,
          createdAt: '2023-01-01T00:00:00.000Z'
        };

        const result = TaskSchemaSchema.safeParse(minimalSchema);
        expect(result.success).toBe(true);
      });

      it('should reject invalid task schema', () => {
        const invalidSchema = {
          id: 123, // Should be string
          title: 'Test Task',
          category: 'INVALID_CATEGORY',
          priority: 'HIGH', // Should be number
          createdAt: '2023-01-01T00:00:00.000Z'
        };

        const result = TaskSchemaSchema.safeParse(invalidSchema);
        expect(result.success).toBe(false);
      });

      it('should require mandatory fields', () => {
        const incompleteSchema = {
          title: 'Test Task'
          // Missing id, category, priority, createdAt
        };

        const result = TaskSchemaSchema.safeParse(incompleteSchema);
        expect(result.success).toBe(false);
      });
    });

    describe('TaskMetadataSchema', () => {
      it('should validate valid metadata', () => {
        const validMetadata = {
          version: 1,
          createdBy: 'test-user',
          lastModified: '2023-01-01T00:00:00.000Z',
          executedBy: 'claude',
          executionTime: 5000,
          notes: 'Test notes'
        };

        const result = TaskMetadataSchema.safeParse(validMetadata);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.version).toBe(1);
          expect(result.data.createdBy).toBe('test-user');
        }
      });

      it('should validate minimal metadata', () => {
        const minimalMetadata = {
          version: 1,
          createdBy: 'test-user',
          lastModified: '2023-01-01T00:00:00.000Z'
        };

        const result = TaskMetadataSchema.safeParse(minimalMetadata);
        expect(result.success).toBe(true);
      });

      it('should reject invalid metadata', () => {
        const invalidMetadata = {
          version: '1', // Should be number
          createdBy: 123, // Should be string
          lastModified: new Date() // Should be string
        };

        const result = TaskMetadataSchema.safeParse(invalidMetadata);
        expect(result.success).toBe(false);
      });
    });

    describe('TaskSchema', () => {
      it('should validate complete task', () => {
        const validTask = {
          schema: {
            id: 'task-123',
            title: 'Test Task',
            description: 'Test description',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH,
            affectedFiles: ['src/test.ts'],
            createdAt: '2023-01-01T00:00:00.000Z',
            estimatedDuration: 60,
            dependencies: []
          },
          status: TaskStatus.PENDING,
          humanApproved: false,
          metadata: {
            version: 1,
            createdBy: 'test-user',
            lastModified: '2023-01-01T00:00:00.000Z'
          }
        };

        const result = TaskSchema.safeParse(validTask);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.schema.id).toBe('task-123');
          expect(result.data.status).toBe(TaskStatus.PENDING);
          expect(result.data.humanApproved).toBe(false);
        }
      });

      it('should reject task with invalid status', () => {
        const invalidTask = {
          schema: {
            id: 'task-123',
            title: 'Test Task',
            category: TaskCategory.BACKEND,
            priority: Priority.HIGH,
            createdAt: '2023-01-01T00:00:00.000Z'
          },
          status: 'INVALID_STATUS',
          humanApproved: false,
          metadata: {
            version: 1,
            createdBy: 'test-user',
            lastModified: '2023-01-01T00:00:00.000Z'
          }
        };

        const result = TaskSchema.safeParse(invalidTask);
        expect(result.success).toBe(false);
      });
    });

    describe('TaskFileSchema', () => {
      it('should validate task file', () => {
        const validTaskFile = {
          version: '1.0',
          lastSaved: '2023-01-01T00:00:00.000Z',
          tasks: [
            {
              schema: {
                id: 'task-123',
                title: 'Test Task',
                category: TaskCategory.BACKEND,
                priority: Priority.HIGH,
                createdAt: '2023-01-01T00:00:00.000Z'
              },
              status: TaskStatus.PENDING,
              humanApproved: false,
              metadata: {
                version: 1,
                createdBy: 'test-user',
                lastModified: '2023-01-01T00:00:00.000Z'
              }
            }
          ]
        };

        const result = TaskFileSchema.safeParse(validTaskFile);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.version).toBe('1.0');
          expect(result.data.tasks).toHaveLength(1);
        }
      });

      it('should validate empty task file', () => {
        const emptyTaskFile = {
          version: '1.0',
          lastSaved: '2023-01-01T00:00:00.000Z',
          tasks: []
        };

        const result = TaskFileSchema.safeParse(emptyTaskFile);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Type Interfaces', () => {
    it('should type CreateTaskInput correctly', () => {
      const createInput: CreateTaskInput = {
        title: 'Test Task',
        description: 'Test description',
        category: TaskCategory.BACKEND,
        priority: Priority.HIGH,
        affectedFiles: ['src/test.ts'],
        estimatedDuration: 60,
        dependencies: ['task-456']
      };

      expect(createInput.title).toBe('Test Task');
      expect(createInput.category).toBe(TaskCategory.BACKEND);
      expect(createInput.priority).toBe(Priority.HIGH);
    });

    it('should type TaskFilterOptions correctly', () => {
      const filterOptions: TaskFilterOptions = {
        status: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
        category: [TaskCategory.BACKEND],
        priority: [Priority.HIGH, Priority.CRITICAL],
        search: 'test',
        limit: 10,
        offset: 0
      };

      expect(filterOptions.status).toHaveLength(2);
      expect(filterOptions.category).toContain(TaskCategory.BACKEND);
      expect(filterOptions.limit).toBe(10);
    });

    it('should type ToolResult correctly', () => {
      const successResult: ToolResult<string> = {
        success: true,
        data: 'test data',
        message: 'Success message'
      };

      const failureResult: ToolResult<never> = {
        success: false,
        error: 'Error message'
      };

      expect(successResult.success).toBe(true);
      expect(successResult.data).toBe('test data');
      expect(failureResult.success).toBe(false);
      expect(failureResult.error).toBe('Error message');
    });
  });

  describe('Enum Value Validation', () => {
    it('should contain all expected TaskStatus values', () => {
      const statusValues = Object.values(TaskStatus);
      expect(statusValues).toHaveLength(6);
      expect(statusValues).toContain('PENDING');
      expect(statusValues).toContain('IN_PROGRESS');
      expect(statusValues).toContain('COMPLETED');
      expect(statusValues).toContain('FAILED');
      expect(statusValues).toContain('CANCELLED');
      expect(statusValues).toContain('NEEDS_REVIEW');
    });

    it('should contain all expected Priority values', () => {
      const priorityValues = Object.values(Priority);
      expect(priorityValues).toHaveLength(8); // 4 string keys + 4 number values
      expect(priorityValues).toContain(0);
      expect(priorityValues).toContain(1);
      expect(priorityValues).toContain(2);
      expect(priorityValues).toContain(3);
    });

    it('should contain all expected TaskCategory values', () => {
      const categoryValues = Object.values(TaskCategory);
      expect(categoryValues).toHaveLength(13);
      expect(categoryValues).toContain('FRONTEND');
      expect(categoryValues).toContain('BACKEND');
      expect(categoryValues).toContain('DATABASE');
      expect(categoryValues).toContain('API');
      expect(categoryValues).toContain('UI_UX');
      expect(categoryValues).toContain('PERFORMANCE');
      expect(categoryValues).toContain('SECURITY');
      expect(categoryValues).toContain('TESTING');
      expect(categoryValues).toContain('DOCUMENTATION');
      expect(categoryValues).toContain('CONFIG');
      expect(categoryValues).toContain('REFACTOR');
      expect(categoryValues).toContain('BUGFIX');
      expect(categoryValues).toContain('FEATURE');
    });

    it('should contain all expected AgentProvider values', () => {
      const providerValues = Object.values(AgentProvider);
      expect(providerValues).toHaveLength(2);
      expect(providerValues).toContain('claude');
      expect(providerValues).toContain('gemini');
    });
  });

  describe('Type Compatibility', () => {
    it('should maintain type safety between schemas and interfaces', () => {
      // Create a task using the schema
      const taskData = {
        schema: {
          id: 'task-123',
          title: 'Test Task',
          category: TaskCategory.BACKEND,
          priority: Priority.HIGH,
          createdAt: '2023-01-01T00:00:00.000Z'
        },
        status: TaskStatus.PENDING,
        humanApproved: false,
        metadata: {
          version: 1,
          createdBy: 'test-user',
          lastModified: '2023-01-01T00:00:00.000Z'
        }
      };

      // Should be assignable to Task type
      const task: Task = taskData;
      expect(task.schema.id).toBe('task-123');
      expect(task.status).toBe(TaskStatus.PENDING);

      // Should be valid according to schema
      const validationResult = TaskSchema.safeParse(taskData);
      expect(validationResult.success).toBe(true);
    });
  });
}); 