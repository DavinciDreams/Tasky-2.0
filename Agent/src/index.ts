#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';

// Import core modules
import {
  RepoContext,
  TaskSchema,
  Task,
  Priority,
  TaskStatus,
  AgentType,
  IssueCategory
} from './core/types';
import { RepositoryAnalyzer } from './repository/analyzer';
import { TaskBuilder } from './tasks/builder';
import { TaskStore } from './tasks/task-store';
import { TaskManagerUI } from './ui/task-manager';
import { LooperEngine } from './core/looper-engine';
import { TUI } from './ui/tui';
import { BeautifulTUI } from './ui/beautiful-tui';
import { NavigationUI } from './ui/navigation';

// ============================================================================
// CLI COMMANDS
// ============================================================================

class CLI {
  private program = new Command();
  private taskStore = TaskStore.getInstance();
  private repoContext?: RepoContext;
  private looperEngine: LooperEngine;

  constructor() {
    this.looperEngine = new LooperEngine([], undefined, process.cwd(), { useMockExecutors: false });
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('looper')
      .description('Looper CLI - Intelligent Task Management System')
      .version('1.0.0');

    this.program
      .command('init [path]')
      .description('Initialize Looper CLI in repository')
      .action(this.initCommand.bind(this));

    this.program
      .command('add')
      .description('Add a new task interactively')
      .action(this.addCommand.bind(this));

    this.program
      .command('list')
      .description('List all tasks')
      .option('-s, --status <status>', 'Filter by status')
      .action(this.listCommand.bind(this));

    this.program
      .command('run [taskId]')
      .description('Execute a task or next pending task')
      .action(this.runCommand.bind(this));

    this.program
      .command('execute <taskId>')
      .description('Execute a specific task programmatically (non-interactive)')
      .option('-a, --agent <agent>', 'Agent to use: claude, gemini, or smart (default: smart)')
      .option(
        '-m, --mode <mode>',
        'Execution mode: simple, real, terminal, or mock (default: simple)'
      )
      .action(this.executeCommand.bind(this));

    this.program
      .command('run-next-mcp <taskId>')
      .description('Execute a task in non-interactive MCP mode (auto-selects Claude Code)')
      .action(this.runNextMcpCommand.bind(this));

    this.program
      .command('auto')
      .description('Auto-process all pending tasks')
      .action(this.autoCommand.bind(this));

    this.program
      .command('refresh')
      .description('Refresh tasks from file (sync external changes)')
      .action(this.refreshCommand.bind(this));

    this.program
      .command('status')
      .description('Show system status')
      .action(this.statusCommand.bind(this));

    this.program
      .command('tui')
      .description('Launch interactive TUI mode')
      .action(this.tuiCommand.bind(this));

    this.program
      .command('tasks')
      .description('Open task manager')
      .action(this.tasksCommand.bind(this));

    // Handle cleanup on exit
    process.on('SIGINT', this.cleanup.bind(this));
    process.on('SIGTERM', this.cleanup.bind(this));
    process.on('exit', this.cleanup.bind(this));
  }

  async initCommand(path?: string): Promise<void> {
    // If path is provided, use it directly
    if (path) {
      const spinner = TUI.progress('Analyzing repository...');
      const result = await RepositoryAnalyzer.analyze(path);

      if (result.isSuccess()) {
        this.repoContext = result.getValue();
        const tasks = await this.taskStore.getAll();
        this.looperEngine = new LooperEngine(tasks, this.repoContext, path, {
          useMockExecutors: false
        });

        spinner.succeed('Repository analysis complete');

        TUI.section(
          'Repository Overview',
          `Path: ${this.repoContext.rootPath}\n` +
            `Type: ${this.repoContext.projectType}\n` +
            `Branch: ${this.repoContext.currentBranch}\n` +
            `Modified Files: ${this.repoContext.modifiedFiles.length}`
        );
      } else {
        spinner.fail('Repository analysis failed');
        TUI.status(result.getError(), 'error');
      }
      return;
    }

    // Otherwise, use the interactive repository selector
    const { RepositorySelector } = await import('./repository/selector');
    const selectedRepo = await RepositorySelector.selectRepository();

    if (selectedRepo.isSome()) {
      const repo = selectedRepo.getOrElse(null as any);

      // Analyze repository silently without UI clutter
      const result = await RepositoryAnalyzer.analyze(repo.path);

      if (result.isSuccess()) {
        this.repoContext = result.getValue();
        const tasks = await this.taskStore.getAll();
        this.looperEngine = new LooperEngine(tasks, this.repoContext, repo.path, {
          useMockExecutors: false
        });

        // Track this repository as recently used
        const { RecentRepositoryManager } = await import('./repository/recent');
        RecentRepositoryManager.addRecentRepository(repo);
      } else {
        BeautifulTUI.showError('Repository analysis failed: ' + result.getError());
      }
    }
  }

