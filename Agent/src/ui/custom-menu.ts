import chalk from 'chalk';
import { createInterface } from 'readline';
import inquirer from 'inquirer';

export interface CustomMenuItem {
  name: string;
  value: string;
  icon?: string;
  description?: string;
  disabled?: boolean;
}

export interface CustomMenuSection {
  title?: string;
  items: CustomMenuItem[];
}

export class CustomMenu {
  private selectedIndex = 0;
  private items: CustomMenuItem[] = [];
  private termWidth: number;
  private menuWidth: number;
  private lastRenderedContent = '';
  private isFirstRender = true;

  constructor(
    private sections: CustomMenuSection[],
    private title?: string,
    private subtitle?: string
  ) {
    this.termWidth = process.stdout.columns || 80;
    this.menuWidth = 60;

    // Flatten sections into a single array of selectable items
    this.items = sections.flatMap(section => section.items.filter(item => !item.disabled));
  }

  private hideCursor() {
    process.stdout.write('\x1B[?25l');
  }

  private showCursor() {
    process.stdout.write('\x1B[?25h');
  }

  private clearScreen() {
    // Use a more thorough clear that clears scrollback too
    process.stdout.write('\x1Bc'); // Clear screen and scrollback buffer
  }

  private buildMenuContent(): string {
    let content = '';

    // Build compact header with minimal spacing - align with menu sections
    if (this.title) {
      // Calculate consistent left padding to align with menu sections
      const leftPadding = Math.max(0, Math.floor((this.termWidth - this.menuWidth) / 2));

      // Main title aligned with menu sections
      const titleCenterOffset = Math.floor((this.menuWidth - this.title.length) / 2);
      content +=
        ' '.repeat(leftPadding + Math.max(0, titleCenterOffset)) +
        chalk.bold.hex('#667eea')(this.title) +
        '\n';

      if (this.subtitle) {
        // Handle multi-line subtitles with enhanced styling - align with menu
        const subtitleLines = this.subtitle.split('\n');
        subtitleLines.forEach((line, index) => {
          const stripAnsi = require('strip-ansi');
          const cleanLine = stripAnsi(line);

          // Check if this looks like a repository path (contains slashes or backslashes)
          const isRepositoryPath =
            line.includes('/') || line.includes('\\') || line.toLowerCase().includes('repository');
          // Check if this looks like stats (contains numbers and keywords)
          const isStatsLine =
            line.includes('Total:') || line.includes('Pending:') || line.includes('Completed:');

          if (isRepositoryPath && index === 0) {
            // Repository line with icon - align with menu
            const lineCenterOffset = Math.floor((this.menuWidth - cleanLine.length - 2) / 2); // -2 for icon space
            content +=
              ' '.repeat(leftPadding + Math.max(0, lineCenterOffset)) +
              chalk.hex('#8b949e')('📁 ' + line) +
              '\n';
          } else if (isStatsLine) {
            // Stats line with better formatting - align with menu
            const lineCenterOffset = Math.floor((this.menuWidth - cleanLine.length - 2) / 2); // -2 for icon space
            content +=
              ' '.repeat(leftPadding + Math.max(0, lineCenterOffset)) +
              chalk.hex('#f2cc60')('📊 ' + line) +
              '\n';
          } else {
            // Regular text (like confirmation messages) - center properly
            const lineCenterOffset = Math.floor((this.menuWidth - cleanLine.length) / 2);
            content +=
              ' '.repeat(leftPadding + Math.max(0, lineCenterOffset)) +
              chalk.hex('#8b949e')(line) +
              '\n';
          }
        });
      }

      // Separator aligned with menu width
      const separatorWidth = Math.min(50, this.menuWidth);
      const separatorCenterOffset = Math.floor((this.menuWidth - separatorWidth) / 2);
      content +=
        ' '.repeat(leftPadding + Math.max(0, separatorCenterOffset)) +
        chalk.hex('#30363d')('═'.repeat(separatorWidth)) +
        '\n';
    }

    // Build menu sections with very compact styling
    let itemIndex = 0;
    this.sections.forEach(section => {
      if (section.title) {
        // Enhanced section headers with compact visual hierarchy
        const leftPadding = Math.max(0, Math.floor((this.termWidth - this.menuWidth) / 2));
        const titleText = section.title.toUpperCase();
        const titleLength = titleText.length + 4; // Extra space for styling
        const dashCount = Math.max(3, Math.floor((this.menuWidth - titleLength) / 2) - 5); // Shorter dashes

        // Different colors for different sections
        let sectionColor = chalk.hex('#7c3aed'); // Default purple
        if (section.title.toLowerCase() === 'actions') sectionColor = chalk.hex('#059669'); // Green
        if (section.title.toLowerCase() === 'options') sectionColor = chalk.hex('#dc2626'); // Red

        const titleLine =
          chalk.hex('#4b5563')('─'.repeat(dashCount)) +
          sectionColor(' ◆ ' + titleText + ' ◆ ') +
          chalk.hex('#4b5563')('─'.repeat(dashCount));
        content += ' '.repeat(leftPadding) + titleLine + '\n';
      }

      // Render items with no extra spacing
      section.items.forEach(item => {
        if (!item.disabled) {
          const isSelected = itemIndex === this.selectedIndex;
          content += this.buildMenuItem(item, itemIndex, isSelected) + '\n';
          itemIndex++;
        }
      });
    });

    // Compact navigation help - align with menu sections
    const helpText = '↑↓ Navigate  •  ⏎ Select  •  ⎋ Exit';
    const leftPadding = Math.max(0, Math.floor((this.termWidth - this.menuWidth) / 2));
    const helpCenterOffset = Math.floor((this.menuWidth - helpText.length) / 2);
    content +=
      ' '.repeat(leftPadding + Math.max(0, helpCenterOffset)) + chalk.hex('#6b7280')(helpText);

    return content;
  }

