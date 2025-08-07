import * as fs from 'fs-extra';
import * as path from 'path';
import { jest, beforeEach, afterEach } from '@jest/globals';

// Mock external dependencies that require special handling
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn().mockImplementation(() => Promise.resolve())
  }))
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn(),
  exec: jest.fn()
}));

jest.mock('fs-extra', () => ({
  readJson: jest.fn(),
  writeJson: jest.fn(),
  existsSync: jest.fn(),
  ensureDirSync: jest.fn(),
  stat: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  pathExists: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn()
}));

jest.mock('glob', () => ({
  glob: jest.fn()
}));

// Mock process methods that tests shouldn't actually use
const originalExit = process.exit;
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;

beforeEach(() => {
  // Mock process.exit to prevent tests from actually exiting
  process.exit = jest.fn() as any;
  
  // Mock console output for cleaner test output
  process.stdout.write = jest.fn().mockReturnValue(true) as any;
  process.stderr.write = jest.fn().mockReturnValue(true) as any;
  
  // Mock console methods
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'clear').mockImplementation(() => {});
});

afterEach(() => {
  // Restore original functions
  process.exit = originalExit;
  process.stdout.write = originalStdout;
  process.stderr.write = originalStderr;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Test utilities
export const TestUtils = {
  /**
   * Create a temporary directory for testing
   */
  createTempDir: async (): Promise<string> => {
    const tempDir = path.join(__dirname, '..', 'temp', `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await fs.ensureDir(tempDir);
    return tempDir;
  },

  /**
   * Clean up temporary directory
   */
  cleanupTempDir: async (tempDir: string): Promise<void> => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  },

  /**
   * Create a mock MCP request
   */
  createMockMCPRequest: (toolName: string, args: any = {}) => ({
    params: {
      name: toolName,
      arguments: args
    }
  }),

  /**
   * Create a mock task
   */
  createMockTask: (overrides: any = {}) => ({
    schema: {
      id: `test-task-${Date.now()}`,
      title: 'Test Task',
      description: 'Test task description',
      category: 'BACKEND',
      priority: 2,
      createdAt: new Date().toISOString(),
      affectedFiles: [],
      ...overrides.schema
    },
    status: 'PENDING',
    humanApproved: false,
    metadata: {
      version: 1,
      createdBy: 'test',
      lastModified: new Date().toISOString(),
      ...overrides.metadata
    },
    ...overrides
  }),

  /**
   * Create a mock repository context
   */
  createMockRepoContext: (overrides: any = {}) => ({
    rootPath: '/test/repo',
    projectType: 'Node.js Project',
    currentBranch: 'main',
    modifiedFiles: [],
    hasGit: true,
    packageManager: 'npm',
    framework: 'React',
    language: 'TypeScript',
    ...overrides
  }),

  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock file system operations
   */
  mockFileSystem: () => {
    const mockFs = {
      existsSync: jest.fn(),
      readFileSync: jest.fn(),
      writeFileSync: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      readJson: jest.fn(),
      writeJson: jest.fn(),
      ensureDirSync: jest.fn(),
      remove: jest.fn(),
      pathExists: jest.fn(),
      stat: jest.fn(),
      readdir: jest.fn(),
      mkdir: jest.fn()
    };

    jest.doMock('fs-extra', () => mockFs);
    jest.doMock('fs', () => mockFs);

    return mockFs;
  }
};

// Global test environment setup
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  clear: jest.fn()
}; 