  async addCommand(): Promise<void> {
    if (!this.repoContext) {
      TUI.status('Please run "looper init" first', 'error');
      return;
    }

    const taskSchema = await TaskBuilder.buildInteractively(this.repoContext);

    if (taskSchema.isSome()) {
      const schema = taskSchema.getOrElse({} as TaskSchema);
      const result = await this.taskStore.create(schema);

      if (result.isSuccess()) {
        BeautifulTUI.showSuccess(`Task "${schema.title}" created successfully!`);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } else {
        BeautifulTUI.showError(result.getError());
      }
    }
  }

  async listCommand(options: { status?: string }): Promise<void> {
    const query: any = {};
    if (options.status) {
      query.status = options.status.toUpperCase();
    }

    const tasks = await this.taskStore.getAll();
    const filteredTasks = options.status
      ? tasks.filter(t => t.status === options.status!.toUpperCase())
      : tasks;

    if (filteredTasks.length === 0) {
      BeautifulTUI.showHeader('Task List');
      BeautifulTUI.showInfo('No tasks found');
      BeautifulTUI.showStats(tasks);
      return;
    }

    // Use beautiful task list display
    console.clear();
    BeautifulTUI.showHeader('Task List', `${filteredTasks.length} tasks`);

    // Group by status
    const grouped = filteredTasks.reduce(
      (acc, task) => {
        if (!acc[task.status]) acc[task.status] = [];
        acc[task.status].push(task);
        return acc;
      },
      {} as Record<string, Task[]>
    );

    // Display each group
    Object.entries(grouped).forEach(([status, statusTasks]) => {
      console.log('\n' + chalk.yellow(`── ${this.getStatusTitle(status)} ──`));
      statusTasks.forEach(task => {
        const icon = this.getStatusIcon(task.status);
        const priority = this.getPriorityBadge(task.schema.priority || Priority.MEDIUM);
        console.log(
          `  ${icon} ${chalk.cyan(task.schema.id.slice(-8))} ${priority} ${task.schema.title}`
        );
      });
    });

    console.log('\n');
    BeautifulTUI.showStats(tasks);
  }

  async runCommand(taskId?: string): Promise<void> {
    // Initialize repository context if not already set
    if (!this.repoContext) {
      console.log(chalk.yellow('🔍 Initializing repository context...'));
      const result = await RepositoryAnalyzer.analyze(process.cwd());

      if (result.isSuccess()) {
        this.repoContext = result.getValue();
        const tasks = await this.taskStore.getAll();
        this.looperEngine = new LooperEngine(tasks, this.repoContext, process.cwd(), {
          useMockExecutors: false
        });
      } else {
        // If repository analysis fails, we can still run tasks without full context
        console.log(chalk.yellow('⚠️  Repository analysis failed, running in basic mode'));
        this.looperEngine = new LooperEngine([], undefined, process.cwd(), {
          useMockExecutors: false
        });
      }
    }

    const tasks = await this.taskStore.getAll();
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);

    if (pendingTasks.length === 0) {
      BeautifulTUI.showInfo('No pending tasks to execute');
      return;
    }

    let task: Task | undefined;

    if (taskId) {
      const maybeTask = await this.taskStore.get(taskId);
      task = maybeTask.getOrElse(undefined as any);
    } else {
      // Show task selection menu using our custom menu system
      const selectedId = await NavigationUI.showTaskSelectionMenu(pendingTasks);
      if (!selectedId) return;

      const maybeTask = await this.taskStore.get(selectedId);
      task = maybeTask.getOrElse(undefined as any);
    }

    if (!task) {
      BeautifulTUI.showError('Task not found');
      return;
    }

