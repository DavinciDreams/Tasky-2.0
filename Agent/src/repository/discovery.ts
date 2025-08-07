import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve, basename } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { Result, Success, Failure } from '../core/functional';

export interface RepositoryInfo {
  path: string;
  name: string;
  type: 'git' | 'unknown';
  lastModified: Date;
  size: number;
  branch?: string;
  remoteUrl?: string;
  hasUncommittedChanges?: boolean;
}

export class RepositoryDiscovery {
  private static readonly COMMON_REPO_LOCATIONS = [
    join(homedir(), 'Documents'),
    join(homedir(), 'Projects'),
    join(homedir(), 'repos'),
    join(homedir(), 'repositories'),
    join(homedir(), 'dev'),
    join(homedir(), 'Development'),
    join(homedir(), 'workspace'),
    join(homedir(), 'code'),
    join(homedir(), 'src'),
    join(homedir(), 'github'),
    join(homedir(), 'gitlab'),
    join(homedir(), 'Desktop'),
    'C:\\Projects',
    'C:\\Dev',
    'C:\\Code',
    'D:\\Projects',
    'D:\\Dev',
    'D:\\Code'
  ];

  private static readonly IGNORE_DIRS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    'bin',
    'obj',
    '.vs',
    '.idea',
    '__pycache__',
    '.pytest_cache',
    'venv',
    'env',
    '.env'
  ];

  /**
   * Discover repositories in common locations
   */
  static async discoverRepositories(customPaths?: string[]): Promise<RepositoryInfo[]> {
    const searchPaths = [...this.COMMON_REPO_LOCATIONS];
    if (customPaths) {
      searchPaths.push(...customPaths);
    }

    const repositories: RepositoryInfo[] = [];
    const visited = new Set<string>();

    for (const searchPath of searchPaths) {
      if (existsSync(searchPath)) {
        const found = await this.scanDirectory(searchPath, visited, 0, 3);
        repositories.push(...found);
      }
    }

    // Sort by last modified date (most recent first)
    repositories.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    // Remove duplicates based on path
    const uniqueRepos = new Map<string, RepositoryInfo>();
    for (const repo of repositories) {
      const normalizedPath = resolve(repo.path).toLowerCase();
      if (!uniqueRepos.has(normalizedPath)) {
        uniqueRepos.set(normalizedPath, repo);
      }
    }

    return Array.from(uniqueRepos.values());
  }

  /**
   * Scan a directory recursively for repositories
   */
  private static async scanDirectory(
    dir: string,
    visited: Set<string>,
    depth: number,
    maxDepth: number
  ): Promise<RepositoryInfo[]> {
    const normalizedDir = resolve(dir).toLowerCase();

    if (visited.has(normalizedDir) || depth > maxDepth) {
      return [];
    }

    visited.add(normalizedDir);

    const repositories: RepositoryInfo[] = [];

    try {
      // Check if current directory is a repository
      if (this.isRepository(dir)) {
        const repoInfo = await this.getRepositoryInfo(dir);
        if (repoInfo) {
          repositories.push(repoInfo);
          return repositories; // Don't scan inside repositories
        }
      }

      // Scan subdirectories
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);

        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory() && !this.IGNORE_DIRS.includes(entry)) {
            const subRepos = await this.scanDirectory(fullPath, visited, depth + 1, maxDepth);
            repositories.push(...subRepos);
          }
        } catch {
          // Ignore permission errors
        }
      }
    } catch {
      // Ignore permission errors
    }

    return repositories;
  }

  /**
   * Check if a directory is a repository
   */
  private static isRepository(dir: string): boolean {
    return (
      existsSync(join(dir, '.git')) ||
      existsSync(join(dir, 'package.json')) ||
      existsSync(join(dir, 'requirements.txt')) ||
      existsSync(join(dir, 'pom.xml')) ||
      existsSync(join(dir, 'Cargo.toml')) ||
      existsSync(join(dir, 'go.mod'))
    );
  }

  /**
   * Get detailed information about a repository
   */
  private static async getRepositoryInfo(dir: string): Promise<RepositoryInfo | null> {
    try {
      const stat = statSync(dir);
      const info: RepositoryInfo = {
        path: dir,
        name: basename(dir),
        type: existsSync(join(dir, '.git')) ? 'git' : 'unknown',
        lastModified: stat.mtime,
        size: 0 // Would need recursive calculation
      };

      // Get Git information if available
      if (info.type === 'git') {
        try {
          info.branch = execSync('git branch --show-current', {
            cwd: dir,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
          }).trim();

          info.remoteUrl = execSync('git config --get remote.origin.url', {
            cwd: dir,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
          }).trim();

          const status = execSync('git status --porcelain', {
            cwd: dir,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore']
          });

          info.hasUncommittedChanges = status.trim().length > 0;
        } catch {
          // Git commands failed, but directory is still valid
        }
      }

      return info;
    } catch {
      return null;
    }
  }

  /**
   * Get recent Git repositories from global Git config
   */
  static async getRecentGitRepositories(): Promise<RepositoryInfo[]> {
    const repositories: RepositoryInfo[] = [];

    try {
      // Try to get recent repositories from Git
      const gitConfigPath = join(homedir(), '.gitconfig');
      if (existsSync(gitConfigPath)) {
        // This is a simplified approach - in reality, we'd parse git config properly
        // const recentRepos = new Set<string>(); // Reserved for future use

        // Get repositories from git global config (if any recent-repo extension is installed)
        // For now, we'll just return empty array
        return repositories;
      }
    } catch {
      // Ignore errors
    }

    return repositories;
  }

  /**
   * Search for repositories by name
   */
  static async searchRepositories(
    query: string,
    searchPaths?: string[]
  ): Promise<RepositoryInfo[]> {
    const allRepos = await this.discoverRepositories(searchPaths);
    const queryLower = query.toLowerCase();

    return allRepos.filter(
      repo =>
        repo.name.toLowerCase().includes(queryLower) || repo.path.toLowerCase().includes(queryLower)
    );
  }

  /**
   * Get repository from current working directory or path
   */
  static async getCurrentRepository(path?: string): Promise<Result<RepositoryInfo, string>> {
    const targetPath = path || process.cwd();

    // Walk up the directory tree to find a repository root
    let currentPath = resolve(targetPath);
    const root = parse(currentPath).root;

    while (currentPath !== root) {
      if (this.isRepository(currentPath)) {
        const info = await this.getRepositoryInfo(currentPath);
        if (info) {
          return new Success(info);
        }
      }

      const parent = resolve(currentPath, '..');
      if (parent === currentPath) break;
      currentPath = parent;
    }

    return new Failure(`No repository found at or above: ${targetPath}`);
  }
}

// Helper function for Windows path parsing
function parse(path: string): { root: string } {
  const match = path.match(/^([a-zA-Z]:[\\/])/);
  return { root: match ? match[1] : '/' };
}
