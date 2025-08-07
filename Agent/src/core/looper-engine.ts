import inquirer from 'inquirer';
import {
  Task,
  TaskStatus,
  AgentType,
  RepoContext,
  TaskAssessment,
  createTaskId,
  Priority
} from './types';
import { Result, Success, Failure, TypedEventBus } from './functional';
import { TUI } from '../ui/tui';
import { AgentProvider, AgentExecutorFactory } from './agent-executor';

export class LooperEngine {
  private eventBus = new TypedEventBus();
  private useMockExecutors: boolean = false;

  constructor(
    private tasks: Task[] = [],
    private repoContext?: RepoContext,
    private repositoryPath: string = process.cwd(),
    options?: { useMockExecutors?: boolean }
  ) {
    this.useMockExecutors = options?.useMockExecutors ?? false;

    // Configure executors based on mode
    if (this.useMockExecutors) {
      AgentExecutorFactory.useMockExecutors();
    } else {
      AgentExecutorFactory.useTerminalExecutors();
    }
  }

  async observe(): Promise<{
    pendingCount: number;
    completedCount: number;
    reviewCount: number;
    nextTask?: Task;
  }> {
    const pendingTasks = this.tasks.filter(t => t.status === TaskStatus.PENDING && t.humanApproved);
    const completedTasks = this.tasks.filter(t => t.status === TaskStatus.COMPLETED);
    const reviewTasks = this.tasks.filter(t => t.status === TaskStatus.NEEDS_REVIEW);

    return {
      pendingCount: pendingTasks.length,
      completedCount: completedTasks.length,
      reviewCount: reviewTasks.length,
      nextTask: pendingTasks.sort(
        (a, b) => (b.schema.priority || Priority.MEDIUM) - (a.schema.priority || Priority.MEDIUM)
      )[0]
    };
  }

  async orient(task: Task): Promise<TaskAssessment> {
    // Calculate task assessment metrics
    const urgency = (task.schema.priority || Priority.MEDIUM) / 4;
    const complexity = Math.min((task.schema.affectedFiles?.length || 0) / 10, 1);
    const businessImpact = this.calculateBusinessImpact(task);

    const assessment: TaskAssessment = {
      urgency,
      complexity,
      businessImpact,
      overallCriticality: urgency * 0.4 + complexity * 0.2 + businessImpact * 0.4
    };

    // Emit assessment event
    this.eventBus.emit('task:updated', {
      task,
      previousStatus: task.status
    });

    return assessment;
  }

  async decide(task: Task): Promise<Result<AgentType, string>> {
    // Get available executors
    const availableExecutors = await AgentExecutorFactory.getAvailableExecutors();

    if (availableExecutors.length === 0 && !this.useMockExecutors) {
      return new Failure('No AI agents available. Please install Claude or Gemini CLI.');
    }

    const agentChoices = [
      {
        name: `🤖 Claude Code - ${TUI.theme.primary('Recommended for complex analysis')}`,
        value: AgentType.CLAUDE_CODE,
        short: 'Claude Code',
        disabled:
          !this.useMockExecutors &&
          !availableExecutors.some(e => e.getProvider() === AgentProvider.CLAUDE)
      },
      {
        name: `🧠 Gemini CLI - ${TUI.theme.secondary('Good for quick fixes')}`,
        value: AgentType.GEMINI_CLI,
        short: 'Gemini CLI',
        disabled:
          !this.useMockExecutors &&
          !availableExecutors.some(e => e.getProvider() === AgentProvider.GEMINI)
      }
    ].filter(choice => !choice.disabled);

    try {
      const { agent } = await inquirer.prompt([
        {
          type: 'list',
          name: 'agent',
          message: ' ', // Empty message to suppress "(Use arrow keys)"
          choices: agentChoices
        }
      ]);

      // Emit agent selection event
      this.eventBus.emit('agent:selected', {
        taskId: createTaskId(task.schema.id),
        agent
      });

      return new Success(agent);
    } catch {
      return new Failure('Agent selection cancelled');
    }
  }

