import chalk from 'chalk';

export class AnimatedComponents {
  /**
   * Animated loading dots
   */
  static async loadingDots(message: string, duration: number = 3000): Promise<void> {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;

    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(frames[i])} ${message}`);
      i = (i + 1) % frames.length;
    }, 80);

    return new Promise(resolve => {
      setTimeout(() => {
        clearInterval(interval);
        process.stdout.write('\r' + ' '.repeat(message.length + 4) + '\r');
        resolve();
      }, duration);
    });
  }

  /**
   * Typewriter effect for text
   */
  static async typewriter(text: string, speed: number = 50): Promise<void> {
    for (const char of text) {
      process.stdout.write(char);
      await new Promise(resolve => setTimeout(resolve, speed));
    }
    console.log();
  }

  /**
   * Animated progress bar
   */
  static async animatedProgress(
    label: string,
    duration: number = 3000,
    width: number = 40
  ): Promise<void> {
    const startTime = Date.now();

    return new Promise(resolve => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const filled = Math.floor(width * progress);
        const empty = width - filled;

        const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
        const percentage = Math.floor(progress * 100);

        process.stdout.write(`\r${label} ${bar} ${percentage}%`);

        if (progress >= 1) {
          clearInterval(interval);
          console.log();
          resolve();
        }
      }, 50);
    });
  }

  /**
   * Rainbow text animation
   */
  static rainbow(text: string): string {
    const colors = [chalk.red, chalk.yellow, chalk.green, chalk.cyan, chalk.blue, chalk.magenta];

    return text
      .split('')
      .map((char, i) => {
        const color = colors[i % colors.length];
        return color(char);
      })
      .join('');
  }

  /**
   * Pulse effect for important messages
   */
  static async pulse(text: string, times: number = 3): Promise<void> {
    for (let i = 0; i < times; i++) {
      process.stdout.write('\r' + chalk.dim(text));
      await new Promise(resolve => setTimeout(resolve, 200));
      process.stdout.write('\r' + chalk.bold(text));
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log();
  }

  /**
   * Matrix-style falling characters
   */
  static async matrix(duration: number = 3000): Promise<void> {
    const width = process.stdout.columns || 80;
    const height = 10;
    const matrix: string[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(' '));

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()';
    const columns = Array(width).fill(0);

    console.clear();
    const startTime = Date.now();

    const interval = setInterval(() => {
      // Update matrix
      for (let x = 0; x < width; x++) {
        if (Math.random() < 0.1) {
          columns[x] = 0;
        }

        const y = columns[x];
        if (y < height) {
          matrix[y][x] = chars[Math.floor(Math.random() * chars.length)];
          columns[x]++;
        }
      }

      // Render matrix
      console.clear();
      for (let y = 0; y < height; y++) {
        let line = '';
        for (let x = 0; x < width; x++) {
          const char = matrix[y][x];
          const age = columns[x] - y;

          if (age === 1) {
            line += chalk.white.bold(char);
          } else if (age === 2) {
            line += chalk.green.bold(char);
          } else if (age > 2 && age < 6) {
            line += chalk.green(char);
          } else {
            line += chalk.green.dim(char);
          }
        }
        console.log(line);
      }

      if (Date.now() - startTime > duration) {
        clearInterval(interval);
        console.clear();
      }
    }, 100);

    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }

  /**
   * Animated border box
   */
  static animatedBox(content: string, title?: string): void {
    const lines = content.split('\n');
    const maxLength = Math.max(...lines.map(l => l.length), title?.length || 0);
    const width = maxLength + 4;

    // Animated border characters
    const borders = {
      topLeft: chalk.cyan('╔'),
      topRight: chalk.cyan('╗'),
      bottomLeft: chalk.cyan('╚'),
      bottomRight: chalk.cyan('╝'),
      horizontal: chalk.cyan('═'),
      vertical: chalk.cyan('║')
    };

    // Top border
    let top = borders.topLeft + borders.horizontal.repeat(width - 2) + borders.topRight;
    if (title) {
      const titleStart = Math.floor((width - title.length - 2) / 2);
      top =
        top.substring(0, titleStart) +
        chalk.yellow.bold(` ${title} `) +
        top.substring(titleStart + title.length + 2);
    }
    console.log(top);

    // Content
    lines.forEach(line => {
      const padding = width - line.length - 4;
      console.log(borders.vertical + ' ' + line + ' '.repeat(padding + 1) + borders.vertical);
    });

    // Bottom border
    console.log(borders.bottomLeft + borders.horizontal.repeat(width - 2) + borders.bottomRight);
  }

  /**
   * Countdown timer
   */
  static async countdown(seconds: number, message: string = 'Starting in'): Promise<void> {
    for (let i = seconds; i > 0; i--) {
      process.stdout.write(`\r${chalk.yellow(message)} ${chalk.bold.red(i)}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    process.stdout.write('\r' + ' '.repeat(message.length + 10) + '\r');
  }

  /**
   * Animated menu with hover effects
   */
  static async animatedMenu(
    title: string,
    choices: Array<{ name: string; value: string; description?: string }>
  ): Promise<string> {
    console.log(chalk.cyan.bold(`\n${title}\n`));

    // Display choices with animations
    for (let i = 0; i < choices.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      const prefix = chalk.cyan(`[${i + 1}]`);
      const name = chalk.white(choices[i].name);
      const desc = choices[i].description ? chalk.gray(` - ${choices[i].description}`) : '';
      console.log(`  ${prefix} ${name}${desc}`);
    }

    // Note: In a real implementation, this would handle keyboard input
    // For now, returning a placeholder
    return choices[0].value;
  }

  /**
   * Success animation
   */
  static async success(message: string): Promise<void> {
    const checkmark = chalk.green('✓');
    const frames = ['◐', '◓', '◑', '◒'];

    for (const frame of frames) {
      process.stdout.write(`\r${chalk.yellow(frame)} ${message}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    process.stdout.write(`\r${checkmark} ${chalk.green(message)}\n`);
  }

  /**
   * Error animation
   */
  static async error(message: string): Promise<void> {
    const cross = chalk.red('✗');

    for (let i = 0; i < 3; i++) {
      process.stdout.write(`\r${chalk.red('!')} ${chalk.dim(message)}`);
      await new Promise(resolve => setTimeout(resolve, 150));
      process.stdout.write(`\r${chalk.red.bold('!')} ${chalk.red(message)}`);
      await new Promise(resolve => setTimeout(resolve, 150));
    }

    process.stdout.write(`\r${cross} ${chalk.red(message)}\n`);
  }
}
