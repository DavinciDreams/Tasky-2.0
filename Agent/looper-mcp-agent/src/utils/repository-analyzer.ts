import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { RepoContext, ToolResult } from '../types/index.js';

export interface AnalyzerOptions {
  customPaths?: {
    configPath?: string;
    srcPath?: string;
    distPath?: string;
    testPath?: string;
  };
  ignorePatterns?: string[];
  maxDepth?: number;
  includeHiddenFiles?: boolean;
}

export class RepositoryAnalyzer {
  private static defaultOptions: AnalyzerOptions = {
    customPaths: {},
    ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
    maxDepth: 3,
    includeHiddenFiles: false
  };

  /**
   * Set custom paths for analysis
   */
  static setCustomPaths(repositoryPath: string, customPaths: AnalyzerOptions['customPaths']): AnalyzerOptions {
    return {
      ...this.defaultOptions,
      customPaths: {
        configPath: customPaths?.configPath ? path.resolve(repositoryPath, customPaths.configPath) : undefined,
        srcPath: customPaths?.srcPath ? path.resolve(repositoryPath, customPaths.srcPath) : undefined,
        distPath: customPaths?.distPath ? path.resolve(repositoryPath, customPaths.distPath) : undefined,
        testPath: customPaths?.testPath ? path.resolve(repositoryPath, customPaths.testPath) : undefined,
      }
    };
  }
  /**
   * Analyze a repository and return context information
   */
  static async analyze(
    repositoryPath: string, 
    options: AnalyzerOptions = this.defaultOptions
  ): Promise<ToolResult<RepoContext>> {
    try {
      const absolutePath = path.resolve(repositoryPath);
      
      if (!(await fs.pathExists(absolutePath))) {
        return { success: false, error: 'Repository path does not exist' };
      }

      // Merge options with defaults
      const mergedOptions = { ...this.defaultOptions, ...options };

      const repoContext: RepoContext = {
        rootPath: absolutePath,
        projectType: await this.detectProjectType(absolutePath, mergedOptions),
        currentBranch: await this.getCurrentBranch(absolutePath, mergedOptions),
        modifiedFiles: await this.getModifiedFiles(absolutePath, mergedOptions),
        hasGit: await this.hasGitRepository(absolutePath),
        packageManager: await this.detectPackageManager(absolutePath, mergedOptions),
        framework: await this.detectFramework(absolutePath, mergedOptions),
        language: await this.detectPrimaryLanguage(absolutePath, mergedOptions)
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
  private static async detectProjectType(repoPath: string, options: AnalyzerOptions): Promise<string> {
    // Check custom config path first if specified
    const configPath = options.customPaths?.configPath || repoPath;
    const files = await fs.readdir(configPath);
    
    if (files.includes('package.json')) {
      const packageJsonPath = path.join(configPath, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);
      
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
  private static async getCurrentBranch(repoPath: string, options: AnalyzerOptions): Promise<string> {
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
  private static async getModifiedFiles(repoPath: string, options: AnalyzerOptions): Promise<string[]> {
    try {
      if (await this.hasGitRepository(repoPath)) {
        // For now, return empty array. In a real implementation,
        // you might want to execute git commands to get modified files
        // Could potentially use custom paths to check specific directories
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
  private static async detectPackageManager(repoPath: string, options: AnalyzerOptions): Promise<string | undefined> {
    const configPath = options.customPaths?.configPath || repoPath;
    const files = await fs.readdir(configPath);
    
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
  private static async detectFramework(repoPath: string, options: AnalyzerOptions): Promise<string | undefined> {
    try {
      const configPath = options.customPaths?.configPath || repoPath;
      
      if (await fs.pathExists(path.join(configPath, 'package.json'))) {
        const packageJson = await fs.readJson(path.join(configPath, 'package.json'));
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
      
      if (await fs.pathExists(path.join(configPath, 'requirements.txt'))) {
        const requirements = await fs.readFile(path.join(configPath, 'requirements.txt'), 'utf-8');
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
  private static async detectPrimaryLanguage(repoPath: string, options: AnalyzerOptions): Promise<string | undefined> {
    try {
      // Use custom source path if specified, otherwise use repo path
      const analysisPath = options.customPaths?.srcPath || repoPath;
      
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
      
      // Combine default ignore patterns with custom ones
      const ignorePatterns = [
        ...options.ignorePatterns || [],
        ...(options.customPaths?.distPath ? [`${options.customPaths.distPath}/**`] : [])
      ];
      
      for (const pattern of patterns) {
        const files = await glob(pattern, {
          cwd: analysisPath,
          ignore: ignorePatterns
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
  static async getProjectStructure(
    repoPath: string, 
    maxDepth: number = 3,
    options: AnalyzerOptions = this.defaultOptions
  ): Promise<ToolResult<string[]>> {
    try {
      const structure: string[] = [];
      const mergedOptions = { ...this.defaultOptions, ...options };
      
      async function traverseDirectory(dirPath: string, currentDepth: number, prefix: string = '') {
        if (currentDepth > (mergedOptions.maxDepth || maxDepth)) return;
        
        const items = await fs.readdir(dirPath);
        const filteredItems = items.filter(item => {
          // Filter based on options
          if (!mergedOptions.includeHiddenFiles && item.startsWith('.')) return false;
          
          // Check against ignore patterns
          const relativePath = path.relative(repoPath, path.join(dirPath, item));
          return !mergedOptions.ignorePatterns?.some(pattern => 
            relativePath.includes(pattern.replace('**/', '').replace('/**', ''))
          );
        });
        
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
  static async findImportantFiles(
    repoPath: string,
    options: AnalyzerOptions = this.defaultOptions
  ): Promise<ToolResult<string[]>> {
    try {
      const mergedOptions = { ...this.defaultOptions, ...options };
      const configPath = mergedOptions.customPaths?.configPath || repoPath;
      
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
        const filePath = path.join(configPath, file);
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

  /**
   * Analyze specific path within repository
   */
  static async analyzeSpecificPath(
    repositoryPath: string,
    targetPath: string,
    options: AnalyzerOptions = this.defaultOptions
  ): Promise<ToolResult<RepoContext>> {
    try {
      const absoluteRepoPath = path.resolve(repositoryPath);
      const absoluteTargetPath = path.resolve(repositoryPath, targetPath);
      
      // Verify the target path exists and is within the repository
      if (!(await fs.pathExists(absoluteTargetPath))) {
        return { success: false, error: `Target path does not exist: ${targetPath}` };
      }
      
      if (!absoluteTargetPath.startsWith(absoluteRepoPath)) {
        return { success: false, error: 'Target path is outside repository boundaries' };
      }

      // Create options that point to the specific path
      const pathOptions: AnalyzerOptions = {
        ...options,
        customPaths: {
          ...options.customPaths,
          srcPath: absoluteTargetPath
        }
      };

      return await this.analyze(repositoryPath, pathOptions);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze specific path'
      };
    }
  }

  /**
   * Quick analysis for common project structures
   */
  static async quickAnalyze(repositoryPath: string): Promise<ToolResult<RepoContext>> {
    try {
      const absolutePath = path.resolve(repositoryPath);
      
      // Detect common project structure and set appropriate paths
      const srcOptions: AnalyzerOptions = {
        customPaths: {},
        ignorePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**', '**/coverage/**'],
        maxDepth: 4,
        includeHiddenFiles: false
      };

      // Try to detect common source directories
      const commonSrcDirs = ['src', 'lib', 'app', 'source'];
      for (const srcDir of commonSrcDirs) {
        const srcPath = path.join(absolutePath, srcDir);
        if (await fs.pathExists(srcPath)) {
          srcOptions.customPaths!.srcPath = srcPath;
          break;
        }
      }

      // Try to detect common dist directories
      const commonDistDirs = ['dist', 'build', 'out', '.next'];
      for (const distDir of commonDistDirs) {
        const distPath = path.join(absolutePath, distDir);
        if (await fs.pathExists(distPath)) {
          srcOptions.customPaths!.distPath = distPath;
          break;
        }
      }

      return await this.analyze(repositoryPath, srcOptions);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform quick analysis'
      };
    }
  }

  /**
   * Validate and normalize custom paths
   */
  static validatePaths(repositoryPath: string, customPaths: AnalyzerOptions['customPaths']): ToolResult<AnalyzerOptions['customPaths']> {
    try {
      const absoluteRepoPath = path.resolve(repositoryPath);
      const validatedPaths: AnalyzerOptions['customPaths'] = {};

      if (customPaths?.configPath) {
        const configPath = path.resolve(repositoryPath, customPaths.configPath);
        if (!configPath.startsWith(absoluteRepoPath)) {
          return { success: false, error: 'Config path is outside repository boundaries' };
        }
        validatedPaths.configPath = configPath;
      }

      if (customPaths?.srcPath) {
        const srcPath = path.resolve(repositoryPath, customPaths.srcPath);
        if (!srcPath.startsWith(absoluteRepoPath)) {
          return { success: false, error: 'Source path is outside repository boundaries' };
        }
        validatedPaths.srcPath = srcPath;
      }

      if (customPaths?.distPath) {
        const distPath = path.resolve(repositoryPath, customPaths.distPath);
        if (!distPath.startsWith(absoluteRepoPath)) {
          return { success: false, error: 'Dist path is outside repository boundaries' };
        }
        validatedPaths.distPath = distPath;
      }

      if (customPaths?.testPath) {
        const testPath = path.resolve(repositoryPath, customPaths.testPath);
        if (!testPath.startsWith(absoluteRepoPath)) {
          return { success: false, error: 'Test path is outside repository boundaries' };
        }
        validatedPaths.testPath = testPath;
      }

      return { success: true, data: validatedPaths };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate paths'
      };
    }
  }
} 