    // Execute the task with streamlined flow - direct from task selection to agent selection to execution
    await this.executeTaskWithLooper(task);
  }

  /**
   * Execute a task with streamlined flow - direct from task selection to agent selection to execution
   */
  private async executeTaskWithLooper(task: Task): Promise<void> {
    // AGENT SELECTION - Direct to agent selection (previously DECIDE phase)
    const agent = await this.showAgentSelectionMenu(task);
    if (!agent) return;

    // ACT Phase - Execute the task
    const actResult = await this.showLooperPhase(
      'ACT',
      `Executing task with ${agent}...`,
      async () => {
        const executionResult = await this.looperEngine.act(task, agent);
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (executionResult.isSuccess()) {
          return executionResult.getValue();
        } else {
          throw new Error(executionResult.getError());
        }
      }
    );

    if (actResult) {
      await this.showExecutionResults(task, agent, actResult);
    }
  }

  /**
   * Execute a task automatically with no manual interaction (for auto-process mode)
   */
  private async executeTaskAutomatically(
    task: Task,
    agentStrategy: string = 'smart'
  ): Promise<boolean> {
    // Auto-approve the task
    if (!task.humanApproved) {
      await this.taskStore.update(task.schema.id, { humanApproved: true });
      task.humanApproved = true;
    }

    // Select agent based on strategy
    let agent: AgentType;
    if (agentStrategy === 'claude') {
      agent = AgentType.CLAUDE_CODE;
    } else if (agentStrategy === 'gemini') {
      agent = AgentType.GEMINI_CLI;
    } else {
      // Smart selection based on task complexity
      agent = this.selectAgentAutomatically(task);
    }

    console.log(
      chalk.blue(`  → Agent: ${agent === AgentType.CLAUDE_CODE ? 'Claude Code' : 'Gemini CLI'}`)
    );
    if (agentStrategy === 'smart') {
      console.log(chalk.gray(`  → Auto-selected based on task complexity`));
    } else {
      console.log(chalk.gray(`  → Using configured strategy: ${agentStrategy}`));
    }

    // Execute the task
    const spinner = BeautifulTUI.createSpinner(`Executing with ${agent}...`);

    try {
      const executionResult = await this.looperEngine.act(task, agent);

      if (executionResult.isSuccess()) {
        const result = executionResult.getValue();
        spinner.succeed(`Task executed successfully!`);

        // Auto-accept successful results
        await this.taskStore.update(task.schema.id, {
          status: TaskStatus.COMPLETED,
          assignedAgent: agent,
          result: result
        });

        console.log(chalk.green(`  ✓ Task completed and auto-accepted`));
        return true;
      } else {
        const error = executionResult.getError();
        spinner.fail(`Task execution failed: ${error}`);

        // Mark for review on failure
        await this.taskStore.update(task.schema.id, {
          status: TaskStatus.NEEDS_REVIEW,
          assignedAgent: agent,
          result: `Failed: ${error}`
        });

        console.log(chalk.yellow(`  ⚠ Task marked for manual review`));
        return false;
      }
    } catch (error) {
      spinner.fail(`Unexpected error: ${error}`);

      // Mark for review on error
      await this.taskStore.update(task.schema.id, {
        status: TaskStatus.NEEDS_REVIEW,
        assignedAgent: agent,
        result: `Error: ${error}`
      });

      console.log(chalk.red(`  ✗ Task failed with error, marked for review`));
      return false;
    }
  }

  /**
   * Automatically select the best agent for a task based on its characteristics
   */
  private selectAgentAutomatically(task: Task): AgentType {
    // Decision logic based on task properties
    const title = task.schema.title.toLowerCase();
    const description = (task.schema.description || '').toLowerCase();
    const category = task.schema.category;
    const priority = task.schema.priority || Priority.MEDIUM;

    // Complex tasks that likely need Claude
    const needsClaude =
      priority === Priority.CRITICAL ||
      priority === Priority.HIGH ||
      category === IssueCategory.BACKEND ||
      category === IssueCategory.DATABASE ||
      (task.schema.affectedFiles && task.schema.affectedFiles.length > 5) ||
      title.includes('refactor') ||
      title.includes('architecture') ||
      title.includes('complex') ||
      title.includes('analyze') ||
      description.includes('complex') ||
      description.includes('multiple files');

    // Simple tasks suitable for Gemini
    const canUseGemini =
      category === IssueCategory.CONFIG ||
      category === IssueCategory.FRONTEND ||
      title.includes('fix') ||
      title.includes('update') ||
      title.includes('simple') ||
      title.includes('quick') ||
      title.includes('minor') ||
      (task.schema.affectedFiles && task.schema.affectedFiles.length <= 2);

    // Default to Claude for complex tasks, Gemini for simple ones
    if (needsClaude && !canUseGemini) {
      return AgentType.CLAUDE_CODE;
    } else if (canUseGemini && !needsClaude) {
      return AgentType.GEMINI_CLI;
    } else {
      // When in doubt, use Claude for better results
      return AgentType.CLAUDE_CODE;
    }
  }

  /**
   * Show a Looper phase with beautiful UI
   */
  private async showLooperPhase<T>(
    phaseName: string,
    description: string,
    action: () => Promise<T>
  ): Promise<T | null> {
    const phaseColors = {
      OBSERVE: '#3b82f6', // Blue
      ORIENT: '#8b5cf6', // Purple
      DECIDE: '#f59e0b', // Orange
      ACT: '#10b981' // Green
    };

    console.clear();
    const width = process.stdout.columns || 80;

    // Centered header
    console.log('\n');
    const title = `Looper Execution - ${phaseName}`;
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(
      ' '.repeat(Math.max(0, titlePadding)) +
        chalk.bold.hex(phaseColors[phaseName as keyof typeof phaseColors] || '#667eea')(title)
    );

    // Separator
    const separatorWidth = 50;
    const separatorPadding = Math.floor((width - separatorWidth) / 2);
    console.log(
      ' '.repeat(Math.max(0, separatorPadding)) + chalk.hex('#30363d')('═'.repeat(separatorWidth))
    );

    console.log('\n');

    // Centered description
    const descPadding = Math.floor((width - description.length) / 2);
    console.log(' '.repeat(Math.max(0, descPadding)) + chalk.hex('#6b7280')(description));
    console.log('\n');

    const spinner = BeautifulTUI.createSpinner(`${phaseName}: Processing...`);

    try {
      const result = await action();
      spinner.succeed(
        `${phaseName}: ${typeof result === 'string' ? result : 'Completed successfully'}`
      );

      // Brief pause to show result
      await new Promise(resolve => setTimeout(resolve, 1000));
      return result;
    } catch (error) {
      spinner.fail(`${phaseName}: ${error instanceof Error ? error.message : 'Failed'}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return null;
    }
  }

  /**
   * Show streamlined agent selection menu
   */
  private async showAgentSelectionMenu(task: Task): Promise<AgentType | null> {
    const sections: any[] = [
      {
        title: 'Select AI Agent',
        items: [
          {
            name: 'Claude Code',
            value: AgentType.CLAUDE_CODE,
            icon: '🤖',
            description: 'Advanced analysis & complex tasks'
          },
          {
            name: 'Gemini CLI',
            value: AgentType.GEMINI_CLI,
            icon: '🧠',
            description: 'Quick fixes & simple operations'
          }
        ]
      },
      {
        items: [
          {
            name: 'Cancel Execution',
            value: 'cancel',
            icon: '❌',
            description: 'Abort task execution'
          }
        ]
      }
    ];

    const taskInfo = `${task.schema.title} • ${task.schema.category}`;
    const { showCustomMenu } = await import('./ui/custom-menu');
    const result = await showCustomMenu(sections, 'Agent Selection', taskInfo);

    return result === 'cancel' ? null : (result as AgentType);
  }

  /**
   * Show execution results with enhanced UI
   */
  private async showExecutionResults(task: Task, agent: AgentType, result: string): Promise<void> {
    console.clear();
    const width = process.stdout.columns || 80;

    // Success header
    console.log('\n');
    const title = '✅ Task Execution Complete';
    const titlePadding = Math.floor((width - title.length) / 2);
    console.log(' '.repeat(Math.max(0, titlePadding)) + chalk.bold.green(title));

    // Separator
    const separatorWidth = 60;
    const separatorPadding = Math.floor((width - separatorWidth) / 2);
    console.log(
      ' '.repeat(Math.max(0, separatorPadding)) + chalk.green('═'.repeat(separatorWidth))
    );

    console.log('\n');

    // Task info
    console.log(chalk.bold.white('Task: ') + chalk.cyan(task.schema.title));
    console.log(chalk.bold.white('Agent: ') + chalk.yellow(agent));
    console.log(chalk.bold.white('Status: ') + chalk.green('COMPLETED'));

    console.log('\n' + chalk.bold.white('Execution Result:'));
    console.log(chalk.hex('#30363d')('─'.repeat(60)));
    console.log(chalk.white(result));
    console.log(chalk.hex('#30363d')('─'.repeat(60)));

    // Show acceptance menu
    const sections: any[] = [
      {
        title: 'Accept Execution Result?',
        items: [
          {
            name: 'Accept & Complete Task',
            value: 'accept',
            icon: '✅',
            description: 'Mark task as completed'
          },
          {
            name: 'Mark for Review',
            value: 'review',
            icon: '🔍',
            description: 'Requires manual review'
          },
          {
            name: 'Reject & Retry',
            value: 'reject',
            icon: '❌',
            description: 'Try again with different agent'
          }
        ]
      }
    ];

    const { showCustomMenu } = await import('./ui/custom-menu');
    const decision = await showCustomMenu(sections, 'Review Results', '');

    switch (decision) {
      case 'accept':
        await this.taskStore.update(task.schema.id, {
          status: TaskStatus.COMPLETED,
          assignedAgent: agent,
          result: result
        });
        BeautifulTUI.showSuccess('Task completed successfully!');
        break;
      case 'review':
        await this.taskStore.update(task.schema.id, {
          status: TaskStatus.NEEDS_REVIEW,
          assignedAgent: agent,
          result: result
        });
        BeautifulTUI.showWarning('Task marked for review');
        break;
      case 'reject':
        // Reset task status to PENDING so it can be tried again
        await this.taskStore.update(task.schema.id, {
          status: TaskStatus.PENDING
        });
        // Manually clear the assigned agent and result
        const rejectedTask = await this.taskStore.get(task.schema.id);
        if (rejectedTask.isSome()) {
          const taskToReset = rejectedTask.getOrElse(null as any);
          if (taskToReset) {
            delete taskToReset.assignedAgent;
            delete taskToReset.result;
          }
        }
        BeautifulTUI.showInfo('Task execution rejected - task reset to pending status');
        break;
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  async autoCommand(): Promise<void> {
    const tasks = await this.taskStore.getAll();
    const pendingTasks = tasks.filter(t => t.status === TaskStatus.PENDING);

    if (pendingTasks.length === 0) {
      BeautifulTUI.showInfo('No pending tasks to process');
      return;
    }

    const confirm = await NavigationUI.showConfirmation(
      'Auto-Process Tasks',
      `This will automatically process ${pendingTasks.length} pending tasks.\nAll tasks will be auto-approved and results auto-accepted.\nAre you sure you want to continue?`,
      { type: 'warning' }
    );

    if (!confirm) return;

    // Ask for agent preference
    const { agentStrategy, executorMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'agentStrategy',
        message: 'Select agent strategy for auto-processing:',
        choices: [
          {
            name: '🧠 Smart Selection (Recommended) - Choose agent based on task complexity',
            value: 'smart'
          },
          { name: '🤖 Always use Claude Code - Best for complex tasks', value: 'claude' },
          { name: '⚡ Always use Gemini CLI - Faster for simple tasks', value: 'gemini' }
        ],
        default: 'smart'
      },
      {
        type: 'list',
        name: 'executorMode',
        message: 'Select execution mode:',
        choices: [
          {
            name: '🔧 Simple File Executor - Actually performs basic file operations (create folders/files)',
            value: 'simple'
          },
          {
            name: '🤖 Real AI Agents - Use actual Claude/Gemini CLI (requires API access)',
            value: 'real'
          },
          {
            name: '🧪 Mock Executors - Simulate execution for testing (no real work)',
            value: 'mock'
          }
        ],
        default: 'simple'
      }
    ]);

    // Initialize repository context if needed
    if (!this.repoContext) {
      console.log(chalk.yellow('🔍 Initializing repository context...'));
      const result = await RepositoryAnalyzer.analyze(process.cwd());
      if (result.isSuccess()) {
        this.repoContext = result.getValue();
        const allTasks = await this.taskStore.getAll();
        // IMPORTANT: Use in-process executors for auto-mode to ensure proper sequential execution
        this.looperEngine = new LooperEngine(allTasks, this.repoContext, process.cwd(), {
          useMockExecutors: executorMode === 'mock'
        });
        // Force use of in-process executors for sequential execution
        const { AgentExecutorFactory } = await import('./core/agent-executor');
        AgentExecutorFactory.useInProcessExecutors();
      }
    } else {
      // Force use of in-process executors for sequential execution
      const { AgentExecutorFactory } = await import('./core/agent-executor');
      AgentExecutorFactory.useInProcessExecutors();
    }

    // Use mock executors if requested (for testing or when hitting API limits)
    if (executorMode === 'mock') {
      const { AgentExecutorFactory } = await import('./core/agent-executor');
      AgentExecutorFactory.useMockExecutors();
    } else if (executorMode === 'simple') {
      const { AgentExecutorFactory } = await import('./core/agent-executor');
      AgentExecutorFactory.useSimpleFileExecutors();
    } else if (executorMode === 'real') {
      const { AgentExecutorFactory } = await import('./core/agent-executor');
      AgentExecutorFactory.useTerminalExecutors();
    }
    // For 'real' mode, we already set up in-process executors above

    console.clear();
    BeautifulTUI.showHeader('Auto-Processing', `${pendingTasks.length} tasks`);

    const executorModeText =
      executorMode === 'mock' ? 'mock' : executorMode === 'simple' ? 'simple file' : 'in-process';
    console.log(
      chalk.yellow(
        `\n🤖 Fully Automated Mode - Sequential execution with ${executorModeText} agents\n`
      )
    );
    console.log(
      chalk.blue(
        `Agent Strategy: ${agentStrategy === 'smart' ? 'Smart Selection' : agentStrategy === 'claude' ? 'Claude Code' : 'Gemini CLI'}\n`
      )
    );

    if (executorMode === 'mock') {
      console.log(
        chalk.gray('📝 Using mock executors for testing - no real AI calls will be made\n')
      );
    } else if (executorMode === 'simple') {
      console.log(
        chalk.green('🔧 Using simple file executors - will actually create folders and files\n')
      );
    } else {
      console.log(chalk.blue('🤖 Using real AI agents - requires API access and quotas\n'));
    }

    let processed = 0;
    let successful = 0;
    let failed = 0;

    // Process tasks sequentially - one at a time
    for (const task of pendingTasks) {
      console.log(chalk.cyan(`\n📋 Processing Task ${processed + 1}/${pendingTasks.length}`));
      console.log(chalk.white(`  → Title: ${task.schema.title}`));
      console.log(
        chalk.gray(
          `  → Category: ${task.schema.category} | Priority: ${task.schema.priority || Priority.MEDIUM}`
        )
      );

      // Wait for each task to complete before starting the next one
      const success = await this.executeTaskAutomatically(task, agentStrategy);
      processed++;

      if (success) {
        successful++;
        console.log(chalk.green(`  ✅ Task ${processed} completed successfully`));
      } else {
        failed++;
        console.log(chalk.yellow(`  ⚠️ Task ${processed} needs manual review`));
      }

      if (processed < pendingTasks.length) {
        console.log('\n' + chalk.gray('─'.repeat(60)));
        // Brief pause between tasks
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n' + chalk.cyan('═'.repeat(60)) + '\n');
    BeautifulTUI.showSuccess(`Auto-processing complete!`);
    console.log(chalk.white(`  📊 Total processed: ${processed}`));
    console.log(chalk.green(`  ✅ Successful: ${successful}`));
    if (failed > 0) {
      console.log(chalk.yellow(`  ⚠️  Need review: ${failed}`));
    }
    console.log('\n' + chalk.gray('Tasks requiring manual review can be found in Task Manager.'));

    // Reset to terminal executors after auto-processing
    const { AgentExecutorFactory } = await import('./core/agent-executor');
    AgentExecutorFactory.useTerminalExecutors();
  }

  async statusCommand(): Promise<void> {
    const stats = await this.taskStore.getStatistics();

    console.clear();
    BeautifulTUI.showHeader('System Status');

    // Repository info
    if (this.repoContext) {
      console.log(chalk.yellow('── Repository ──'));
      console.log(`  📁 Path: ${chalk.cyan(this.repoContext.rootPath)}`);
      console.log(`  🌿 Branch: ${chalk.green(this.repoContext.currentBranch)}`);
      console.log(`  📦 Type: ${chalk.blue(this.repoContext.projectType)}`);
      console.log(`  📝 Modified: ${chalk.yellow(this.repoContext.modifiedFiles.length)} files\n`);
    }

    // Task statistics
    console.log(chalk.yellow('── Task Statistics ──'));
    console.log(`  📊 Total Tasks: ${chalk.bold(stats.total)}`);
    console.log(`  ✅ Completed: ${chalk.green(stats.byStatus.COMPLETED || 0)}`);
    console.log(`  ⏳ Pending: ${chalk.yellow(stats.byStatus.PENDING || 0)}`);
    console.log(`  🚨 Review: ${chalk.magenta(stats.byStatus.NEEDS_REVIEW || 0)}`);
    console.log(`  📈 Completion Rate: ${chalk.bold(stats.completionRate.toFixed(1) + '%')}\n`);

    // Priority breakdown
    console.log(chalk.yellow('── Priority Breakdown ──'));
    console.log(`  🔥 Critical: ${chalk.red(stats.byPriority[Priority.CRITICAL] || 0)}`);
    console.log(`  🔴 High: ${chalk.red(stats.byPriority[Priority.HIGH] || 0)}`);
    console.log(`  🟡 Medium: ${chalk.yellow(stats.byPriority[Priority.MEDIUM] || 0)}`);
    console.log(`  🟢 Low: ${chalk.green(stats.byPriority[Priority.LOW] || 0)}\n`);

    BeautifulTUI.showDivider();
  }

  async tasksCommand(): Promise<void> {
    const taskManagerUI = new TaskManagerUI();
    await taskManagerUI.showMenu();
  }

  async tuiCommand(): Promise<void> {
    // Force repository selection if not already initialized
    if (!this.repoContext) {
      await this.initCommand();
      // If still no repo context after init, exit
      if (!this.repoContext) {
        BeautifulTUI.showError('Repository selection is required to continue.');
        return;
      }
      // Add a small delay and clear screen to ensure clean transition
      await new Promise(resolve => setTimeout(resolve, 500));
      console.clear();
    }

    // Main TUI loop
    while (true) {
      const tasks = await this.taskStore.getAll();
      const stats = await this.taskStore.getStatistics();

      const menuContext: { repoPath?: string; taskCount?: number; stats?: any } = {};
      if (this.repoContext?.rootPath) {
        menuContext.repoPath = this.repoContext.rootPath;
      }
      menuContext.taskCount = tasks.length;
      menuContext.stats = {
        total: stats.total,
        pending: stats.byStatus.PENDING || 0,
        completed: stats.byStatus.COMPLETED || 0
      };

      const action = await NavigationUI.showMainMenu(menuContext);

      switch (action) {
        case 'tasks':
          await this.tasksCommand();
          break;
        case 'run':
          await this.runCommand();
          break;
        case 'auto':
          await this.autoCommand();
          await this.waitForKey();
          break;
        case 'init':
          await this.initCommand();
          break;
        case 'exit':
          const confirmExit = await NavigationUI.showConfirmation(
            'Exit Looper CLI',
            'Are you sure you want to exit?',
            { type: 'info', defaultValue: true }
          );
          if (confirmExit) {
            console.clear();
            BeautifulTUI.showGoodbye();
            return;
          }
          break;
      }
    }
  }

  private async waitForKey(): Promise<void> {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray('Press Enter to continue...'),
        prefix: ''
      }
    ]);
  }

  private getStatusIcon(status: TaskStatus): string {
    const icons = {
      [TaskStatus.PENDING]: '⏳',
      [TaskStatus.COMPLETED]: '✅',
      [TaskStatus.NEEDS_REVIEW]: '🚨'
    };
    return icons[status] || '❓';
  }

  private getStatusTitle(status: string): string {
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

  private getPriorityBadge(priority: Priority): string {
    const badges = {
      [Priority.CRITICAL]: chalk.bgRed.white.bold(' CRITICAL '),
      [Priority.HIGH]: chalk.bgRed.white(' HIGH '),
      [Priority.MEDIUM]: chalk.bgYellow.black(' MEDIUM '),
      [Priority.LOW]: chalk.bgGreen.black(' LOW ')
    };
    return badges[priority] || '';
  }

  async refreshCommand(): Promise<void> {
    console.clear();
    BeautifulTUI.showHeader('Refreshing Tasks');

    const spinner = BeautifulTUI.createSpinner('Syncing with tasks file...');

    try {
      const result = await this.taskStore.refresh();

      if (result.isSuccess()) {
        const changedCount = result.getValue();
        if (changedCount > 0) {
          spinner.succeed(`Tasks refreshed! ${changedCount} changes detected.`);
        } else {
          spinner.succeed('Tasks are already up to date.');
        }
      } else {
        spinner.fail(`Refresh failed: ${result.getError()}`);
      }
    } catch (error) {
      spinner.fail(`Refresh error: ${error}`);
    }

    // Show current stats
    const stats = await this.taskStore.getStatistics();
    console.log('\n' + chalk.cyan('Current Status:'));
    console.log(`  📊 Total Tasks: ${chalk.bold(stats.total)}`);
    console.log(`  ⏳ Pending: ${chalk.yellow(stats.byStatus.PENDING || 0)}`);
    console.log(`  ✅ Completed: ${chalk.green(stats.byStatus.COMPLETED || 0)}`);
    console.log(
      `  🔄 File Watching: ${chalk.blue(this.taskStore.isWatchingFile() ? 'Enabled' : 'Disabled')}`
    );

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Clean up resources before exit
   */
  private cleanup(): void {
    console.log('\n🧹 Cleaning up...');
    this.taskStore.destroy();
  }

  async executeCommand(taskId: string, options: { agent?: string; mode?: string }): Promise<void> {
    // Initialize repository context if not already set
    if (!this.repoContext) {
      console.log(chalk.yellow('🔍 Initializing repository context...'));
      const result = await RepositoryAnalyzer.analyze(process.cwd());

      if (result.isSuccess()) {
        this.repoContext = result.getValue();
        const tasks = await this.taskStore.getAll();
        this.looperEngine = new LooperEngine(tasks, this.repoContext, process.cwd(), {
          useMockExecutors: options.mode === 'mock'
        });
      } else {
        // If repository analysis fails, we can still run tasks without full context
        console.log(chalk.yellow('⚠️  Repository analysis failed, running in basic mode'));
        this.looperEngine = new LooperEngine([], undefined, process.cwd(), {
          useMockExecutors: options.mode === 'mock'
        });
      }
    }

    // Configure executors based on mode
    const { AgentExecutorFactory } = await import('./core/agent-executor');
    if (options.mode === 'mock') {
      AgentExecutorFactory.useMockExecutors();
    } else if (options.mode === 'simple') {
      AgentExecutorFactory.useSimpleFileExecutors();
    } else if (options.mode === 'terminal') {
      AgentExecutorFactory.useTerminalExecutors();
    } else {
      AgentExecutorFactory.useInProcessExecutors();
    }

    const taskResult = await this.taskStore.get(taskId);
    if (!taskResult.isSome()) {
      BeautifulTUI.showError('Task not found');
      return;
    }

    const task = taskResult.getOrElse(null as any);
    if (!task) {
      BeautifulTUI.showError('Task not found');
      return;
    }

    console.clear();
    BeautifulTUI.showHeader('Task Execution', `${task.schema.title}`);

    // Execute the task automatically (bypassing interactive menus)
    const agentStrategy = options.agent || 'smart';
    const success = await this.executeTaskAutomatically(task, agentStrategy);

    if (success) {
      BeautifulTUI.showSuccess('Task executed successfully!');
    } else {
      BeautifulTUI.showError('Task execution failed or needs review');
    }
  }

  async runNextMcpCommand(taskId: string): Promise<void> {
    // Initialize repository context if not already set
    if (!this.repoContext) {
      console.log(chalk.yellow('🔍 Initializing repository context...'));
      const result = await RepositoryAnalyzer.analyze(process.cwd());

      if (result.isSuccess()) {
        this.repoContext = result.getValue();
        const tasks = await this.taskStore.getAll();
        this.looperEngine = new LooperEngine(tasks, this.repoContext, process.cwd(), {
          useMockExecutors: false
        });
      } else {
        // If repository analysis fails, we can still run tasks without full context
        console.log(chalk.yellow('⚠️  Repository analysis failed, running in basic mode'));
        this.looperEngine = new LooperEngine([], undefined, process.cwd(), {
          useMockExecutors: false
        });
      }
    }

    // Get the task from the task store
    const taskResult = await this.taskStore.get(taskId);
    if (!taskResult.isSome()) {
      BeautifulTUI.showError('Task not found');
      return;
    }

    const task = taskResult.getOrElse(null as any);
    if (!task) {
      BeautifulTUI.showError('Task not found');
      return;
    }

    console.clear();
    BeautifulTUI.showHeader('MCP Task Execution', `${task.schema.title}`);
    console.log(chalk.blue('🤖 Mode: Non-Interactive MCP'));
    console.log(chalk.blue('🧠 Agent: Claude Code (Auto-selected)'));
    console.log(chalk.blue('⚡ Human-in-the-loop: Disabled'));
    console.log('');

    // Execute the task automatically (bypassing interactive menus)
    const success = await this.executeTaskAutomatically(task, 'claude');

    if (success) {
      BeautifulTUI.showSuccess('Task executed successfully!');
    } else {
      BeautifulTUI.showError('Task execution failed or needs review');
    }
  }

  run(): void {
    this.program.parse();
  }
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
  try {
    // Check if running TUI command
    const args = process.argv.slice(2);
    const isTui = args.length === 0 || args[0] === 'tui';

    if (isTui) {
      // Show welcome screen only for TUI mode
      await NavigationUI.showHomeScreen();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const cli = new CLI();
    cli.run();
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

export { CLI, LooperEngine, TaskBuilder, RepositoryAnalyzer, TUI };
