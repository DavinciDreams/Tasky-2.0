import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { RepoContext, ToolResult } from '../types/index.js';

export class RepositoryAnalyzer {
  /**
   * Analyze a repository and return context information
   */
  static async analyze(repositoryPath: string): Promise<ToolResult<RepoContext>> {
    try {
      const absolutePath = path.resolve(repositoryPath);
      
      if (!(await fs.pathExists(absolutePath))) {
        return { success: false, error: 'Repository path does not exist' };
      }

      const repoContext: RepoContext = {
        rootPath: absolutePath,
        projectType: await this.detectProjectType(absolutePath),
        currentBranch: await this.getCurrentBranch(absolutePath),
        modifiedFiles: await this.getModifiedFiles(absolutePath),
        hasGit: await this.hasGitRepository(absolutePath),
        packageManager: await this.detectPackageManager(absolutePath),
        framework: await this.detectFramework(absolutePath),
        language: await this.detectPrimaryLanguage(absolutePath)
      };

      return { success: true, data: repoContext };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze repository'
      };
    }
  }

  /**
   * Detect the project type based on files and structure
   */
  private static async detectProjectType(repoPath: string): Promise<string> {
    const files = await fs.readdir(repoPath);
    
    if (files.includes('package.json')) {
      const packageJson = await fs.readJson(path.join(repoPath, 'package.json'));
      
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        return 'React Application';
      }
      if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
        return 'Vue Application';
      }
      if (packageJson.dependencies?.angular || packageJson.devDependencies?.angular) {
        return 'Angular Application';
      }
      if (packageJson.dependencies?.next || packageJson.devDependencies?.next) {
        return 'Next.js Application';
      }
      if (packageJson.dependencies?.nuxt || packageJson.devDependencies?.nuxt) {
        return 'Nuxt.js Application';
      }
      if (packageJson.dependencies?.express || packageJson.devDependencies?.express) {
        return 'Express.js Application';
      }
      if (packageJson.dependencies?.fastify || packageJson.devDependencies?.fastify) {
        return 'Fastify Application';
      }
      return 'Node.js Project';
    }
    
    if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('setup.py')) {
      return 'Python Project';
    }
    
    if (files.includes('Cargo.toml')) {
      return 'Rust Project';
    }
    
    if (files.includes('go.mod')) {
      return 'Go Project';
    }
    
    if (files.includes('pom.xml') || files.includes('build.gradle')) {
      return 'Java Project';
    }
    
    if (files.includes('Gemfile')) {
      return 'Ruby Project';
    }
    
    if (files.includes('composer.json')) {
      return 'PHP Project';
    }
    
    if (files.includes('pubspec.yaml')) {
      return 'Dart/Flutter Project';
    }
    
    return 'Unknown Project Type';
  }

  /**
   * Get the current Git branch
   */
  private static async getCurrentBranch(repoPath: string): Promise<string> {
    try {
      const gitHeadPath = path.join(repoPath, '.git', 'HEAD');
      if (await fs.pathExists(gitHeadPath)) {
        const headContent = await fs.readFile(gitHeadPath, 'utf-8');
        const match = headContent.match(/ref: refs\/heads\/(.+)/);
        return match ? match[1].trim() : 'unknown';
      }
    } catch {
      // Ignore errors
    }
    return 'unknown';
  }

  /**
   * Get list of modified files (if Git repository)
   */
  private static async getModifiedFiles(repoPath: string): Promise<string[]> {
    try {
      if (await this.hasGitRepository(repoPath)) {
        // For now, return empty array. In a real implementation,
        // you might want to execute git commands to get modified files
        return [];
      }
    } catch {
      // Ignore errors
    }
    return [];
  }

  /**
   * Check if the repository has Git
   */
  private static async hasGitRepository(repoPath: string): Promise<boolean> {
    try {
      return await fs.pathExists(path.join(repoPath, '.git'));
    } catch {
      return false;
    }
  }

  /**
   * Detect the package manager being used
   */
  private static async detectPackageManager(repoPath: string): Promise<string | undefined> {
    const files = await fs.readdir(repoPath);
    
    if (files.includes('yarn.lock')) {
      return 'yarn';
    }
    if (files.includes('pnpm-lock.yaml')) {
      return 'pnpm';
    }
    if (files.includes('package-lock.json')) {
      return 'npm';
    }
    if (files.includes('bun.lockb')) {
      return 'bun';
    }
    
    return undefined;
  }

  /**
   * Detect the framework being used
   */
  private static async detectFramework(repoPath: string): Promise<string | undefined> {
    try {
      if (await fs.pathExists(path.join(repoPath, 'package.json'))) {
        const packageJson = await fs.readJson(path.join(repoPath, 'package.json'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        if (deps.react) return 'React';
        if (deps.vue) return 'Vue';
        if (deps.angular) return 'Angular';
        if (deps.next) return 'Next.js';
        if (deps.nuxt) return 'Nuxt.js';
        if (deps.svelte) return 'Svelte';
        if (deps.express) return 'Express.js';
        if (deps.fastify) return 'Fastify';
        if (deps.koa) return 'Koa';
        if (deps.nestjs) return 'NestJS';
      }
      
      if (await fs.pathExists(path.join(repoPath, 'requirements.txt'))) {
        const requirements = await fs.readFile(path.join(repoPath, 'requirements.txt'), 'utf-8');
        if (requirements.includes('django')) return 'Django';
        if (requirements.includes('flask')) return 'Flask';
        if (requirements.includes('fastapi')) return 'FastAPI';
      }
    } catch {
      // Ignore errors
    }
    
    return undefined;
  }

  /**
   * Detect the primary programming language
   */
  private static async detectPrimaryLanguage(repoPath: string): Promise<string | undefined> {
    try {
      const patterns = [
        '**/*.ts',
        '**/*.js',
        '**/*.tsx',
        '**/*.jsx',
        '**/*.py',
        '**/*.rs',
        '**/*.go',
        '**/*.java',
        '**/*.rb',
        '**/*.php',
        '**/*.dart',
        '**/*.cpp',
        '**/*.c',
        '**/*.cs'
      ];
      
      const languageExtensions: Record<string, string> = {
        '.ts': 'TypeScript',
        '.tsx': 'TypeScript',
        '.js': 'JavaScript',
        '.jsx': 'JavaScript',
        '.py': 'Python',
        '.rs': 'Rust',
        '.go': 'Go',
        '.java': 'Java',
        '.rb': 'Ruby',
        '.php': 'PHP',
        '.dart': 'Dart',
        '.cpp': 'C++',
        '.c': 'C',
        '.cs': 'C#'
      };
      
      const languageCounts: Record<string, number> = {};
      
      for (const pattern of patterns) {
        const files = await glob(pattern, {
          cwd: repoPath,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
        });
        
        for (const file of files) {
          const ext = path.extname(file);
          const language = languageExtensions[ext];
          if (language) {
            languageCounts[language] = (languageCounts[language] || 0) + 1;
          }
        }
      }
      
      // Return the language with the most files
      let maxCount = 0;
      let primaryLanguage: string | undefined;
      
      for (const [language, count] of Object.entries(languageCounts)) {
        if (count > maxCount) {
          maxCount = count;
          primaryLanguage = language;
        }
      }
      
      return primaryLanguage;
    } catch {
      return undefined;
    }
  }

  /**
   * Get project structure summary
   */
  static async getProjectStructure(repoPath: string, maxDepth: number = 3): Promise<ToolResult<string[]>> {
    try {
      const structure: string[] = [];
      
      async function traverseDirectory(dirPath: string, currentDepth: number, prefix: string = '') {
        if (currentDepth > maxDepth) return;
        
        const items = await fs.readdir(dirPath);
        const filteredItems = items.filter(item => 
          !item.startsWith('.') && 
          item !== 'node_modules' && 
          item !== 'dist' && 
          item !== 'build'
        );
        
        for (let i = 0; i < filteredItems.length; i++) {
          const item = filteredItems[i];
          const itemPath = path.join(dirPath, item);
          const isLast = i === filteredItems.length - 1;
          const currentPrefix = prefix + (isLast ? '└── ' : '├── ');
          const nextPrefix = prefix + (isLast ? '    ' : '│   ');
          
          const stat = await fs.stat(itemPath);
          if (stat.isDirectory()) {
            structure.push(currentPrefix + item + '/');
            await traverseDirectory(itemPath, currentDepth + 1, nextPrefix);
          } else {
            structure.push(currentPrefix + item);
          }
        }
      }
      
      await traverseDirectory(repoPath, 0);
      return { success: true, data: structure };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project structure'
      };
    }
  }

  /**
   * Find important files in the repository
   */
  static async findImportantFiles(repoPath: string): Promise<ToolResult<string[]>> {
    try {
      const importantFiles = [
        'README.md',
        'package.json',
        'tsconfig.json',
        'webpack.config.js',
        'vite.config.js',
        'next.config.js',
        'nuxt.config.js',
        'vue.config.js',
        'angular.json',
        'Dockerfile',
        'docker-compose.yml',
        '.env',
        '.env.example',
        'requirements.txt',
        'pyproject.toml',
        'Cargo.toml',
        'go.mod',
        'pom.xml',
        'build.gradle',
        'Gemfile',
        'composer.json'
      ];
      
      const foundFiles: string[] = [];
      
      for (const file of importantFiles) {
        const filePath = path.join(repoPath, file);
        if (await fs.pathExists(filePath)) {
          foundFiles.push(file);
        }
      }
      
      return { success: true, data: foundFiles };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find important files'
      };
    }
  }
} 