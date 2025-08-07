import inquirer from 'inquirer';
import chalk from 'chalk';
import boxen from 'boxen';
import gradientString from 'gradient-string';
import { Task, Priority } from '../core/types';

import { showCustomMenu, CustomMenuSection } from './custom-menu';

export interface MenuItem {
  name: string;
  value: string;
  icon?: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
  hidden?: boolean;
}

export interface MenuSection {
  title?: string;
  items: MenuItem[];
}

export class NavigationUI {
  private static readonly MENU_WIDTH = 65;

  /**
   * Show home screen
   */
  static async showHomeScreen(): Promise<void> {
    console.clear();
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;

    // Create multiple gradients for different effects
    const logoGradient = gradientString('#667eea', '#764ba2', '#ff6b6b');
    const borderGradient = gradientString('#2D9CDB', '#56CCF2');
    const accentGradient = gradientString('#F2994A', '#F2C94C');

    // Looper CLI ASCII Art Logo
    const logo = [
      '██╗      ██████╗  ██████╗ ██████╗ ███████╗██████╗      ██████╗██╗     ██╗',
      '██║     ██╔═══██╗██╔═══██╗██╔══██╗██╔════╝██╔══██╗    ██╔════╝██║     ██║',
      '██║     ██║   ██║██║   ██║██████╔╝█████╗  ██████╔╝    ██║     ██║     ██║',
      '██║     ██║   ██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗    ██║     ██║     ██║',
      '███████╗╚██████╔╝╚██████╔╝██║     ███████╗██║  ██║    ╚██████╗███████╗██║',
      '╚══════╝ ╚═════╝  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝     ╚═════╝╚══════╝╚═╝'
    ];

    const tagline = 'Intelligent Task Management System';
    const loadingWidth = 50;

    // Calculate total content height precisely
    const totalContentHeight = logo.length + 4; // logo + 2 spacing lines + tagline + loading bar

    // Calculate perfect vertical centering
    const availableHeight = height - 4; // Leave some margin at top/bottom
    const topPadding = Math.max(1, Math.floor((availableHeight - totalContentHeight) / 2));

    // Add calculated top padding for perfect vertical centering
    console.log('\n'.repeat(topPadding));

    // Display logo with perfect horizontal centering and animation
    for (let i = 0; i < logo.length; i++) {
      const line = logo[i];
      const horizontalPadding = Math.max(0, Math.floor((width - line.length) / 2));
      console.log(' '.repeat(horizontalPadding) + logoGradient(line));

      // Small delay for animation effect
      await new Promise(resolve => setTimeout(resolve, 40));
    }

    // Add spacing and perfectly centered tagline
    console.log('\n');
    const taglineHorizontalPadding = Math.max(0, Math.floor((width - tagline.length) / 2));
    console.log(' '.repeat(taglineHorizontalPadding) + accentGradient(tagline));

    // Add spacing and perfectly centered animated loading bar
    console.log('\n');
    const loadingHorizontalPadding = Math.max(0, Math.floor((width - loadingWidth) / 2));

    // Progress bar with perfect centering
    process.stdout.write(' '.repeat(loadingHorizontalPadding) + chalk.gray('│'));

    for (let i = 0; i < loadingWidth - 2; i++) {
      process.stdout.write(borderGradient('█'));
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    process.stdout.write(chalk.gray('│'));

    // Add final spacing to maintain centering
    console.log('\n');

    // Ensure clean transition
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Show a beautiful main menu using custom menu system
   */
  static async showMainMenu(context?: {
    repoPath?: string;
    taskCount?: number;
    stats?: any;
  }): Promise<string> {
    // Prepare header information
    let subtitle = 'Intelligent Task Management System';
    if (context?.repoPath) {
      const repoName = this.truncatePath(context.repoPath, 45);
      subtitle = `Repository: ${repoName}`;
    }

    // Prepare stats text for subtitle
    if (context?.stats) {
      const statsText = `Total: ${context.stats.total} | Pending: ${context.stats.pending} | Completed: ${context.stats.completed}`;
      subtitle = `${subtitle}\n${statsText}`;
    }

    // Menu sections with improved organization - convert to CustomMenuSection
    const sections: CustomMenuSection[] = [
      {
        title: 'Tasks',
        items: [
          {
            name: 'Task Manager',
            value: 'tasks',
            icon: '📋',
            description: 'View and manage tasks'
          }
        ]
      },
      {
        title: 'Actions',
        items: [
          {
            name: ' Run Next Task',
            value: 'run',
            icon: '▶️',
            description: 'Select task, Choose agent, Execute'
          },
          {
            name: 'Auto-Process All',
            value: 'auto',
            icon: '🚀',
            description: 'Run all pending tasks'
          }
        ]
      },
      {
        title: 'Options',
        items: [
          {
            name: 'Repository Settings',
            value: 'init',
            icon: '🔧',
            description: 'Configure repository'
          },
          {
            name: 'Exit',
            value: 'exit',
            icon: '🚪',
            description: 'Close application'
          }
        ]
      }
    ];

    // Use the custom menu system for perfect control and centering
    return await showCustomMenu(sections, 'Looper CLI', subtitle);
  }

  /**
   * Show task selection menu using custom menu system
   */
  static async showTaskSelectionMenu(tasks: Task[]): Promise<string | null> {
    if (tasks.length === 0) {
      this.showEmptyState('No tasks available', 'Create a new task to get started');
      await this.waitForKey();
      return null;
    }

    // Group tasks by status
    const grouped = this.groupTasksByStatus(tasks);
    const sections: CustomMenuSection[] = [];

    // Add sections for each status
    Object.entries(grouped).forEach(([status, statusTasks]) => {
      if (statusTasks.length > 0) {
        sections.push({
          title: this.getStatusTitle(status),
          items: statusTasks.map(task => ({
            name:
              task.schema.title.length > 25
                ? task.schema.title.substring(0, 22) + '...'
                : task.schema.title,
            value: task.schema.id,
            icon: this.getStatusIcon(status),
            description: this.getPriorityLabel(task.schema.priority || Priority.MEDIUM)
          }))
        });
      }
    });

    // Add cancel option
    sections.push({
      items: [
        { name: 'Back to Main Menu', value: 'cancel', icon: '🔙', description: 'Return to main' }
      ]
    });

    // Use the custom menu system
    const result = await showCustomMenu(sections, 'Select Task', `${tasks.length} tasks available`);

    return result === 'cancel' ? null : result;
  }

  /**
   * Show confirmation dialog using custom menu system for consistency
   */
  static async showConfirmation(
    title: string,
    message: string,
    options?: {
      type?: 'success' | 'warning' | 'danger' | 'info';
      defaultValue?: boolean;
    }
  ): Promise<boolean> {
    const type = options?.type || 'info';
    const icons = {
      success: '✔',
      warning: '⚠',
      danger: '✖',
      info: 'ℹ'
    };

    const icon = icons[type];
    const menuTitle = `${icon} ${title}`;

    // Use custom menu system for consistent styling
    const sections: CustomMenuSection[] = [
      {
        title: message,
        items: [
          {
            name: 'Yes',
            value: 'yes',
            icon: '✅',
            description: 'Proceed with action'
          },
          {
            name: 'No',
            value: 'no',
            icon: '❌',
            description: 'Cancel action'
          }
        ]
      }
    ];

    const result = await showCustomMenu(sections, menuTitle, '');
    return result === 'yes';
  }

  /**
   * Show action menu for a specific context using custom menu system
   */
  static async showActionMenu(
    title: string,
    actions: MenuItem[],
    context?: string
  ): Promise<string> {
    // Convert MenuItem[] to CustomMenuSection[]
    const sections: CustomMenuSection[] = [
      {
        items: actions.map(item => {
          const customItem: any = {
            name: item.name,
            value: item.value
          };
          if (item.icon) customItem.icon = item.icon;
          if (item.description) customItem.description = item.description;
          if (item.disabled) customItem.disabled = item.disabled;
          return customItem;
        })
      }
    ];

    const subtitle = context ? `${context}` : undefined;

    // Use the custom menu system
    return await showCustomMenu(sections, title, subtitle);
  }

  /**
   * Show empty state
   */
  private static showEmptyState(title: string, message: string): void {
    const termWidth = process.stdout.columns || 80;
    const boxWidth = 40;

    const box = boxen(chalk.gray('🔍\n\n') + chalk.bold(title) + '\n' + chalk.gray(message), {
      padding: 2,
      margin: { left: Math.floor((termWidth - boxWidth) / 2), right: 0, top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'gray',
      textAlignment: 'center'
    });

    console.log(box);
  }

  /**
   * Wait for keypress
   */
  private static async waitForKey(): Promise<void> {
    const termWidth = process.stdout.columns || 80;
    const leftPadding = Math.floor((termWidth - this.MENU_WIDTH) / 2);

    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...'),
        prefix: ' '.repeat(leftPadding)
      }
    ]);
  }