  private buildMenuItem(item: CustomMenuItem, _index: number, isSelected: boolean): string {
    const leftPadding = Math.max(0, Math.floor((this.termWidth - this.menuWidth) / 2));
    let line = ' '.repeat(leftPadding);

    // Enhanced selection indicator with better styling
    if (isSelected) {
      line += chalk.bold.hex('#f59e0b')('▶ '); // Bright orange arrow
    } else {
      line += '  ';
    }

    // Enhanced icon with better spacing
    if (item.icon) {
      line += chalk.bold.hex('#10b981')(item.icon) + '  '; // Bright green icons
    } else {
      line += '   ';
    }

    // Fixed-width name section to keep descriptions aligned
    const nameWidth = 26;
    const paddedName = item.name.padEnd(nameWidth, ' ');

    if (isSelected) {
      // Selected item with background, but keep same width
      line += chalk.bold.black.bgHex('#e5e7eb')(paddedName);
    } else {
      // Non-selected items with subtle styling, same width
      line += chalk.bold.hex('#f3f4f6')(paddedName);
    }

    // Fixed position description - always starts at same column
    if (item.description) {
      const descriptionText = ' • ' + item.description;
      if (isSelected) {
        line += chalk.bold.hex('#3b82f6')(descriptionText); // Bright blue when selected
      } else {
        line += chalk.hex('#6b7280')(descriptionText); // Subtle gray when not selected
      }
    }

    return line;
  }

  private renderMenu() {
    // Build the complete menu content as a string
    const newContent = this.buildMenuContent();

    // Only render if content has actually changed (smart caching)
    if (newContent !== this.lastRenderedContent || this.isFirstRender) {
      // Always do a full screen clear for consistent behavior
      this.clearScreen();
      if (this.isFirstRender) {
        this.isFirstRender = false;
      }

      // Calculate minimal vertical centering for compact layout
      const termHeight = process.stdout.rows || 24;
      const contentLines = newContent.split('\n').length;
      const topPadding = Math.max(0, Math.floor((termHeight - contentLines - 4) / 3)); // Much less padding

      // Add minimal top padding for compact centering
      const centeredContent = '\n'.repeat(topPadding) + newContent;

      // Output the complete content at once
      process.stdout.write(centeredContent);

      this.lastRenderedContent = newContent;
    }
  }

  private setupKeyHandlers(rl: any): Promise<string> {
    return new Promise(resolve => {
      const onKeypress = (_str: string, key: any) => {
        if (key.ctrl && key.name === 'c') {
          this.showCursor();
          process.exit(0);
        }

        switch (key.name) {
          case 'up':
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            this.renderMenu();
            break;

          case 'down':
            this.selectedIndex = Math.min(this.items.length - 1, this.selectedIndex + 1);
            this.renderMenu();
            break;

          case 'return':
          case 'enter':
            const selectedItem = this.items[this.selectedIndex];
            rl.close();
            this.showCursor();
            resolve(selectedItem.value);
            break;

          case 'escape':
            rl.close();
            this.showCursor();
            resolve('cancel');
            break;
        }
      };

      process.stdin.on('keypress', onKeypress);

      rl.on('close', () => {
        process.stdin.removeListener('keypress', onKeypress);
      });
    });
  }

  async show(): Promise<string> {
    this.hideCursor();
    this.renderMenu();

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Enable keypress events
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    try {
      const result = await this.setupKeyHandlers(rl);
      return result;
    } finally {
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      this.showCursor();
    }
  }
}

// Helper function to create and show a custom menu
export async function showCustomMenu(
  sections: CustomMenuSection[],
  title?: string,
  subtitle?: string
): Promise<string> {
  const menu = new CustomMenu(sections, title, subtitle);
  return menu.show();
}

// Utility function for perfectly centered confirmation prompts
export async function showCenteredConfirmation(
  message: string,
  defaultValue: boolean = true
): Promise<boolean> {
  const termWidth = process.stdout.columns || 80;

  // Calculate the full prompt text to center it properly
  const yesNo = defaultValue ? '(Y/n)' : '(y/N)';
  const fullPrompt = `${message} ${yesNo}`;
  const padding = Math.max(0, Math.floor((termWidth - fullPrompt.length) / 2));

  // Display the centered prompt with better styling
  console.log(' '.repeat(padding) + chalk.bold.cyan(message) + ' ' + chalk.bold.gray(yesNo));

  // Create a small gap before the input
  console.log('');

  // Create the actual inquirer prompt with minimal formatting
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '', // Empty message since we displayed it ourselves
      default: defaultValue,
      prefix: ' '.repeat(padding) + chalk.bold.magenta('▶ '), // Use same padding with arrow
      suffix: '' // Remove any suffix
    }
  ]);

  return confirm;
}
