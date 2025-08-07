import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { RepoContext, ProjectType } from '../core/types';
import { Result, Success, Failure } from '../core/functional';

export class RepositoryAnalyzer {
  static async analyze(path: string): Promise<Result<RepoContext, string>> {
    try {
      const projectType = this.detectProjectType(path);
      const gitInfo = await this.getGitInfo(path);

      return new Success({
        rootPath: path,
        projectType,
        currentBranch: gitInfo.branch,
        modifiedFiles: gitInfo.modifiedFiles,
        recentCommits: gitInfo.recentCommits
      });
    } catch (error) {
      return new Failure(`Repository analysis failed: ${error}`);
    }
  }

  private static detectProjectType(path: string): ProjectType {
    if (existsSync(join(path, 'package.json'))) {
      // Check if it's a React project
      try {
        const packageJson = require(join(path, 'package.json'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        if (deps['react'] || deps['react-dom'] || deps['next'] || deps['gatsby']) {
          return ProjectType.NODE_REACT;
        }
      } catch {
        // If we can't read package.json, assume generic Node project
      }
      return ProjectType.NODE_REACT;
    }

    if (
      existsSync(join(path, 'requirements.txt')) ||
      existsSync(join(path, 'setup.py')) ||
      existsSync(join(path, 'pyproject.toml'))
    ) {
      return ProjectType.PYTHON;
    }

    if (
      existsSync(join(path, 'pom.xml')) ||
      existsSync(join(path, 'build.gradle')) ||
      existsSync(join(path, 'build.gradle.kts'))
    ) {
      return ProjectType.JAVA;
    }

    if (existsSync(join(path, 'Cargo.toml'))) {
      return ProjectType.RUST;
    }

    return ProjectType.UNKNOWN;
  }

  private static async getGitInfo(path: string): Promise<{
    branch: string;
    modifiedFiles: string[];
    recentCommits: string[];
  }> {
    try {
      // Check if it's a git repository
      execSync('git rev-parse --git-dir', { cwd: path, encoding: 'utf-8' });

      const branch = execSync('git branch --show-current', {
        cwd: path,
        encoding: 'utf-8'
      }).trim();

      const modifiedFiles = execSync('git status --porcelain', {
        cwd: path,
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')
        .filter(line => line)
        .map(line => line.slice(3));

      const recentCommits = execSync('git log --oneline -5', {
        cwd: path,
        encoding: 'utf-8'
      })
        .trim()
        .split('\n')
        .filter(line => line);

      return { branch, modifiedFiles, recentCommits };
    } catch {
      // Not a git repository or git not available
      return {
        branch: 'unknown',
        modifiedFiles: [],
        recentCommits: []
      };
    }
  }

  static async getFileStats(_path: string): Promise<{
    totalFiles: number;
    filesByExtension: Record<string, number>;
    largestFiles: Array<{ path: string; size: number }>;
  }> {
    // This would implement file statistics gathering
    // For now, return mock data
    return {
      totalFiles: 0,
      filesByExtension: {},
      largestFiles: []
    };
  }

  static suggestRelevantFiles(repoContext: RepoContext, _keywords: string[]): string[] {
    // Simple implementation - in real version would use more sophisticated matching
    const suggestions: string[] = [];

    // Add modified files as they're likely relevant
    suggestions.push(...repoContext.modifiedFiles);

    // Add common files based on project type
    switch (repoContext.projectType) {
      case ProjectType.NODE_REACT:
        suggestions.push('src/App.tsx', 'src/index.tsx', 'package.json');
        break;
      case ProjectType.PYTHON:
        suggestions.push('main.py', 'app.py', 'requirements.txt');
        break;
      case ProjectType.JAVA:
        suggestions.push('src/main/java/Main.java', 'pom.xml');
        break;
      case ProjectType.RUST:
        suggestions.push('src/main.rs', 'Cargo.toml');
        break;
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }
}