  private static truncatePath(path: string, maxLength: number): string {
    if (path.length <= maxLength) return path;

    const parts = path.split(/[/\\]/);
    if (parts.length <= 2) return '...' + path.slice(-maxLength + 3);

    const result = parts[0];
    let i = parts.length - 1;

    while (i > 0 && (result + '/.../' + parts.slice(i).join('/')).length <= maxLength) {
      i--;
    }

    return result + '/.../' + parts.slice(i + 1).join('/');
  }

  private static groupTasksByStatus(tasks: Task[]): Record<string, Task[]> {
    return tasks.reduce(
      (acc, task) => {
        const status = task.status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(task);
        return acc;
      },
      {} as Record<string, Task[]>
    );
  }

  private static getStatusTitle(status: string): string {
    const titles: Record<string, string> = {
      PENDING: 'Pending Tasks',
      RUNNING: 'In Progress',
      COMPLETED: 'Completed',
      FAILED: 'Failed',
      NEEDS_REVIEW: 'Needs Review',
      ARCHIVED: 'Archived'
    };
    return titles[status] || status;
  }

  private static getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      PENDING: '⏳',
      RUNNING: '🔄',
      COMPLETED: '✅',
      FAILED: '❌',
      NEEDS_REVIEW: '🚨',
      ARCHIVED: '📦'
    };
    return icons[status] || '❓';
  }

  private static getPriorityLabel(priority: number): string {
    const labels: Record<number, string> = {
      1: chalk.green('Low'),
      2: chalk.yellow('Medium'),
      3: chalk.red('High'),
      4: chalk.red.bold('Critical')
    };
    return labels[priority] || 'Unknown';
  }
}
