import inquirer from 'inquirer';
import chalk from 'chalk';
import { basename } from 'path';
import { statSync } from 'fs';
import { RepositoryDiscovery, RepositoryInfo } from './discovery';
import { Maybe } from '../core/functional';
import { format } from 'date-fns';
import { FileExplorer } from '../ui/file-explorer';
import { BeautifulTUI } from '../ui/beautiful-tui';
import stripAnsi from 'strip-ansi';
import gradientString from 'gradient-string';
import { showCenteredConfirmation } from '../ui/custom-menu';
import { showCustomMenu, CustomMenuSection } from '../ui/custom-menu';

export interface RepositorySelectionOptions {
  allowManualPath?: boolean;
  allowSearch?: boolean;
  showRecentOnly?: boolean;
  maxResults?: number;
  customSearchPaths?: string[];
}

export class RepositorySelector {
  private static readonly gradients = {
    primary: gradientString('#667eea', '#764ba2'),
    success: gradientString('#11998e', '#38ef7d'),
    info: gradientString('#2D9CDB', '#56CCF2')
  };

  /**
   * Interactive repository selection with search and discovery
   */
  static async selectRepository(): Promise<Maybe<RepositoryInfo>> {
    // Use the custom menu system for perfect control and centering
    const sections: CustomMenuSection[] = [
      {
        items: [
          {
            name: 'Use Current Directory',
            value: 'current',
            icon: '📍',
            description: 'Analyze current folder'
          },
          {
            name: 'Browse with File Explorer',
            value: 'explorer',
            icon: '📁',
            description: 'Choose folder manually'
          },
          {
            name: 'Connect to Git Repository',
            value: 'git',
            icon: '🔗',
            description: 'Clone from remote'
          },
          { name: 'Exit', value: 'cancel', icon: '🚪', description: 'Cancel selection' }
        ]
      }
    ];

    // Use the custom menu that gives us complete control over display
    const selectionMethod = await showCustomMenu(
      sections,
      'Repository Selection',
      'Choose how to connect to your repository'
    );

    switch (selectionMethod) {
      case 'explorer':
        return this.browseWithExplorer();

      case 'git':
        return this.connectToGitRepository();

      case 'current':
        return this.selectCurrentDirectory();

      case 'cancel':
        return Maybe.none();

      default:
        return Maybe.none();
    }
  }

  /**
   * Select current working directory as repository
   */
  private static async selectCurrentDirectory(): Promise<Maybe<RepositoryInfo>> {
    // Clear screen and show centered header first
    console.clear();
    const width = process.stdout.columns || 80;

    console.log('\n\n');
    const title = 'Current Directory';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + chalk.bold.hex('#667eea')(title));
    console.log('\n');

    // Create centered spinner
    const spinnerText = 'Checking current directory...';
    const spinnerPadding = Math.floor((width - spinnerText.length) / 2);
    console.log(' '.repeat(Math.max(0, spinnerPadding)) + spinnerText);

    const spinner = BeautifulTUI.createSpinner('');
    const result = await RepositoryDiscovery.getCurrentRepository();

