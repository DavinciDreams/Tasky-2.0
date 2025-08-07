# Looper MCP Agent Test Suite

This directory contains comprehensive tests for the Looper MCP (Model Context Protocol) Agent. The test suite ensures reliability, correctness, and maintainability of the MCP agent functionality.

## Test Structure

```
tests/
├── setup.ts                    # Test setup and utilities
├── index.test.ts               # Main server integration tests
├── types/
│   └── index.test.ts          # Type definitions and schema validation tests
├── utils/
│   ├── task-manager.test.ts   # TaskManager utility tests
│   └── repository-analyzer.test.ts # RepositoryAnalyzer utility tests
├── tools/
│   └── index.test.ts          # MCP tools and handlers tests
└── integration/
    └── complete-workflow.test.ts # End-to-end workflow tests
```

## Test Categories

### Unit Tests
- **Types Tests** (`types/`): Validate type definitions, enums, and Zod schemas
- **Utils Tests** (`utils/`): Test utility classes like TaskManager and RepositoryAnalyzer
- **Tools Tests** (`tools/`): Test individual MCP tool handlers

### Integration Tests
- **Server Tests** (`index.test.ts`): Test MCP server initialization and configuration
- **Workflow Tests** (`integration/`): Test complete end-to-end workflows

## Running Tests

### Prerequisites
```bash
npm install
```

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode (for automated testing)
```bash
npm run test:ci
```

### Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

### Individual Test Files
```bash
# Test specific file
npx jest tests/utils/task-manager.test.ts

# Test with pattern
npx jest --testNamePattern="TaskManager"
```

## Test Configuration

The test suite uses Jest with TypeScript support via `ts-jest`. Configuration is in `jest.config.js`:

- **Environment**: Node.js
- **Test Match**: `**/*.test.ts` files
- **Setup**: `tests/setup.ts` for common mocks and utilities
- **Coverage**: Collects from `src/**/*.ts` (excluding entry points)
- **Timeout**: 30 seconds for integration tests

## Mocking Strategy

### External Dependencies
- **@modelcontextprotocol/sdk**: Mocked to avoid network dependencies
- **fs/fs-extra**: Mocked for file system operations
- **child_process**: Mocked for command execution

### Internal Dependencies
- **TaskManager**: Mocked in tool tests, real in integration tests
- **RepositoryAnalyzer**: Mocked in tool tests, real in integration tests

## Test Utilities

### TestUtils (in setup.ts)
Provides helper functions for creating mock data:
- `createMockTask()`: Creates valid task objects
- `createMockTaskFile()`: Creates task file structures
- `createMockRepositoryData()`: Creates repository analysis data

### Mock Patterns
```typescript
// File system mocking
mockFs.readFile.mockResolvedValue('file content');
mockFsSync.existsSync.mockReturnValue(true);

// Task manager mocking
mockTaskManager.createTask.mockResolvedValue({
  success: true,
  data: mockTask
});
```

## Writing New Tests

### Test File Structure
```typescript
import { YourModule } from '../../src/path/to/module.js';
import { TestUtils } from '../setup.js';

describe('YourModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mocks
  });

  describe('Feature Group', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = TestUtils.createMockInput();
      
      // Act
      const result = await yourModule.method(input);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedOutput);
    });
  });
});
```

### Best Practices

1. **Descriptive Test Names**: Use clear, specific test descriptions
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **Mock Isolation**: Clear mocks between tests
4. **Error Testing**: Test both success and failure cases
5. **Edge Cases**: Test boundary conditions and edge cases
6. **Integration Coverage**: Test realistic workflows

### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  const promise = asyncOperation();
  await expect(promise).resolves.toEqual(expectedResult);
});

it('should handle async errors', async () => {
  const promise = failingAsyncOperation();
  await expect(promise).rejects.toThrow('Expected error');
});
```

### Testing Tool Handlers
```typescript
it('should handle tool call correctly', async () => {
  const mockInput = {
    title: 'Test Task',
    category: TaskCategory.BACKEND,
    priority: Priority.HIGH
  };

  const result = await createTaskTool(mockInput);

  expect(result).toEqual([{
    type: 'text',
    text: expect.stringContaining('Task created successfully')
  }]);
});
```

## Coverage Goals

- **Overall Coverage**: > 90%
- **Statements**: > 95%
- **Branches**: > 85%
- **Functions**: > 95%
- **Lines**: > 95%

### Coverage Reports
After running `npm run test:coverage`, view reports in:
- Terminal: Summary table
- HTML: `coverage/lcov-report/index.html`
- LCOV: `coverage/lcov.info`

## Debugging Tests

### VS Code Debug Configuration
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Debug Specific Test
```bash
npx jest --runInBand --no-cache tests/path/to/test.test.ts
```

### Verbose Output
```bash
npm test -- --verbose
```

## Continuous Integration

The test suite is designed for CI environments:

- **Deterministic**: No random or time-dependent behavior
- **Fast**: Optimized for quick feedback
- **Isolated**: No external dependencies
- **Comprehensive**: High coverage of critical paths

### CI Configuration Example
```yaml
- name: Run Tests
  run: npm run test:ci
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

## Performance Testing

### Large Dataset Tests
Integration tests include scenarios with:
- 100+ tasks for performance validation
- Complex file structures for repository analysis
- Concurrent operations for race condition detection

### Performance Assertions
```typescript
it('should handle large datasets efficiently', async () => {
  const start = Date.now();
  await operationWithLargeDataset();
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(1000); // 1 second max
});
```

## Troubleshooting

### Common Issues

1. **Mock Import Errors**: Ensure mocks are defined before imports
2. **Async Test Timeouts**: Increase timeout or check for unresolved promises
3. **File Path Issues**: Use path.join() for cross-platform compatibility
4. **Type Errors**: Ensure test types match implementation types

### Mock Reset Issues
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetAllMocks(); // If needed
  jest.restoreAllMocks(); // If needed
});
```

### ESM Import Issues
```typescript
// Use .js extensions for imports in tests
import { module } from '../../src/module.js';
```

## Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add integration tests for new workflows
4. Update this README if adding new test patterns
5. Maintain or improve coverage percentage

### Test Review Checklist

- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Tests cover edge cases
- [ ] Mocks are properly isolated
- [ ] Test names are descriptive
- [ ] No hardcoded values
- [ ] Async operations properly awaited
- [ ] Coverage goals maintained

## Related Documentation

- [Main Project README](../README.md)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [TypeScript Jest Setup](https://jestjs.io/docs/getting-started#using-typescript) 