  async act(task: Task, agent: AgentType): Promise<Result<string, string>> {
    const spinner = TUI.progress(`Executing task with ${agent}...`);

    try {
      // Task execution starts - no intermediate status needed

      // Get the appropriate executor
      const provider =
        agent === AgentType.CLAUDE_CODE ? AgentProvider.CLAUDE : AgentProvider.GEMINI;
      const executor = AgentExecutorFactory.getExecutor(provider);

      // Subscribe to executor events for live output
      const outputHandler = (output: string) => {
        // In a real implementation, we could stream this to the UI
        console.log(output);
      };

      if (executor && typeof (executor as any).on === 'function') {
        (executor as any).on('output', outputHandler);
      }

      // Execute the task
      const executionResult = await executor.execute(task);

      // Clean up event listener
      if (executor && typeof (executor as any).removeListener === 'function') {
        (executor as any).removeListener('output', outputHandler);
      }

      if (executionResult.isSuccess()) {
        const result = executionResult.getValue();

        if (result.success) {
          // Update task with result
          task.status = TaskStatus.COMPLETED;
          task.assignedAgent = agent;
          task.result = result.output;

          spinner.succeed(
            `Task executed successfully with ${agent} (${Math.round(result.duration / 1000)}s)`
          );

          // Emit completion event
          this.eventBus.emit('task:completed', {
            task,
            result: result.output,
            duration: result.duration
          });

          return new Success(result.output);
        } else {
          // Execution completed but task needs review
          task.status = TaskStatus.NEEDS_REVIEW;
          task.assignedAgent = agent;
          task.result = result.error || 'Task execution needs review';

          spinner.warn(`Task execution completed but needs review`);

          // Emit failure event
          this.eventBus.emit('task:failed', {
            task,
            error: new Error(result.error || 'Task needs review')
          });

          return new Failure(result.error || 'Task execution needs review');
        }
      } else {
        // Executor itself failed
        const error = executionResult.getError();

        spinner.fail(`Agent execution error: ${error.message}`);

        task.status = TaskStatus.NEEDS_REVIEW;

        // Emit failure event
        this.eventBus.emit('task:failed', {
          task,
          error
        });

        return new Failure(error.message);
      }
    } catch (error) {
      spinner.fail(`Unexpected error during task execution`);

      task.status = TaskStatus.NEEDS_REVIEW;

      // Emit failure event
      this.eventBus.emit('task:failed', {
        task,
        error: error instanceof Error ? error : new Error(String(error))
      });

      return new Failure(`Execution failed: ${error}`);
    }
  }

  private calculateBusinessImpact(task: Task): number {
    const impactKeywords = ['revenue', 'customer', 'critical', 'production', 'security'];
    const impactText = (task.schema.description || '').toLowerCase();

    let impact = 0.5; // Base impact

    // Check for high-impact keywords
    impactKeywords.forEach(keyword => {
      if (impactText.includes(keyword)) {
        impact = Math.min(impact + 0.2, 1.0);
      }
    });

    // Consider priority
    if (task.schema.priority === 4) {
      // CRITICAL
      impact = Math.max(impact, 0.9);
    }

    return impact;
  }

  // Subscribe to events
  onTaskUpdate(callback: (event: any) => void): () => void {
    return this.eventBus.subscribe('task:updated', callback);
  }

  onTaskComplete(callback: (event: any) => void): () => void {
    return this.eventBus.subscribe('task:completed', callback);
  }

  onAgentSelected(callback: (event: any) => void): () => void {
    return this.eventBus.subscribe('agent:selected', callback);
  }

  // Get system statistics
  async getSystemStats(): Promise<{
    tasks: {
      total: number;
      pending: number;
      completed: number;
      review: number;
    };
    agents: {
      available: AgentType[];
      usage: Record<AgentType, number>;
    };
    repository: {
      path: string;
      branch: string;
      modifiedFiles: number;
      ahead?: number;
      behind?: number;
    };
    uptime: number;
  }> {
    const observation = await this.observe();

    const agentUsage: Record<AgentType, number> = {
      [AgentType.CLAUDE_CODE]: 0,
      [AgentType.GEMINI_CLI]: 0
    };

    this.tasks.forEach(task => {
      if (task.assignedAgent) {
        agentUsage[task.assignedAgent]++;
      }
    });

    return {
      tasks: {
        total: this.tasks.length,
        pending: observation.pendingCount,
        completed: observation.completedCount,
        review: observation.reviewCount
      },
      agents: {
        available: Object.values(AgentType),
        usage: agentUsage
      },
      repository: {
        path: this.repositoryPath,
        branch: this.repoContext?.currentBranch || 'unknown',
        modifiedFiles: this.repoContext?.modifiedFiles.length || 0,
        ahead: 0, // Would need git integration for real values
        behind: 0 // Would need git integration for real values
      },
      uptime: Date.now() // In real implementation, track actual uptime
    };
  }

  // Get recent tasks
  async getRecentTasks(limit: number = 5): Promise<Task[]> {
    return this.tasks
      .sort((a, b) => b.schema.createdAt.getTime() - a.schema.createdAt.getTime())
      .slice(0, limit);
  }
}
