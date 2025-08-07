import chalk from 'chalk';
import gradient from 'gradient-string';
import ora from 'ora';
import { Task, TaskStatus } from '../core/types';

export class BeautifulTUI {
  private static readonly gradients = {
    ocean: gradient('#2E3440', '#88C0D0', '#5E81AC'),
    sunset: gradient('#D08770', '#EBCB8B', '#A3BE8C'),
    nord: gradient('#5E81AC', '#81A1C1', '#88C0D0'),
    fire: gradient('#BF616A', '#D08770', '#EBCB8B')
  };

  /**
   * Clear screen and show a beautiful header
   */
  static showHeader(title: string, subtitle?: string): void {
    console.clear();
    const width = process.stdout.columns || 80;

    // Top spacing
    console.log('\n');

    // Gradient line
    console.log(this.gradients.ocean('━'.repeat(width)));
    console.log();

    // Title with gradient
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(titlePadding) + chalk.bold.white(title));

    if (subtitle) {
      const subtitlePadding = Math.floor((width - subtitle.length) / 2);
      console.log(' '.repeat(subtitlePadding) + chalk.dim(subtitle));
    }

    console.log();
    console.log(this.gradients.ocean('━'.repeat(width)));
    console.log();
  }

  /**
   * Show a beautiful welcome screen
   */
  static showWelcome(): void {
    console.clear();
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;

    // Center vertically
    const topPadding = Math.floor((height - 15) / 2);
    console.log('\n'.repeat(Math.max(0, topPadding - 2)));

    // LOOPER text with gradient
    const looper = [
      '  ██╗      ██████╗  ██████╗ ██████╗ ███████╗██████╗ ',
      '  ██║     ██╔═══██╗██╔═══██╗██╔══██╗██╔════╝██╔══██╗',
      '  ██║     ██║   ██║██║   ██║██████╔╝█████╗  ██████╔╝',
      '  ██║     ██║   ██║██║   ██║██╔═══╝ ██╔══╝  ██╔══██╗',
      '  ███████╗╚██████╔╝╚██████╔╝██║     ███████╗██║  ██║',
      '  ╚══════╝ ╚═════╝  ╚═════╝ ╚═╝     ╚══════╝╚═╝  ╚═╝'
    ];

    looper.forEach(line => {
      const padding = Math.floor((width - 37) / 2);
      console.log(' '.repeat(padding) + this.gradients.nord(line));
    });

    console.log('\n');

    // Tagline
    const tagline = 'Intelligent Repository Management';
    const taglinePadding = Math.floor((width - tagline.length) / 2);
    console.log(' '.repeat(taglinePadding) + chalk.white(tagline));

    console.log('\n');

    // Subtle animation hint
    const hint = chalk.dim('Press any key to continue...');
    const hintPadding = Math.floor((width - hint.length) / 2);
    console.log(' '.repeat(hintPadding) + hint);
  }

  /**
   * Show a beautiful goodbye screen
   */
  static showGoodbye(): void {
    const width = process.stdout.columns || 80;
    const height = process.stdout.rows || 24;

    // Center vertically
    const topPadding = Math.floor((height - 10) / 2);
    console.log('\n'.repeat(Math.max(0, topPadding)));

    // Goodbye message
    const goodbye = 'Thank you for using Looper CLI!';
    const goodbyePadding = Math.floor((width - goodbye.length) / 2);
    console.log(' '.repeat(goodbyePadding) + this.gradients.sunset(goodbye));

    console.log('\n');

    // Wave emoji
    const wave = '👋';
    const wavePadding = Math.floor((width - 2) / 2);
    console.log(' '.repeat(wavePadding) + wave);

    console.log('\n');

    // Final message
    const finalMsg = chalk.dim('See you next time!');
    const finalPadding = Math.floor((width - 18) / 2);
    console.log(' '.repeat(finalPadding) + finalMsg);

    console.log('\n'.repeat(3));
  }

  /**
   * Show a clean menu
   */
  static showMenu(title: string, subtitle?: string): void {
    this.showHeader(title, subtitle);
  }

  /**
   * Show task statistics in a beautiful way
   */
  static showStats(tasks: Task[]): void {
    if (tasks.length === 0) return;

    const stats = {
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      review: tasks.filter(t => t.status === TaskStatus.NEEDS_REVIEW).length
    };

    const total = tasks.length;
    const done = stats.completed;
    const progress = Math.round((done / total) * 100);

    // Progress bar
    const barWidth = 30;
    const filled = Math.round((progress / 100) * barWidth);
    const empty = barWidth - filled;

    const progressBar = chalk.green('█'.repeat(filled)) + chalk.gray.dim('░'.repeat(empty));

    console.log(
      chalk.dim('  Tasks: ') +
        `${chalk.yellow(stats.pending.toString())} pending, ` +
        `${chalk.green(stats.completed.toString())} done, ` +
        `${chalk.magenta(stats.review.toString())} review`
    );

    console.log(chalk.dim('  Progress: ') + progressBar + chalk.white(` ${progress}%`));
    console.log();
  }

  /**
   * Show content with nice formatting
   */
  static showContent(lines: string[]): void {
    lines.forEach(line => console.log('  ' + line));
  }

  /**
   * Show a file path beautifully
   */
  static showPath(label: string, path: string): void {
    console.log(chalk.dim(`  ${label}: `) + chalk.cyan(path));
  }

  /**
   * Show a list item
   */
  static showListItem(icon: string, title: string, subtitle?: string): void {
    console.log(`  ${icon} ${chalk.white(title)}`);
    if (subtitle) {
      console.log(`     ${chalk.dim(subtitle)}`);
    }
  }

  /**
   * Show a divider
   */
  static showDivider(): void {
    const width = process.stdout.columns || 80;
    console.log(chalk.gray.dim('  ' + '─'.repeat(width - 4)));
  }

  /**
   * Show an error message beautifully
   */
  static showError(message: string): void {
    console.log();
    console.log(chalk.red('  ✖ ') + chalk.white(message));
    console.log();
  }

  /**
   * Show a success message
   */
  static showSuccess(message: string): void {
    console.log();
    console.log(chalk.green('  ✔ ') + chalk.white(message));
    console.log();
  }

  /**
   * Show a warning
   */
  static showWarning(message: string): void {
    console.log();
    console.log(chalk.yellow('  ⚠ ') + chalk.white(message));
    console.log();
  }

  /**
   * Show a info message
   */
  static showInfo(message: string): void {
    console.log();
    console.log(chalk.blue('  ℹ ') + chalk.white(message));
    console.log();
  }

  /**
   * Create a beautiful box for important content
   */
  static showBox(content: string[], title?: string): void {
    const width = Math.max(...content.map(line => line.length)) + 4;

    // Top border
    if (title) {
      const titleStr = ` ${title} `;
      const leftPad = Math.floor((width - titleStr.length) / 2);
      const rightPad = width - titleStr.length - leftPad;
      console.log(
        chalk.gray('  ┌') +
          chalk.gray('─'.repeat(leftPad)) +
          chalk.white(titleStr) +
          chalk.gray('─'.repeat(rightPad)) +
          chalk.gray('┐')
      );
    } else {
      console.log(chalk.gray('  ┌' + '─'.repeat(width) + '┐'));
    }

    // Content
    content.forEach(line => {
      const padding = width - line.length;
      console.log(chalk.gray('  │ ') + line + ' '.repeat(padding) + chalk.gray(' │'));
    });

    // Bottom border
    console.log(chalk.gray('  └' + '─'.repeat(width) + '┘'));
  }

  /**
   * Create and return an ora spinner instance
   */
  static createSpinner(message: string): ora.Ora {
    return ora({
      text: message,
      spinner: 'dots',
      color: 'cyan',
      indent: 2
    }).start();
  }

  /**
   * Show a progress spinner frame (deprecated - use createSpinner instead)
   */
  static showSpinner(message: string, frame: number): void {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const spinner = chalk.cyan(frames[frame % frames.length]);
    process.stdout.write(`\r  ${spinner} ${message}`);
  }
}