    if (result.isSuccess()) {
      const repo = result.getValue();
      spinner.stop();

      // Prepare repository info for subtitle
      const repoInfo = this.formatRepositoryInfo(repo);

      // Use custom menu system for consistency
      const sections: CustomMenuSection[] = [
        {
          title: '✔ Current directory is a valid repository',
          items: [
            {
              name: 'Use This Repository',
              value: 'confirm',
              icon: '✅',
              description: 'Continue with this folder'
            },
            {
              name: 'Choose Different Folder',
              value: 'back',
              icon: '🔙',
              description: 'Select another repository'
            }
          ]
        }
      ];

      const choice = await showCustomMenu(sections, 'Current Directory', repoInfo);

      if (choice === 'confirm') {
        return Maybe.of(repo);
      } else {
        // Return to repository selection menu
        return this.selectRepository();
      }
    } else {
      spinner.fail(result.getError());
      return Maybe.none();
    }
  }

  /**
   * Format repository info for subtitle display
   */
  private static formatRepositoryInfo(repo: RepositoryInfo): string {
    const details = [`📁 ${repo.name}`, `📍 ${this.truncatePath(repo.path, 45)}`];

    if (repo.type && repo.type !== 'unknown') {
      details.push(`📦 ${repo.type}`);
    }

    if (repo.type === 'git' && repo.branch) {
      details.push(`🌿 ${repo.branch}`);
    }

    return details.join(' • ');
  }

  /**
   * Show repository details in a centered box
   */
  private static showRepositoryDetailsBox(repo: RepositoryInfo): void {
    const width = process.stdout.columns || 80;
    const boxWidth = 60;
    const leftPadding = Math.floor((width - boxWidth) / 2);

    const details = [
      `📁 Name: ${chalk.cyan(repo.name)}`,
      `📍 Path: ${this.truncatePath(repo.path, 45)}`
    ];

    // Only show Type if it's not "unknown"
    if (repo.type && repo.type !== 'unknown') {
      details.push(`📦 Type: ${chalk.yellow(repo.type)}`);
    }

    if (repo.type === 'git') {
      if (repo.branch) {
        details.push(`🌿 Branch: ${chalk.green(repo.branch)}`);
      }
      if (repo.remoteUrl) {
        details.push(`🔗 Remote: ${chalk.blue(this.truncateUrl(repo.remoteUrl, 40))}`);
      }
      if (repo.hasUncommittedChanges !== undefined) {
        const status = repo.hasUncommittedChanges
          ? chalk.yellow('Has uncommitted changes')
          : chalk.green('Clean');
        details.push(`📊 Status: ${status}`);
      }
    }

    details.push(`🕐 Modified: ${format(repo.lastModified, 'PPp')}`);

    // Draw box
    console.log(' '.repeat(leftPadding) + chalk.gray('┌' + '─'.repeat(boxWidth - 2) + '┐'));

    details.forEach(detail => {
      const cleanDetail = stripAnsi(detail);
      const padding = boxWidth - cleanDetail.length - 4;
      console.log(
        ' '.repeat(leftPadding) +
          chalk.gray('│ ') +
          detail +
          ' '.repeat(Math.max(0, padding)) +
          chalk.gray(' │')
      );
    });

    console.log(' '.repeat(leftPadding) + chalk.gray('└' + '─'.repeat(boxWidth - 2) + '┘'));
  }

  /**
   * Browse filesystem with file explorer
   */
  private static async browseWithExplorer(): Promise<Maybe<RepositoryInfo>> {
    const explorer = new FileExplorer({
      title: 'Select Repository Directory',
      showFiles: false,
      allowFolderSelection: true,
      startPath: process.cwd()
    });

    const selectedPath = await explorer.browse();

    if (!selectedPath) {
      return Maybe.none();
    }

    console.clear();
    const width = process.stdout.columns || 80;

    // Header
    console.log('\n\n');
    const title = 'Validating Repository';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + this.gradients.info(title));
    console.log('\n');

    const spinner = BeautifulTUI.createSpinner('Validating selected directory...');
    const result = await RepositoryDiscovery.getCurrentRepository(selectedPath);

    if (result.isSuccess()) {
      spinner.succeed('Valid repository found');

      const repo = result.getValue();
      console.log('\n');
      this.showRepositoryDetailsBox(repo);
      console.log('\n');

      return Maybe.of(repo);
    } else {
      spinner.fail(result.getError());

      // Ask if they want to initialize a new repository here
      console.log('\n');
      const initialize = await showCenteredConfirmation(
        'This is not a repository. Would you like to use it anyway?',
        false
      );

      if (initialize) {
        // Create a basic repository info
        const stat = statSync(selectedPath);
        const repoInfo: RepositoryInfo = {
          name: basename(selectedPath),
          path: selectedPath,
          type: 'unknown',
          lastModified: stat.mtime,
          size: 0 // Directory size calculation would be expensive
        };
        return Maybe.of(repoInfo);
      }

      // Return to repository selection menu
      return this.selectRepository();
    }
  }

  /**
   * Connect to a Git repository by URL or path
   */
  private static async connectToGitRepository(): Promise<Maybe<RepositoryInfo>> {
    console.clear();
    const width = process.stdout.columns || 80;

    // Header
    console.log('\n\n');
    const title = 'Connect to Git Repository';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + this.gradients.info(title));

    const subtitle = 'Enter a Git URL or local repository path';
    const subtitlePadding = Math.floor((width - subtitle.length) / 2);
    console.log(' '.repeat(Math.max(0, subtitlePadding)) + chalk.gray(subtitle));

    console.log(
      '\n' + ' '.repeat(Math.floor((width - 60) / 2)) + chalk.gray('─'.repeat(60)) + '\n'
    );

    const { repoInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'repoInput',
        message: '🔗 Repository URL or path:',
        validate: input => input.length > 0 || 'Please enter a repository URL or path',
        prefix: ' '.repeat(Math.floor((width - 40) / 2))
      }
    ]);

    // Check if it's a URL or local path
    const isUrl =
      repoInput.startsWith('http://') ||
      repoInput.startsWith('https://') ||
      repoInput.startsWith('git@') ||
      repoInput.includes('.git');

    if (isUrl) {
      // Clone the repository
      console.log('\n');
      const { targetDir } = await inquirer.prompt([
        {
          type: 'input',
          name: 'targetDir',
          message: '📁 Directory name for cloning:',
          default: this.extractRepoName(repoInput),
          validate: input => input.length > 0 || 'Please enter a directory name',
          prefix: ' '.repeat(Math.floor((width - 40) / 2))
        }
      ]);

      console.log('\n');
      const spinner = BeautifulTUI.createSpinner('Preparing to clone repository...');

      // TODO: Implement actual git clone functionality
      await new Promise(resolve => setTimeout(resolve, 1000));
      spinner.fail('Git clone functionality not yet implemented');

      console.log('\n');
      BeautifulTUI.showBox(
        [
          'Please clone the repository manually:',
          '',
          `git clone ${repoInput} ${targetDir}`,
          '',
          'Then select it using File Explorer'
        ],
        'Manual Clone Required'
      );

      console.log('\n');
      await inquirer.prompt([
        {
          type: 'input',
          name: 'continue',
          message: chalk.gray('Press Enter to continue...'),
          prefix: ' '.repeat(Math.floor((width - 30) / 2))
        }
      ]);

      return Maybe.none();
    } else {
      // Treat as local path
      console.log('\n');
      const spinner = BeautifulTUI.createSpinner('Validating repository...');
      const result = await RepositoryDiscovery.getCurrentRepository(repoInput);

      if (result.isSuccess()) {
        const repo = result.getValue();
        spinner.succeed('Valid repository found');

        console.log('\n');
        this.showRepositoryDetailsBox(repo);
        console.log('\n');

        const { confirm } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirm',
            message: ' '.repeat(Math.floor((width - 20) / 2)) + chalk.cyan('Use this repository?'),
            default: true,
            prefix: ''
          }
        ]);

        if (confirm) {
          return Maybe.of(repo);
        } else {
          // Return to repository selection menu
          return this.selectRepository();
        }
      } else {
        spinner.fail(result.getError());
        return Maybe.none();
      }
    }
  }

  /**
   * Extract repository name from URL
   */
  private static extractRepoName(url: string): string {
    // Remove .git extension if present
    const cleanUrl = url.replace(/\.git$/, '');

    // Extract the last part of the URL
    const parts = cleanUrl.split('/');
    const repoName = parts[parts.length - 1];

    // Handle SSH URLs
    if (repoName.includes(':')) {
      const sshParts = repoName.split(':');
      return sshParts[sshParts.length - 1];
    }

    return repoName || 'repository';
  }

  /**
   * Truncate path for display
   */
  private static truncatePath(path: string, maxLength: number): string {
    if (path.length <= maxLength) return chalk.gray(path);

    const parts = path.split(/[/\\]/);
    if (parts.length <= 2) return chalk.gray('...' + path.slice(-maxLength + 3));

    const result = parts[0];
    let i = parts.length - 1;

    while (i > 0 && (result + '/.../' + parts.slice(i).join('/')).length <= maxLength) {
      i--;
    }

    return chalk.gray(result + '/.../' + parts.slice(i + 1).join('/'));
  }

  /**
   * Truncate URL for display
   */
  private static truncateUrl(url: string, maxLength: number): string {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength - 3) + '...';
  }
}
