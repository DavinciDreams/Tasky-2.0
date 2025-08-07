import { RepositoryAnalyzer, AnalyzerOptions } from './repository-analyzer.js';

/**
 * Example usage of the enhanced RepositoryAnalyzer with custom path specification
 */
export class RepositoryAnalyzerExample {
  /**
   * Example 1: Basic usage with default settings
   */
  static async basicAnalysis() {
    console.log('=== Basic Repository Analysis ===');
    
    const result = await RepositoryAnalyzer.analyze('./');
    
    if (result.success) {
      console.log('Project Type:', result.data?.projectType);
      console.log('Framework:', result.data?.framework);
      console.log('Language:', result.data?.language);
      console.log('Package Manager:', result.data?.packageManager);
    } else {
      console.error('Analysis failed:', result.error);
    }
  }

  /**
   * Example 2: Analysis with custom paths
   */
  static async customPathAnalysis() {
    console.log('\n=== Custom Path Analysis ===');
    
    const customOptions: AnalyzerOptions = {
      customPaths: {
        configPath: './',           // Look for config files in root
        srcPath: 'src/',           // Analyze source files in src/
        distPath: 'dist/',         // Ignore dist directory
        testPath: 'tests/'         // Test files location
      },
      ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**'
      ],
      maxDepth: 5,
      includeHiddenFiles: false
    };

    const result = await RepositoryAnalyzer.analyze('./', customOptions);
    
    if (result.success) {
      console.log('Custom analysis results:');
      console.log('- Project Type:', result.data?.projectType);
      console.log('- Primary Language:', result.data?.language);
      console.log('- Framework:', result.data?.framework);
    } else {
      console.error('Custom analysis failed:', result.error);
    }
  }

  /**
   * Example 3: Analyze specific subdirectory
   */
  static async specificPathAnalysis() {
    console.log('\n=== Specific Path Analysis ===');
    
    const result = await RepositoryAnalyzer.analyzeSpecificPath(
      './',
      'src/core',  // Analyze only the src/core directory
      {
        ignorePatterns: ['**/*.test.ts', '**/*.spec.ts'],
        maxDepth: 3
      }
    );
    
    if (result.success) {
      console.log('Specific path analysis results:');
      console.log('- Language in src/core:', result.data?.language);
      console.log('- Project structure:', result.data?.projectType);
    } else {
      console.error('Specific path analysis failed:', result.error);
    }
  }

  /**
   * Example 4: Quick analysis with auto-detection
   */
  static async quickAnalysis() {
    console.log('\n=== Quick Analysis (Auto-detect) ===');
    
    const result = await RepositoryAnalyzer.quickAnalyze('./');
    
    if (result.success) {
      console.log('Quick analysis results:');
      console.log('- Project Type:', result.data?.projectType);
      console.log('- Framework:', result.data?.framework);
      console.log('- Primary Language:', result.data?.language);
      console.log('- Current Branch:', result.data?.currentBranch);
    } else {
      console.error('Quick analysis failed:', result.error);
    }
  }

  /**
   * Example 5: Get project structure with custom options
   */
  static async projectStructureAnalysis() {
    console.log('\n=== Project Structure Analysis ===');
    
    const structureOptions: AnalyzerOptions = {
      ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
        '**/.git/**',
        '**/*.log'
      ],
      maxDepth: 3,
      includeHiddenFiles: false
    };

    const result = await RepositoryAnalyzer.getProjectStructure(
      './',
      4, // max depth
      structureOptions
    );
    
    if (result.success) {
      console.log('Project structure:');
      result.data?.slice(0, 20).forEach(line => console.log(line)); // Show first 20 lines
      if (result.data && result.data.length > 20) {
        console.log(`... and ${result.data.length - 20} more items`);
      }
    } else {
      console.error('Structure analysis failed:', result.error);
    }
  }

  /**
   * Example 6: Find important files with custom config path
   */
  static async importantFilesAnalysis() {
    console.log('\n=== Important Files Analysis ===');
    
    const options: AnalyzerOptions = {
      customPaths: {
        configPath: './' // Look in root directory
      }
    };

    const result = await RepositoryAnalyzer.findImportantFiles('./', options);
    
    if (result.success) {
      console.log('Important files found:');
      result.data?.forEach(file => console.log(`- ${file}`));
    } else {
      console.error('Important files analysis failed:', result.error);
    }
  }

  /**
   * Example 7: Path validation
   */
  static async pathValidation() {
    console.log('\n=== Path Validation ===');
    
    const pathsToValidate = {
      configPath: './',
      srcPath: 'src/',
      distPath: 'dist/',
      testPath: '__tests__/'
    };

    const validation = RepositoryAnalyzer.validatePaths('./', pathsToValidate);
    
    if (validation.success) {
      console.log('Path validation successful:');
      console.log('Validated paths:', validation.data);
    } else {
      console.error('Path validation failed:', validation.error);
    }
  }

  /**
   * Run all examples
   */
  static async runAllExamples() {
    try {
      await this.basicAnalysis();
      await this.customPathAnalysis();
      await this.specificPathAnalysis();
      await this.quickAnalysis();
      await this.projectStructureAnalysis();
      await this.importantFilesAnalysis();
      await this.pathValidation();
    } catch (error) {
      console.error('Error running examples:', error);
    }
  }
}

// Usage examples for Tasky integration:

/**
 * Tasky-specific analyzer configurations
 */
export class TaskyAnalyzerConfig {
  /**
   * Analyze Tasky's React frontend
   */
  static getTaskyFrontendOptions(): AnalyzerOptions {
    return {
      customPaths: {
        configPath: './',
        srcPath: 'src/renderer/',
        distPath: 'dist/',
        testPath: 'src/__tests__/'
      },
      ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/.git/**',
        '**/Agent/**'  // Ignore Agent folder when analyzing Tasky frontend
      ],
      maxDepth: 4,
      includeHiddenFiles: false
    };
  }

  /**
   * Analyze Tasky's Electron main process
   */
  static getTaskyMainProcessOptions(): AnalyzerOptions {
    return {
      customPaths: {
        configPath: './',
        srcPath: 'src/electron/',
        distPath: 'dist/',
      },
      ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/src/renderer/**',  // Focus only on main process
        '**/Agent/**'
      ],
      maxDepth: 3
    };
  }

  /**
   * Analyze Agent folder structure
   */
  static getAgentAnalysisOptions(): AnalyzerOptions {
    return {
      customPaths: {
        configPath: 'Agent/',
        srcPath: 'Agent/src/',
        distPath: 'Agent/dist/',
        testPath: 'Agent/tests/'
      },
      ignorePatterns: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**'
      ],
      maxDepth: 5
    };
  }
}

// Example usage:
// const frontendAnalysis = await RepositoryAnalyzer.analyze('./', TaskyAnalyzerConfig.getTaskyFrontendOptions());
// const agentAnalysis = await RepositoryAnalyzer.analyze('./', TaskyAnalyzerConfig.getAgentAnalysisOptions());
