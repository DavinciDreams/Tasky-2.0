import chalk from 'chalk';
import boxen from 'boxen';
import { TUI } from './tui';
import { Task, TaskStatus, Priority } from '../core/types';
import { LooperEngine } from '../core/looper-engine';

export interface DashboardStats {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  reviewTasks: number;
  criticalTasks: number;
  todayCompleted: number;
  averageCompletionTime: number;
}

export class Dashboard {
  /**
   * Display the main dashboard
   */
  static async display(looper: LooperEngine, tasks: Task[]): Promise<void> {
    TUI.clear();

    // Animated header
    await this.displayHeader();

    // Stats overview
    const stats = this.calculateStats(tasks);
    this.displayStats(stats);

    // Task distribution chart
    this.displayTaskChart(stats);

    // Recent activity
    this.displayRecentActivity(tasks);

    // System health
    await this.displaySystemHealth(looper);

    TUI.separator();
  }

  /**
   * Display animated header
   */
  private static async displayHeader(): Promise<void> {
    const time = new Date().toLocaleTimeString();
    const date = new Date().toLocaleDateString();

    console.log(
      boxen(chalk.cyan.bold('LOOPER CLI DASHBOARD') + '\n' + chalk.gray(`${date} • ${time}`), {
        padding: 1,
        margin: { top: 1, bottom: 1, left: 0, right: 0 },
        borderStyle: 'double',
        borderColor: 'cyan',
        float: 'center'
      })
    );
  }

