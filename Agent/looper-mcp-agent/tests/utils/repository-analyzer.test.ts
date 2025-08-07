import { RepositoryAnalyzer } from '../../src/utils/repository-analyzer';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('glob');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockGlob = glob as jest.MockedFunction<typeof glob>;

describe('RepositoryAnalyzer', () => {
  const testRepoPath = '/test/repo';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    it('should analyze a Node.js repository successfully', async () => {
      // Setup mocks for Node.js project
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json', 'src', 'README.md']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({
        name: 'test-project',
        dependencies: { react: '^18.0.0' }
      });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        const repoContext = result.data!;
        expect(repoContext.rootPath).toBe(path.resolve(testRepoPath));
        expect(repoContext.projectType).toBe('React Application');
        expect(repoContext.currentBranch).toBe('main');
        expect(repoContext.hasGit).toBe(true);
      }
    });

    it('should handle repository path that does not exist', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(false);

      const result = await RepositoryAnalyzer.analyze('/non/existent/path');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Repository path does not exist');
    });

    it('should detect Python project type', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['requirements.txt', 'main.py', 'README.md']);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/develop');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.projectType).toBe('Python Project');
        expect(result.data!.currentBranch).toBe('develop');
      }
    });

    it('should detect Rust project type', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['Cargo.toml', 'src', 'README.md']);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/master');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.projectType).toBe('Rust Project');
      }
    });

    it('should detect Go project type', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['go.mod', 'main.go', 'README.md']);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.projectType).toBe('Go Project');
      }
    });

    it('should detect Java project type', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['pom.xml', 'src', 'README.md']);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.projectType).toBe('Java Project');
      }
    });

    it('should detect unknown project type', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['README.md', 'some-file.txt']);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.projectType).toBe('Unknown Project Type');
      }
    });

    it('should handle analysis errors gracefully', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockRejectedValue(new Error('File system error'));

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File system error');
    });
  });

  describe('getProjectStructure', () => {
    it('should return project structure successfully', async () => {
      // Mock directory traversal
      (mockFs.readdir as jest.MockedFunction<any>)
        .mockResolvedValueOnce(['src', 'package.json', 'README.md'])
        .mockResolvedValueOnce(['components', 'utils', 'index.ts'])
        .mockResolvedValueOnce(['Button.tsx', 'Modal.tsx'])
        .mockResolvedValueOnce(['helpers.ts']);

      (mockFs.stat as jest.MockedFunction<any>).mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        return Promise.resolve({
          isDirectory: () => pathStr.includes('src') || pathStr.includes('components') || pathStr.includes('utils')
        });
      });

      const result = await RepositoryAnalyzer.getProjectStructure(testRepoPath, 2);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!).toBeInstanceOf(Array);
        expect(result.data!.length).toBeGreaterThan(0);
      }
    });

    it('should handle structure analysis errors', async () => {
      (mockFs.readdir as jest.MockedFunction<any>).mockRejectedValue(new Error('Permission denied'));

      const result = await RepositoryAnalyzer.getProjectStructure(testRepoPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('findImportantFiles', () => {
    it('should find important files in repository', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        return Promise.resolve(
          pathStr.includes('package.json') || 
          pathStr.includes('README.md') || 
          pathStr.includes('tsconfig.json')
        );
      });

      const result = await RepositoryAnalyzer.findImportantFiles(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!).toContain('package.json');
        expect(result.data!).toContain('README.md');
        expect(result.data!).toContain('tsconfig.json');
      }
    });

    it('should handle no important files found', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(false);

      const result = await RepositoryAnalyzer.findImportantFiles(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!).toEqual([]);
      }
    });

    it('should handle file discovery errors', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockRejectedValue(new Error('Access denied'));

      const result = await RepositoryAnalyzer.findImportantFiles(testRepoPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });

  describe('Framework Detection', () => {
    it('should detect React framework', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({
        dependencies: { react: '^18.0.0' }
      });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.framework).toBe('React');
      }
    });

    it('should detect Vue framework', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({
        dependencies: { vue: '^3.0.0' }
      });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.framework).toBe('Vue');
      }
    });

    it('should detect Next.js framework', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({
        dependencies: { next: '^13.0.0' }
      });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.framework).toBe('Next.js');
      }
    });
  });

  describe('Package Manager Detection', () => {
    it('should detect npm package manager', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json', 'package-lock.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.packageManager).toBe('npm');
      }
    });

    it('should detect yarn package manager', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json', 'yarn.lock']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.packageManager).toBe('yarn');
      }
    });

    it('should detect pnpm package manager', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json', 'pnpm-lock.yaml']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.packageManager).toBe('pnpm');
      }
    });
  });

  describe('Language Detection', () => {
    it('should detect TypeScript as primary language', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');
      
      mockGlob.mockImplementation((pattern: string | string[]) => {
        const patternStr = Array.isArray(pattern) ? pattern[0] : pattern;
        if (patternStr.includes('*.ts')) {
          return Promise.resolve(['src/index.ts', 'src/utils.ts', 'src/types.ts']);
        }
        if (patternStr.includes('*.js')) {
          return Promise.resolve(['config.js']);
        }
        return Promise.resolve([]);
      });

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.language).toBe('TypeScript');
      }
    });

    it('should detect JavaScript as primary language', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');
      
      mockGlob.mockImplementation((pattern: string | string[]) => {
        const patternStr = Array.isArray(pattern) ? pattern[0] : pattern;
        if (patternStr.includes('*.js')) {
          return Promise.resolve(['src/index.js', 'src/utils.js', 'src/app.js']);
        }
        return Promise.resolve([]);
      });

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.language).toBe('JavaScript');
      }
    });

    it('should detect Python as primary language', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockResolvedValue(true);
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['requirements.txt']);
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/main');
      
      mockGlob.mockImplementation((pattern: string | string[]) => {
        const patternStr = Array.isArray(pattern) ? pattern[0] : pattern;
        if (patternStr.includes('*.py')) {
          return Promise.resolve(['main.py', 'utils.py', 'models.py']);
        }
        return Promise.resolve([]);
      });

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.language).toBe('Python');
      }
    });
  });

  describe('Git Information', () => {
    it('should detect Git repository and current branch', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        return Promise.resolve(pathStr.includes('.git') || pathStr.includes(testRepoPath));
      });
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json', '.git']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });
      (mockFs.readFile as jest.MockedFunction<any>).mockResolvedValue('ref: refs/heads/feature/new-feature');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.hasGit).toBe(true);
        expect(result.data!.currentBranch).toBe('feature/new-feature');
      }
    });

    it('should handle non-Git repository', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        return Promise.resolve(!pathStr.includes('.git') && pathStr.includes(testRepoPath));
      });
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.hasGit).toBe(false);
        expect(result.data!.currentBranch).toBe('unknown');
      }
    });

    it('should handle Git branch detection errors', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockImplementation((filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('.git')) {
          return Promise.resolve(true);
        }
        return Promise.resolve(pathStr.includes(testRepoPath));
      });
      (mockFs.readdir as jest.MockedFunction<any>).mockResolvedValue(['package.json']);
      (mockFs.readJson as jest.MockedFunction<any>).mockResolvedValue({ name: 'test-project' });
      (mockFs.readFile as jest.MockedFunction<any>).mockRejectedValue(new Error('Permission denied'));

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data!.hasGit).toBe(true);
        expect(result.data!.currentBranch).toBe('unknown');
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockRejectedValue(new Error('File system error'));

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('File system error');
    });

    it('should handle unknown errors gracefully', async () => {
      (mockFs.pathExists as jest.MockedFunction<any>).mockRejectedValue('Unknown error');

      const result = await RepositoryAnalyzer.analyze(testRepoPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to analyze repository');
    });
  });
}); 
