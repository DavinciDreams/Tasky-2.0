import inquirer from 'inquirer';
import chalk from 'chalk';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir } from 'os';
import { BeautifulTUI } from './beautiful-tui';

export interface FileExplorerOptions {
  startPath?: string;
  showHidden?: boolean;
  showFiles?: boolean;
  allowFileSelection?: boolean;
  allowFolderSelection?: boolean;
  filterExtensions?: string[];
  title?: string;
}

export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'parent' | 'action';
  size?: number;
  modified?: Date;
  isGitRepo?: boolean;
  action?: string;
}

export class FileExplorer {
  private currentPath: string;
  private history: string[] = [];

  constructor(private options: FileExplorerOptions = {}) {
    this.currentPath = resolve(options.startPath || homedir());
  }

  /**
   * Launch the file explorer and return selected path
   */
  async browse(): Promise<string | null> {
    while (true) {
      const result = await this.showCurrentDirectory();

      if (!result) {
        // User cancelled
        return null;
      }

      // Handle special actions
      if (result.type === 'action') {
        switch (result.action) {
          case 'cancel':
            return null;
          case 'select':
            return this.currentPath;
          case 'manual':
            const manualPath = await this.enterPathManually();
            if (manualPath) {
              if (statSync(manualPath).isDirectory()) {
                this.navigateTo(manualPath);
              } else {
                return manualPath;
              }
            }
            continue;
        }
      }

      // Handle navigation
      if (result.type === 'parent' || result.type === 'directory') {
        this.navigateTo(result.path);
        continue;
      }

      // Handle file selection
      if (result.type === 'file') {
        if (this.options.allowFileSelection) {
          return result.path;
        }
        // If files not allowed, show message and continue
        BeautifulTUI.showWarning('File selection is not allowed. Please select a folder.');
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
    }
  }

  /**
   * Show current directory contents
   */
  private async showCurrentDirectory(): Promise<FileItem | null> {
    // Clear screen and show header
    console.clear();

    // Show beautiful centered header with current path
    const width = process.stdout.columns || 80;
    const headerWidth = Math.min(80, width - 10);
    const headerPadding = Math.floor((width - headerWidth) / 2);

    console.log('\n');
    console.log(' '.repeat(headerPadding) + chalk.cyan('━'.repeat(headerWidth)));

    const title = '📁 File Explorer';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + chalk.bold.white(title));

    const currentPath = this.formatPath(this.currentPath);
    const pathPadding = Math.floor((width - currentPath.length) / 2);
    console.log(' '.repeat(Math.max(0, pathPadding)) + chalk.gray(currentPath));

    console.log(' '.repeat(headerPadding) + chalk.cyan('━'.repeat(headerWidth)) + '\n');

    // Get directory contents
    const items = this.getDirectoryContents();

    // Create choices array with padding
    const choices: any[] = [];
    const menuWidth = 45;
    const leftPadding = Math.max(0, Math.floor((width - menuWidth) / 2));

    // Add navigation items
    items.forEach(item => {
      choices.push({
        name: ' '.repeat(leftPadding) + this.formatItem(item),
        value: item
      });
    });

    // Add separator before actions
    if (choices.length > 0) {
      choices.push(new inquirer.Separator(' '.repeat(leftPadding) + chalk.gray('─'.repeat(40))));
    }

    // Add action buttons
    if (this.options.allowFolderSelection !== false) {
      choices.push({
        name: ' '.repeat(leftPadding) + chalk.green.bold('  ✅ Select Current Folder'),
        value: { type: 'action', action: 'select', path: this.currentPath }
      });
    }

    choices.push({
      name: ' '.repeat(leftPadding) + chalk.yellow('  📝 Enter Path Manually'),
      value: { type: 'action', action: 'manual' }
    });

    choices.push({
      name: ' '.repeat(leftPadding) + chalk.red('  ❌ Cancel'),
      value: { type: 'action', action: 'cancel' }
    });

    // Add navigation instructions at bottom
    choices.push(new inquirer.Separator(' '));
    choices.push(
      new inquirer.Separator(
        ' '.repeat(leftPadding) + chalk.gray('↑↓ Navigate  •  Enter to select')
      )
    );

    // Show the prompt
    try {
      const { selection } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selection',
          message: 'Selection:',
          choices,
          pageSize: Math.min(20, process.stdout.rows - 10),
          loop: false,
          prefix: ' '.repeat(Math.max(0, leftPadding - 3)) // Move arrow closer to menu
        }
      ]);

      return selection;
    } catch {
      // Handle Ctrl+C
      return null;
    }
  }

  /**
   * Format a file/directory item for display
   */
  private formatItem(item: FileItem): string {
    let icon = '';
    let name = item.name;
    let details = '';

    if (item.type === 'parent') {
      return chalk.blue('  ⬆️  ..') + chalk.gray(' (parent directory)');
    }

    if (item.type === 'directory') {
      icon = item.isGitRepo ? '🔧' : '📁';
      name = chalk.blue(item.name);
      if (item.isGitRepo) {
        details = chalk.green(' [git]');
      }
    } else if (item.type === 'file') {
      icon = this.getFileIcon(item.name);
      name = chalk.white(item.name);
      if (item.size !== undefined) {
        details = chalk.gray(` (${this.formatFileSize(item.size)})`);
      }
    }

    return `  ${icon}  ${name}${details}`;
  }

  /**
   * Get appropriate icon for file type
   */
  private getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const iconMap: Record<string, string> = {
      ts: '📘',
      tsx: '📘',
      js: '📜',
      jsx: '📜',
      json: '📋',
      md: '📝',
      txt: '📄',
      yml: '⚙️',
      yaml: '⚙️',
      toml: '⚙️',
      ini: '⚙️',
      sh: '🖥️',
      bat: '🖥️',
      ps1: '🖥️',
      git: '🔧',
      gitignore: '🔧',
      lock: '🔒',
      env: '🔐',
      log: '📊',
      css: '🎨',
      scss: '🎨',
      html: '🌐',
      svg: '🖼️',
      png: '🖼️',
      jpg: '🖼️',
      jpeg: '🖼️',
      gif: '🖼️'
    };

    return iconMap[ext || ''] || '📄';
  }

  /**
   * Get contents of current directory
   */
  private getDirectoryContents(): FileItem[] {
    const items: FileItem[] = [];

    // Add parent directory option (except at root)
    if (this.currentPath !== '/' && dirname(this.currentPath) !== this.currentPath) {
      items.push({
        name: '..',
        path: dirname(this.currentPath),
        type: 'parent'
      });
    }

    try {
      const entries = readdirSync(this.currentPath);

      for (const entry of entries) {
        // Skip hidden files if not showing them
        if (!this.options.showHidden && entry.startsWith('.')) {
          continue;
        }

        const fullPath = join(this.currentPath, entry);

        try {
          const stats = statSync(fullPath);

          if (stats.isDirectory()) {
            // Check if it's a git repository
            const isGitRepo = existsSync(join(fullPath, '.git'));

            items.push({
              name: entry,
              path: fullPath,
              type: 'directory',
              modified: stats.mtime,
              isGitRepo
            });
          } else if (this.options.showFiles !== false) {
            // Check file extension filter
            if (this.options.filterExtensions) {
              const ext = entry.split('.').pop()?.toLowerCase();
              if (!ext || !this.options.filterExtensions.includes(ext)) {
                continue;
              }
            }

            items.push({
              name: entry,
              path: fullPath,
              type: 'file',
              size: stats.size,
              modified: stats.mtime
            });
          }
        } catch {
          // Skip items we can't access
          continue;
        }
      }
    } catch (_error) {
      console.error(chalk.red(`  ⚠️  Error reading directory: ${_error}`));
      return items;
    }

    // Sort: directories first, then alphabetically
    return items.sort((a, b) => {
      if (a.type === 'parent') return -1;
      if (b.type === 'parent') return 1;
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
  }

  /**
   * Navigate to a directory
   */
  private navigateTo(path: string): void {
    try {
      const resolvedPath = resolve(path);
      if (existsSync(resolvedPath) && statSync(resolvedPath).isDirectory()) {
        this.history.push(this.currentPath);
        this.currentPath = resolvedPath;
      } else {
        BeautifulTUI.showError(`Cannot navigate to: ${path}`);
      }
    } catch (error) {
      BeautifulTUI.showError(`Navigation error: ${error}`);
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Format path for display
   */
  private formatPath(path: string): string {
    const home = homedir();
    if (path.startsWith(home)) {
      return path.replace(home, '~');
    }
    return path;
  }

  /**
   * Manual path entry
   */
  private async enterPathManually(): Promise<string | null> {
    console.log('\n' + chalk.yellow('📝 Enter Path Manually'));
    console.log(chalk.gray('─'.repeat(40)) + '\n');

    const { path } = await inquirer.prompt([
      {
        type: 'input',
        name: 'path',
        message: 'Enter path:',
        default: this.currentPath,
        validate: (input: string) => {
          if (!input) return 'Path cannot be empty';
          const resolved = resolve(input);
          if (!existsSync(resolved)) return 'Path does not exist';
          return true;
        }
      }
    ]);

    return resolve(path);
  }

  /**
   * Quick access to common directories
   */
  static async quickAccess(): Promise<string | null> {
    console.clear();

    const width = process.stdout.columns || 80;
    console.log('\n' + chalk.cyan('━'.repeat(width)));
    console.log(chalk.bold.white('  🚀 Quick Access'));
    console.log(chalk.gray('  Jump to common locations'));
    console.log(chalk.cyan('━'.repeat(width)) + '\n');

    const home = homedir();
    const choices: any[] = [];

    // Common directories
    const commonDirs = [
      { name: 'Home Directory', icon: '🏠', path: home },
      { name: 'Documents', icon: '��', path: join(home, 'Documents') },
      { name: 'Projects', icon: '💼', path: join(home, 'Projects') },
      { name: 'Downloads', icon: '⬇️', path: join(home, 'Downloads') },
      { name: 'Desktop', icon: '🖥️', path: join(home, 'Desktop') },
      { name: 'Current Directory', icon: '💻', path: process.cwd() }
    ];

    // Add existing directories
    commonDirs.forEach(dir => {
      if (existsSync(dir.path)) {
        choices.push({
          name: `  ${dir.icon}  ${chalk.white(dir.name)} ${chalk.gray(dir.path.replace(home, '~'))}`,
          value: dir.path
        });
      }
    });

    // Add actions
    choices.push(new inquirer.Separator(chalk.gray('─'.repeat(40))));
    choices.push({
      name: chalk.yellow('  📂  Browse for folder...'),
      value: 'browse'
    });
    choices.push({
      name: chalk.red('  ❌  Cancel'),
      value: null
    });

    try {
      const { selection } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selection',
          message: ' ', // Empty message to suppress "(Use arrow keys)"
          choices,
          pageSize: 15
        }
      ]);

      if (selection === 'browse') {
        const explorer = new FileExplorer({ allowFolderSelection: true });
        return explorer.browse();
      }

      return selection;
    } catch {
      return null;
    }
  }
}