  /**
   * Calculate dashboard statistics
   */
  private static calculateStats(tasks: Task[]): DashboardStats {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      completedTasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      reviewTasks: tasks.filter(t => t.status === TaskStatus.NEEDS_REVIEW).length,
      criticalTasks: tasks.filter(t => t.schema.priority === Priority.CRITICAL).length,
      todayCompleted: tasks.filter(
        t => t.status === TaskStatus.COMPLETED && new Date(t.schema.createdAt) >= todayStart
      ).length,
      averageCompletionTime: this.calculateAverageCompletionTime(tasks)
    };
  }

  /**
   * Display statistics cards
   */
  private static displayStats(stats: DashboardStats): void {
    const cards = [
      {
        title: 'Total Tasks',
        value: stats.totalTasks,
        icon: '📊',
        color: chalk.blue
      },
      {
        title: 'Pending',
        value: stats.pendingTasks,
        icon: '⏳',
        color: chalk.yellow
      },
      {
        title: 'Completed',
        value: stats.completedTasks,
        icon: '✅',
        color: chalk.green
      },
      {
        title: 'Review',
        value: stats.reviewTasks,
        icon: '🚨',
        color: chalk.magenta
      },
      {
        title: 'Critical',
        value: stats.criticalTasks,
        icon: '🔥',
        color: chalk.magenta
      }
    ];

    console.log('\n' + chalk.bold('📈 Task Statistics'));
    console.log(chalk.gray('─'.repeat(60)));

    // Display cards in rows of 3
    for (let i = 0; i < cards.length; i += 3) {
      const row = cards.slice(i, i + 3);
      const cardStrings = row.map(card => {
        const content = `${card.icon} ${card.title}\n${card.color.bold(card.value.toString())}`;
        return boxen(content, {
          padding: { top: 0, bottom: 0, left: 1, right: 1 },
          borderStyle: 'round',
          borderColor: 'gray',
          dimBorder: true
        });
      });

      // Display cards side by side
      const lines1 = cardStrings[0]?.split('\n') || [];
      const lines2 = cardStrings[1]?.split('\n') || [];
      const lines3 = cardStrings[2]?.split('\n') || [];
      const maxLines = Math.max(lines1.length, lines2.length, lines3.length);

      for (let j = 0; j < maxLines; j++) {
        const line1 = lines1[j] || ' '.repeat(20);
        const line2 = lines2[j] || ' '.repeat(20);
        const line3 = lines3[j] || ' '.repeat(20);
        console.log(`${line1}  ${line2}  ${line3}`);
      }
      console.log();
    }
  }

  /**
   * Display task distribution chart
   */
  private static displayTaskChart(stats: DashboardStats): void {
    console.log(chalk.bold('📊 Task Distribution'));
    console.log(chalk.gray('─'.repeat(60)));

    const total = stats.totalTasks || 1; // Avoid division by zero

    const distributions = [
      { label: 'Pending', value: stats.pendingTasks, color: chalk.yellow },
      { label: 'Completed', value: stats.completedTasks, color: chalk.green },
      { label: 'Review', value: stats.reviewTasks, color: chalk.magenta }
    ];

    distributions.forEach(dist => {
      const percentage = (dist.value / total) * 100;
      const barWidth = Math.floor((percentage / 100) * 30);
      const bar = dist.color('█'.repeat(barWidth)) + chalk.gray('░'.repeat(30 - barWidth));

      console.log(
        `${dist.label.padEnd(10)} ${bar} ${dist.color(`${percentage.toFixed(1)}%`)} (${dist.value})`
      );
    });
    console.log();
  }

  /**
   * Display recent activity
   */
  private static displayRecentActivity(tasks: Task[]): void {
    console.log(chalk.bold('🕐 Recent Activity'));
    console.log(chalk.gray('─'.repeat(60)));

    const recentTasks = tasks
      .sort((a, b) => b.schema.createdAt.getTime() - a.schema.createdAt.getTime())
      .slice(0, 5);

    if (recentTasks.length === 0) {
      console.log(chalk.gray('No recent activity'));
    } else {
      recentTasks.forEach(task => {
        const statusIcon = this.getStatusIcon(task.status);
        const priorityIcon = this.getPriorityIcon(task.schema.priority || Priority.MEDIUM);
        const timeAgo = this.formatTimeAgo(task.schema.createdAt);

        console.log(
          `${statusIcon} ${priorityIcon} ${chalk.white(task.schema.title.slice(0, 35))}... ${chalk.gray(timeAgo)}`
        );
      });
    }
    console.log();
  }

  /**
   * Display system health indicators
   */
  private static async displaySystemHealth(looper: LooperEngine): Promise<void> {
    console.log(chalk.bold('🏥 System Health'));
    console.log(chalk.gray('─'.repeat(60)));

    const stats = await looper.getSystemStats();

    // Repository health
    const repoHealth = stats.repository.modifiedFiles > 10 ? 'warning' : 'good';
    const repoHealthIcon = repoHealth === 'good' ? '🟢' : '🟡';
    const repoHealthText =
      repoHealth === 'good' ? chalk.green('Healthy') : chalk.yellow('Needs Attention');

    console.log(`${repoHealthIcon} Repository Status: ${repoHealthText}`);
    console.log(`   Branch: ${chalk.cyan(stats.repository.branch)}`);
    console.log(`   Modified Files: ${stats.repository.modifiedFiles}`);

    // Agent availability
    console.log(`\n🤖 Agent Availability:`);
    stats.agents.available.forEach(agent => {
      const usage = stats.agents.usage[agent] || 0;
      console.log(`   ${chalk.green('✓')} ${agent}: ${usage} tasks processed`);
    });

    console.log();
  }

  /**
   * Calculate average completion time
   */
  private static calculateAverageCompletionTime(_tasks: Task[]): number {
    // TODO: Implement execution time tracking
    return 0;
  }

  /**
   * Get status icon
   */
  private static getStatusIcon(status: TaskStatus): string {
    const icons = {
      [TaskStatus.PENDING]: '⏳',
      [TaskStatus.COMPLETED]: '✅',
      [TaskStatus.NEEDS_REVIEW]: '🚨'
    };
    return icons[status] || '❓';
  }

  /**
   * Get priority icon
   */
  private static getPriorityIcon(priority: Priority): string {
    const icons = {
      [Priority.LOW]: '🟢',
      [Priority.MEDIUM]: '🟡',
      [Priority.HIGH]: '🔴',
      [Priority.CRITICAL]: '🔥'
    };
    return icons[priority] || '⚪';
  }

  /**
   * Format time ago
   */
  private static formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Display a mini dashboard (compact version)
   */
  static async displayMini(tasks: Task[]): Promise<void> {
    const stats = this.calculateStats(tasks);

    const summary = [
      `${chalk.yellow('⏳')} ${stats.pendingTasks}`,
      `${chalk.green('✅')} ${stats.completedTasks}`,
      `${chalk.magenta('🚨')} ${stats.reviewTasks}`
    ].join(' • ');

    console.log(
      boxen(`${chalk.bold('Quick Stats:')} ${summary}`, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'single',
        borderColor: 'gray'
      })
    );
  }
}
