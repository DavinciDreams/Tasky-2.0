import chalk from 'chalk';
import figlet from 'figlet';
import ora from 'ora';
import boxen from 'boxen';
import Table from 'cli-table3';
import gradient from 'gradient-string';
import { AnimatedComponents } from './animated-components';
import { Dashboard } from './dashboard';

interface TUITheme {
  primary: chalk.Chalk;
  secondary: chalk.Chalk;
  success: chalk.Chalk;
  warning: chalk.Chalk;
  error: chalk.Chalk;
  info: chalk.Chalk;
  muted: chalk.Chalk;
  highlight: chalk.Chalk;
  gradient: (text: string) => string;
}

export class TUI {
  static readonly theme: TUITheme = {
    primary: chalk.cyan,
    secondary: chalk.magenta,
    success: chalk.green,
    warning: chalk.yellow,
    error: chalk.red,
    info: chalk.blue,
    muted: chalk.gray,
    highlight: chalk.bold.white,
    gradient: gradient('#ff6b6b', '#4ecdc4', '#45b7d1')
  };

  // Export sub-components
  static readonly Animated = AnimatedComponents;
  static readonly Dashboard = Dashboard;

  static banner(): void {
    const title = figlet.textSync('Looper CLI', {
      font: 'ANSI Shadow',
      horizontalLayout: 'fitted'
    });

    console.log(this.theme.gradient(title));
    console.log(
      boxen(
        `${this.theme.highlight('Select → Choose Agent → Execute')}\n` +
          `${this.theme.muted('Human-in-Loop Repository Intelligence')}`,
        {
          padding: 1,
          margin: 1,
          borderStyle: 'double',
          borderColor: 'cyan',
          backgroundColor: 'black'
        }
      )
    );
  }

  static section(title: string, content?: string): void {
    console.log(
      boxen(`${this.theme.primary.bold(`📋 ${title}`)}\n${content || ''}`, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'round',
        borderColor: 'cyan'
      })
    );
  }

  static status(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const icons = {
      info: '🔍',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    const colors = {
      info: this.theme.info,
      success: this.theme.success,
      warning: this.theme.warning,
      error: this.theme.error
    };

    console.log(`${icons[type]} ${colors[type](message)}`);
  }

  static progress(message: string): ora.Ora {
    return ora({
      text: message,
      spinner: 'dots12',
      color: 'cyan'
    }).start();
  }

  static table(data: Array<Record<string, any>>, headers: string[]): void {
    const termWidth = process.stdout.columns || 80;

    const table = new Table({
      head: headers.map(h => this.theme.primary.bold(h)),
      style: {
        head: [],
        border: ['cyan']
      }
    });

    data.forEach(row => {
      table.push(headers.map(h => row[h] || ''));
    });

    // Get table string and center it
    const tableString = table.toString();
    const lines = tableString.split('\n');

    // Better ANSI code stripping - handles all escape sequences
    const stripAnsi = (str: string): string => {
      return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    };

    // Add spacing before the table
    console.log();

    // Center each line of the table
    lines.forEach(line => {
      if (line.trim()) {
        // Only process non-empty lines
        const cleanLine = stripAnsi(line);
        const padding = Math.max(0, Math.floor((termWidth - cleanLine.length) / 2));
        console.log(' '.repeat(padding) + line);
      }
    });

    // Add spacing after the table
    console.log();
  }

  static separator(): void {
    console.log(this.theme.muted('─'.repeat(60)));
  }

  static clear(): void {
    console.clear();
  }

  static alert(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const config = {
      info: { icon: 'ℹ️', color: this.theme.info, border: 'blue' },
      success: { icon: '✅', color: this.theme.success, border: 'green' },
      warning: { icon: '⚠️', color: this.theme.warning, border: 'yellow' },
      error: { icon: '❌', color: this.theme.error, border: 'red' }
    };

    const { icon, color, border } = config[type];

    console.log(
      boxen(`${icon} ${color.bold(message)}`, {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: 'round',
        borderColor: border as any
      })
    );
  }

  static progressBar(current: number, total: number, width: number = 40): string {
    const percentage = Math.min(100, Math.max(0, (current / total) * 100));
    const filled = Math.floor((width * percentage) / 100);
    const empty = width - filled;

    const bar = this.theme.success('█'.repeat(filled)) + this.theme.muted('░'.repeat(empty));

    return `${bar} ${percentage.toFixed(1)}% (${current}/${total})`;
  }

  static codeBlock(code: string, language: string = 'typescript'): void {
    const lines = code.split('\n');
    const numberedLines = lines.map((line, index) => {
      const lineNumber = this.theme.muted(`${(index + 1).toString().padStart(3, ' ')} │ `);
      return lineNumber + line;
    });

    console.log(
      boxen(`${this.theme.info.bold(`📄 ${language}`)}\n\n${numberedLines.join('\n')}`, {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'blue'
      })
    );
  }

  static header(title: string, subtitle?: string): void {
    const header = this.theme.primary.bold.underline(title);
    const sub = subtitle ? `\n${this.theme.muted(subtitle)}` : '';
    console.log(`${header}${sub}\n${this.separator()}`);
  }

  static list(items: readonly string[], ordered: boolean = false): void {
    items.forEach((item, index) => {
      const bullet = ordered ? `${index + 1}.` : '•';
      console.log(`  ${this.theme.muted(bullet)} ${item}`);
    });
  }

  static keyValue(key: string, value: string | number, width: number = 30): void {
    const paddedKey = key.padEnd(width, '.');
    console.log(`${this.theme.muted(paddedKey)} ${this.theme.highlight(value)}`);
  }

  static tree(data: Record<string, any>, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        console.log(`${prefix}${this.theme.primary(key)}:`);
        this.tree(value, indent + 1);
      } else {
        console.log(`${prefix}${this.theme.muted(key)}: ${this.theme.highlight(value)}`);
      }
    });
  }
}
