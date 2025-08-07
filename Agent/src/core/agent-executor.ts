import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Task } from './types';
import { Result, Success, Failure } from './functional';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Agent types
export enum AgentProvider {
  CLAUDE = 'claude',
  GEMINI = 'gemini'
}

// Agent configuration
export interface AgentConfig {
  provider: AgentProvider;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
}

// Execution result
export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  filesModified?: string[];
  exitCode?: number;
}

// Agent executor interface
export interface IAgentExecutor {
  execute(task: Task, config?: Partial<AgentConfig>): Promise<Result<ExecutionResult, Error>>;
  isAvailable(): Promise<boolean>;
  getProvider(): AgentProvider;
}

// Alias for compatibility
export type AgentExecutor = IAgentExecutor;

// Base executor with common functionality
abstract class BaseAgentExecutor extends EventEmitter implements IAgentExecutor {
  protected abstract provider: AgentProvider;
  protected abstract defaultCommand: string;

  abstract execute(
    task: Task,
    config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>>;

  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.runCommand(this.defaultCommand, ['--version']);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  getProvider(): AgentProvider {
    return this.provider;
  }

  protected async runCommand(
    command: string,
    args: string[],
    options?: { env?: Record<string, string>; timeout?: number; input?: string }
  ): Promise<{ output: string; error: string; exitCode: number }> {
    return new Promise(resolve => {
      let output = '';
      let error = '';

      // On Windows, use WSL to run the command
      let actualCommand = command;
      let actualArgs = args;

      if (os.platform() === 'win32') {
        // Run command through WSL
        actualCommand = 'wsl';
        actualArgs = ['--', command, ...args];
      }

      const child: ChildProcess = spawn(actualCommand, actualArgs, {
        shell: true,
        env: { ...process.env, ...options?.env },
        cwd: process.cwd()
      });

      // Set timeout if specified
      const timeout = options?.timeout || 300000; // 5 minutes default
      const timer = setTimeout(() => {
        child.kill('SIGTERM');
        error += '\nProcess timed out';
      }, timeout);

      // Send input to stdin if provided
      if (options?.input && child.stdin) {
        child.stdin.write(options.input);
        child.stdin.end();
      }

      child.stdout?.on('data', data => {
        const chunk = data.toString();
        output += chunk;
        this.emit('output', chunk);
      });

      child.stderr?.on('data', data => {
        const chunk = data.toString();
        // Don't treat help text as errors for Gemini
        if (this.provider === AgentProvider.GEMINI && chunk.includes('Options:')) {
          // This is help text, not an error
          output += chunk;
        } else {
          error += chunk;
          this.emit('error', chunk);
        }
      });

      child.on('close', code => {
        clearTimeout(timer);
        resolve({
          output,
          error,
          exitCode: code || 0
        });
      });

      child.on('error', err => {
        clearTimeout(timer);
        error += err.message;
        resolve({
          output,
          error,
          exitCode: -1
        });
      });
    });
  }

  protected buildTaskPrompt(task: Task): string {
    let prompt = `Task: ${task.schema.title}\n`;

    if (task.schema.description) {
      prompt += `\nDescription: ${task.schema.description}\n`;
    }

    prompt += `\nCategory: ${task.schema.category}`;
    prompt += `\nPriority: ${task.schema.priority}`;
    prompt += `\nTask ID: ${task.schema.id}`;

    if (task.schema.affectedFiles && task.schema.affectedFiles.length > 0) {
      prompt += `\n\nAffected Files:\n${task.schema.affectedFiles.join('\n')}`;
    }

    // Add automatic status update instructions
    prompt += `\n\n🤖 IMPORTANT - AUTOMATIC STATUS UPDATE:
After completing this task, you MUST update the task status in the tasks/tasks.json file.

Find the task with ID "${task.schema.id}" and update its status field to one of:
- "COMPLETED" - Task finished successfully
- "NEEDS_REVIEW" - Task completed but requires human review

Example update:
{
  "schema": {
    "id": "${task.schema.id}",
    ...
  },
  "status": "COMPLETED",  // ← UPDATE THIS
  ...
}

Repository Location: ${process.cwd()}
Tasks File: ${process.cwd()}/tasks/tasks.json

This status update is REQUIRED - the system depends on it for task tracking.`;

    return prompt;
  }
}

// Claude executor implementation
export class ClaudeAgentExecutor extends BaseAgentExecutor {
  protected provider = AgentProvider.CLAUDE;
  protected defaultCommand = 'claude';

  async execute(
    task: Task,
    config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>> {
    const startTime = Date.now();

    try {
      // Check if Claude is available
      if (!(await this.isAvailable())) {
        return new Failure(new Error('Claude Code is not available. Please install it first.'));
      }

      // Build the command - use stdin input with auto-accept flag
      const prompt = this.buildTaskPrompt(task);

      // Use --dangerously-skip-permissions for auto-accept, prompt goes to stdin
      const args = ['--dangerously-skip-permissions'];

      if (config?.args) {
        args.push(...config.args);
      }

      // Execute Claude
      this.emit('start', { task, provider: this.provider });

      // Build options object with stdin input
      const options: { env?: Record<string, string>; timeout?: number; input?: string } = {
        input: prompt
      };
      if (config?.env) options.env = config.env;
      if (config?.timeout) options.timeout = config.timeout;

      const result = await this.runCommand(config?.command || this.defaultCommand, args, options);

      const duration = Date.now() - startTime;

      if (result.exitCode === 0) {
        const executionResult: ExecutionResult = {
          success: true,
          output: result.output,
          duration,
          exitCode: result.exitCode
        };

        // Try to parse files modified from output
        const filesMatch = result.output.match(/Files modified: (.+)/);
        if (filesMatch) {
          executionResult.filesModified = filesMatch[1].split(',').map(f => f.trim());
        }

        this.emit('complete', executionResult);
        return new Success(executionResult);
      } else {
        const executionResult: ExecutionResult = {
          success: false,
          output: result.output,
          error: result.error,
          duration,
          exitCode: result.exitCode
        };

        this.emit('error', executionResult);
        return new Success(executionResult);
      }
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Gemini executor implementation
export class GeminiAgentExecutor extends BaseAgentExecutor {
  protected provider = AgentProvider.GEMINI;
  protected defaultCommand = 'gemini';

  async execute(
    task: Task,
    config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>> {
    const startTime = Date.now();

    try {
      // Check if Gemini is available
      if (!(await this.isAvailable())) {
        return new Failure(new Error('Gemini CLI is not available. Please install it first.'));
      }

      // Build the command - use stdin input with --yolo flag
      const prompt = this.buildTaskPrompt(task);

      // Use --yolo flag for auto-accept, prompt goes to stdin
      const args = ['--yolo'];

      if (config?.args) {
        args.push(...config.args);
      }

      // Execute Gemini
      this.emit('start', { task, provider: this.provider });

      // Build options object with stdin input
      const options: { env?: Record<string, string>; timeout?: number; input?: string } = {
        input: prompt
      };
      if (config?.env) options.env = config.env;
      if (config?.timeout) options.timeout = config.timeout;

      const result = await this.runCommand(config?.command || this.defaultCommand, args, options);

      const duration = Date.now() - startTime;

      if (result.exitCode === 0) {
        const executionResult: ExecutionResult = {
          success: true,
          output: result.output,
          duration,
          exitCode: result.exitCode
        };

        // Try to parse files modified from output
        const filesMatch = result.output.match(/Modified: (.+)/);
        if (filesMatch) {
          executionResult.filesModified = filesMatch[1].split(',').map(f => f.trim());
        }

        this.emit('complete', executionResult);
        return new Success(executionResult);
      } else {
        const executionResult: ExecutionResult = {
          success: false,
          output: result.output,
          error: result.error,
          duration,
          exitCode: result.exitCode
        };

        this.emit('error', executionResult);
        return new Success(executionResult);
      }
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

// Terminal-launching Claude executor implementation
export class TerminalClaudeExecutor extends BaseAgentExecutor {
  protected provider = AgentProvider.CLAUDE;
  protected defaultCommand = 'claude';

  async execute(
    task: Task,
    _config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>> {
    const startTime = Date.now();

    try {
      // Build the task prompt
      const prompt = this.buildTaskPrompt(task);

      // Get current working directory (repository path)
      const cwd = process.cwd();

      // Create and launch script that pipes prompt to Claude
      await this.launchClaudeWithPrompt(prompt, task, cwd);

      // Since we're launching an external terminal, we return immediately
      const duration = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        success: true,
        output: `Launched Claude for task: ${task.schema.title}`,
        duration,
        exitCode: 0
      };

      this.emit('complete', executionResult);
      return new Success(executionResult);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async launchClaudeWithPrompt(prompt: string, task: Task, cwd: string): Promise<void> {
    const platform = os.platform();

    if (platform === 'win32') {
      // Windows - Launch WSL directly with bash script (not PowerShell!)
      const wslPath = cwd.replace(/^C:/, '/mnt/c').replace(/\\/g, '/');
      const scriptContent = this.createBashScript(prompt, task, wslPath);
      const scriptPath = path.join(cwd, 'claude-task.sh');
      const wslScriptPath = scriptPath.replace(/^C:/, '/mnt/c').replace(/\\/g, '/');

      fs.writeFileSync(scriptPath, scriptContent);

      // Launch WSL directly with the bash script
      try {
        // Try Windows Terminal with WSL
        spawn(
          'wt',
          [
            'new-tab',
            '--title',
            `Claude Task: ${task.schema.title}`,
            'wsl',
            '--',
            'bash',
            wslScriptPath
          ],
          {
            cwd,
            detached: true,
            stdio: 'ignore'
          }
        );
      } catch {
        // Fallback to direct WSL launch
        spawn('wsl', ['--', 'bash', wslScriptPath], {
          cwd,
          detached: true,
          stdio: 'ignore'
        });
      }

      // Clean up script file after a delay
      // setTimeout(() => {
      //   try {
      //     fs.unlinkSync(scriptPath);
      //   } catch (error) {
      //     // Ignore cleanup errors
      //   }
      // }, 30000); // Temporarily disabled for debugging
    } else {
      // Unix/Linux/macOS - use bash script with direct pipe
      const scriptContent = this.createBashScript(prompt, task, cwd);
      const scriptPath = path.join(cwd, 'claude-task.sh');

      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, '755');

      if (platform === 'darwin') {
        // macOS - use Terminal.app
        spawn('open', ['-a', 'Terminal', scriptPath], {
          cwd,
          detached: true,
          stdio: 'ignore'
        });
      } else {
        // Linux - try common terminal emulators
        const terminals = ['gnome-terminal', 'konsole', 'xterm'];

        for (const terminal of terminals) {
          try {
            spawn(terminal, ['-e', 'bash', scriptPath], {
              detached: true,
              stdio: 'ignore'
            });
            break;
          } catch {
            continue;
          }
        }
      }

      // Clean up script file after a delay
      // setTimeout(() => {
      //   try {
      //     fs.unlinkSync(scriptPath);
      //   } catch (error) {
      //     // Ignore cleanup errors
      //   }
      // }, 30000); // Temporarily disabled for debugging
    }
  }

  private createBashScript(prompt: string, task: Task, cwd: string): string {
    // Escape quotes for bash
    const escapedPrompt = prompt.replace(/'/g, "'\"'\"'");

    return `#!/bin/bash
echo "==============================================="
echo "           CLAUDE AI TASK EXECUTION"
echo "==============================================="
echo ""
echo "Repository: ${cwd}"
echo ""
echo "📋 TASK TO COMPLETE:"
echo "─────────────────────────────────────────────"
echo "Title: ${task.schema.title}"
echo "Description: ${task.schema.description || 'No description'}"
echo "Category: ${task.schema.category}"
echo "Priority: ${task.schema.priority}"
echo "Task ID: ${task.schema.id}"
echo "─────────────────────────────────────────────"
echo ""
echo "🎯 INSTRUCTIONS FOR CLAUDE:"
echo "1. Analyze the repository structure"
echo "2. Understand the task requirements above"
echo "3. Implement the necessary changes"
echo "4. Update task status in tasks/tasks.json to COMPLETED"
echo ""
echo "==============================================="
echo ""
echo "Checking Claude CLI availability..."
if command -v claude &> /dev/null; then
    echo "✅ Claude CLI found, starting..."
    echo ""
    cd "${cwd}" 2>/dev/null || cd "$(pwd)"
    echo "📁 Working directory: $(pwd)"
    echo ""
    
    # Create a task context file for Claude to read
    echo "📝 Creating task context file..."
    cat > task_context.md << 'EOF'
# TASK EXECUTION REQUEST

## Task Details
- **Title**: ${task.schema.title}
- **Description**: ${task.schema.description || 'No description'}
- **Category**: ${task.schema.category}
- **Priority**: ${task.schema.priority}
- **Task ID**: ${task.schema.id}

## Instructions
${escapedPrompt}

## Repository Context
Working in: ${cwd}

## Action Required
1. Analyze the repository structure
2. Understand the task requirements above
3. Implement the necessary changes
4. **IMPORTANT**: Update the task status in \`tasks/tasks.json\` from "PENDING" to "COMPLETED" for task ID: ${task.schema.id}

## Files to Check
- \`tasks/tasks.json\` - Update task status when complete
- Repository files as needed for the task

Please complete this task and update the status accordingly.
EOF
    
    echo "✅ Task context created: task_context.md"
    echo ""
    echo "🚀 Starting Claude with task context..."
    echo "💡 Claude will automatically load the task context file."
    echo ""
    
    # Launch Claude with the context file
    claude --dangerously-skip-permissions task_context.md
    
    echo ""
    echo "✅ Claude session completed!"
    
    # Clean up context file
    echo "🧹 Cleaning up task context file..."
    rm -f task_context.md
    
else
    echo "❌ Claude CLI not found in PATH"
    echo ""
    echo "Please install Claude CLI first:"
    echo "1. Visit: https://docs.anthropic.com/en/docs/claude-code/overview"
    echo "2. Or try: npm install -g @anthropic-ai/claude-code"
    echo ""
    echo "Alternative: You can manually run Claude commands here"
    echo ""
fi
echo ""
echo "==============================================="
echo "Task execution area - You can run commands manually:"
echo ""
echo "Current directory: $(pwd)"
echo ""
echo "Available commands:"
echo "  claude --dangerously-skip-permissions       # Start Claude with auto-accept"
echo "  claude                          # Start interactive Claude session"
echo "  ls -la                          # List files"
echo "  git status                      # Check git status"
echo "  git diff                        # See changes"
echo ""
echo "💡 TIP: Use 'claude --dangerously-skip-permissions' for auto-accept mode"
echo ""
echo "Press Enter to keep this window open, or Ctrl+C to exit..."
read
`;
  }
}

// Terminal-launching Gemini executor implementation
export class TerminalGeminiExecutor extends BaseAgentExecutor {
  protected provider = AgentProvider.GEMINI;
  protected defaultCommand = 'gemini';

  async execute(
    task: Task,
    _config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>> {
    const startTime = Date.now();

    try {
      // Build the task prompt
      const prompt = this.buildTaskPrompt(task);

      // Get current working directory (repository path)
      const cwd = process.cwd();

      // Create and launch script that pipes prompt to Gemini
      await this.launchGeminiWithPrompt(prompt, task, cwd);

      // Since we're launching an external terminal, we return immediately
      const duration = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        success: true,
        output: `Launched Gemini for task: ${task.schema.title}`,
        duration,
        exitCode: 0
      };

      this.emit('complete', executionResult);
      return new Success(executionResult);
    } catch (error) {
      return new Failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async launchGeminiWithPrompt(prompt: string, task: Task, cwd: string): Promise<void> {
    const platform = os.platform();

    if (platform === 'win32') {
      // Windows - Create PowerShell script that pipes prompt to Gemini (like the working version)
      const scriptContent = this.createPowerShellScript(prompt, task, cwd);
      const scriptPath = path.join(cwd, 'gemini-task.ps1');

      fs.writeFileSync(scriptPath, scriptContent);

      // Launch PowerShell in a new terminal window
      try {
        // Try Windows Terminal first (modern approach)
        spawn(
          'wt',
          [
            'new-tab',
            '--title',
            `Gemini Task: ${task.schema.title}`,
            'powershell',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            scriptPath
          ],
          {
            cwd,
            detached: true,
            stdio: 'ignore'
          }
        );
      } catch {
        // Fallback to CMD with PowerShell (compatible approach)
        spawn(
          'cmd',
          ['/c', 'start', 'powershell', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
          {
            cwd,
            detached: true,
            stdio: 'ignore'
          }
        );
      }

      // Clean up script file after a delay
      // setTimeout(() => {
      //   try {
      //     fs.unlinkSync(scriptPath);
      //   } catch (error) {
      //     // Ignore cleanup errors
      //   }
      // }, 30000); // Temporarily disabled for debugging
    } else {
      // Unix/Linux/macOS - use bash script with direct pipe
      const scriptContent = this.createBashScript(prompt, task, cwd);
      const scriptPath = path.join(cwd, 'gemini-task.sh');

      fs.writeFileSync(scriptPath, scriptContent);
      fs.chmodSync(scriptPath, '755');

      if (platform === 'darwin') {
        // macOS - use Terminal.app
        spawn('open', ['-a', 'Terminal', scriptPath], {
          cwd,
          detached: true,
          stdio: 'ignore'
        });
      } else {
        // Linux - try common terminal emulators
        const terminals = ['gnome-terminal', 'konsole', 'xterm'];

        for (const terminal of terminals) {
          try {
            spawn(terminal, ['-e', 'bash', scriptPath], {
              detached: true,
              stdio: 'ignore'
            });
            break;
          } catch {
            continue;
          }
        }
      }

      // Clean up script file after a delay
      // setTimeout(() => {
      //   try {
      //     fs.unlinkSync(scriptPath);
      //   } catch (error) {
      //     // Ignore cleanup errors
      //   }
      // }, 30000); // Temporarily disabled for debugging
    }
  }

  private createPowerShellScript(prompt: string, task: Task, cwd: string): string {
    // Escape quotes for PowerShell
    const escapedPrompt = prompt.replace(/"/g, '""');
    const safeTitle = task.schema.title.replace(/"/g, '""');

    return `# PowerShell script for Gemini AI Task Execution
$Host.UI.RawUI.WindowTitle = "Gemini AI Task Execution - ${safeTitle}"

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "          GEMINI AI TASK EXECUTION" -ForegroundColor Cyan  
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository: ${cwd}" -ForegroundColor Yellow
Write-Host ""
Write-Host "Task: ${safeTitle}" -ForegroundColor Green
Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Gemini CLI is available
Write-Host "Checking Gemini CLI availability..." -ForegroundColor Yellow
if (Get-Command gemini -ErrorAction SilentlyContinue) {
    Write-Host "✅ Gemini CLI found, starting..." -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Starting Gemini in YOLO mode (auto-accept)..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "📝 Task being sent to Gemini:" -ForegroundColor Cyan
    Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host "${safeTitle}" -ForegroundColor White
    Write-Host "─────────────────────────────────────────────" -ForegroundColor Gray
    Write-Host ""
    
    # Change to the repository directory
    Set-Location "${cwd}"
    Write-Host "📁 Working directory: $(Get-Location)" -ForegroundColor Blue
    Write-Host ""
    
    # Use --yolo mode for auto-accept and pipe the full prompt
    try {
        "${escapedPrompt} Repository: ${cwd} Please help me complete this task. Analyze the repository, understand the requirements, and implement the necessary changes." | gemini --yolo
        Write-Host ""
        Write-Host "✅ Gemini execution completed!" -ForegroundColor Green
    } catch {
        Write-Host ""
        Write-Host "❌ Error running Gemini: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Trying alternative approach..." -ForegroundColor Yellow
        # Fallback: start interactive Gemini session
        Write-Host "Starting interactive Gemini session..." -ForegroundColor Yellow
        gemini --yolo
    }
} else {
    Write-Host "❌ Gemini CLI not found in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Gemini CLI first:" -ForegroundColor Yellow
    Write-Host "1. Visit: https://ai.google.dev/gemini-api/docs/cli"
    Write-Host "2. Or try: npm install -g @google/generative-ai-cli" 
    Write-Host "3. Or try: pip install google-generativeai-cli"
    Write-Host ""
    Write-Host "Alternative: You can manually run Gemini commands here" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Manual command to run:" -ForegroundColor Yellow
    Write-Host "gemini --yolo" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Task execution area - You can run commands manually:" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:" -ForegroundColor Yellow
Write-Host "  gemini --yolo                   # Start Gemini with auto-accept"
Write-Host "  gemini                          # Start interactive Gemini session"
Write-Host "  dir                             # List files"
Write-Host "  git status                      # Check git status"
Write-Host "  git diff                        # See changes"
Write-Host ""
Write-Host "💡 TIP: Use 'gemini --yolo' for auto-accept mode" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
`;
  }

  private createBashScript(prompt: string, task: Task, cwd: string): string {
    // Escape quotes for bash
    const escapedPrompt = prompt.replace(/'/g, "'\"'\"'");

    return `#!/bin/bash
echo "==============================================="
echo "           GEMINI AI TASK EXECUTION"
echo "==============================================="
echo ""
echo "Repository: ${cwd}"
echo ""
echo "Task: ${task.schema.title}"
echo ""
echo "==============================================="
echo ""
echo "Checking Gemini CLI availability..."
if command -v gemini &> /dev/null; then
    echo "✅ Gemini CLI found, starting..."
    echo ""
    cd "${cwd}" 2>/dev/null || cd "$(pwd)"
    echo "📁 Working directory: $(pwd)"
    echo ""
    echo "🚀 Starting Gemini in YOLO mode (auto-accept)..."
    echo ""
    echo "🎯 Task being sent to Gemini:"
    echo "─────────────────────────────────────────────"
    echo "${task.schema.title}"
    echo "─────────────────────────────────────────────"
    echo ""
    
    # Direct pipe to gemini with --yolo flag for auto-accept
    echo '${escapedPrompt} Repository: ${cwd} Please help me complete this task. Analyze the repository, understand the requirements, and implement the necessary changes.' | gemini --yolo
    
    echo ""
    echo "✅ Gemini execution completed!"
else
    echo "❌ Gemini CLI not found in PATH"
    echo ""
    echo "Please install Gemini CLI first:"
    echo "1. Visit: https://ai.google.dev/gemini-api/docs/cli"
    echo "2. Or try: npm install -g @google/generative-ai-cli"
    echo "3. Or try: pip install google-generativeai-cli"
    echo ""
    echo "Alternative: You can manually run Gemini commands here"
    echo ""
    echo "Manual command to run:"
    echo "gemini --yolo"
    echo ""
fi
echo ""
echo "==============================================="
echo "Task execution area - You can run commands manually:"
echo ""
echo "Current directory: $(pwd)"
echo ""
echo "Available commands:"
echo "  gemini --yolo                   # Start Gemini with auto-accept"
echo "  gemini                          # Start interactive Gemini session"
echo "  ls -la                          # List files"
echo "  git status                      # Check git status"
echo "  git diff                        # See changes"
echo ""
echo "💡 TIP: Use 'gemini --yolo' for auto-accept mode"
echo ""
echo "Press Enter to keep this window open, or Ctrl+C to exit..."
read
`;
  }
}

// Factory for creating agent executors
export class AgentExecutorFactory {
  private static executors = new Map<AgentProvider, IAgentExecutor>();

  static {
    // Register terminal-launching executors by default
    this.executors.set(AgentProvider.CLAUDE, new TerminalClaudeExecutor());
    this.executors.set(AgentProvider.GEMINI, new TerminalGeminiExecutor());
  }

  static getExecutor(provider: AgentProvider): IAgentExecutor {
    const executor = this.executors.get(provider);
    if (!executor) {
      throw new Error(`No executor registered for provider: ${provider}`);
    }
    return executor;
  }

  static async getAvailableExecutors(): Promise<IAgentExecutor[]> {
    const available: IAgentExecutor[] = [];

    for (const executor of this.executors.values()) {
      if (await executor.isAvailable()) {
        available.push(executor);
      }
    }

    return available;
  }

  static registerExecutor(provider: AgentProvider, executor: IAgentExecutor): void {
    this.executors.set(provider, executor);
  }

  static useMockExecutors(): void {
    // Switch to mock executors for testing
    this.executors.set(AgentProvider.CLAUDE, new MockClaudeExecutor());
    this.executors.set(AgentProvider.GEMINI, new MockGeminiExecutor());
  }

  static useTerminalExecutors(): void {
    // Switch to terminal-launching executors (default)
    this.executors.set(AgentProvider.CLAUDE, new TerminalClaudeExecutor());
    this.executors.set(AgentProvider.GEMINI, new TerminalGeminiExecutor());
  }

  static useInProcessExecutors(): void {
    // Switch to in-process executors (original behavior)
    this.executors.set(AgentProvider.CLAUDE, new ClaudeAgentExecutor());
    this.executors.set(AgentProvider.GEMINI, new GeminiAgentExecutor());
  }

  static useSimpleFileExecutors(): void {
    // Switch to simple file executors that actually perform basic file operations
    this.executors.set(AgentProvider.CLAUDE, new SimpleFileExecutor());
    this.executors.set(AgentProvider.GEMINI, new SimpleFileExecutor());
  }
}

// Mock implementations for demo/testing
export class MockClaudeExecutor extends BaseAgentExecutor {
  protected provider = AgentProvider.CLAUDE;
  protected defaultCommand = 'echo';

  async isAvailable(): Promise<boolean> {
    return true; // Always available in mock mode
  }

  async execute(
    task: Task,
    _config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>> {
    const startTime = Date.now();

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    const duration = Date.now() - startTime;

    // Simulate successful execution
    const result: ExecutionResult = {
      success: true,
      output: `Mock Claude execution for task: ${task.schema.title}\n\nAnalyzed files and found the issue.\nImplemented fix successfully.\n\nFiles modified: src/components/Button.tsx, src/styles/button.css`,
      duration,
      filesModified: ['src/components/Button.tsx', 'src/styles/button.css'],
      exitCode: 0
    };

    this.emit('complete', result);
    return new Success(result);
  }
}

export class MockGeminiExecutor extends BaseAgentExecutor {
  protected provider = AgentProvider.GEMINI;
  protected defaultCommand = 'echo';

  async isAvailable(): Promise<boolean> {
    return true; // Always available in mock mode
  }

  async execute(
    task: Task,
    _config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>> {
    const startTime = Date.now();

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const duration = Date.now() - startTime;

    // Simulate successful execution
    const result: ExecutionResult = {
      success: true,
      output: `Mock Gemini execution for task: ${task.schema.title}\n\nPerformed quick analysis.\nApplied optimizations.\n\nModified: src/utils/api.ts`,
      duration,
      filesModified: ['src/utils/api.ts'],
      exitCode: 0
    };

    this.emit('complete', result);
    return new Success(result);
  }
}

// Simple file executor for basic operations (creating folders, files, etc.)
export class SimpleFileExecutor extends BaseAgentExecutor {
  protected provider = AgentProvider.GEMINI; // Use Gemini provider for compatibility
  protected defaultCommand = 'echo';

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  async execute(
    task: Task,
    _config?: Partial<AgentConfig>
  ): Promise<Result<ExecutionResult, Error>> {
    const startTime = Date.now();

    try {
      // Analyze the task and perform the actual file operations
      const result = await this.performFileOperations(task);

      const duration = Date.now() - startTime;

      const executionResult: ExecutionResult = {
        success: result.success,
        output: result.output,
        duration,
        exitCode: result.success ? 0 : 1
      };

      if (result.error) {
        executionResult.error = result.error;
      }

      if (result.filesModified) {
        executionResult.filesModified = result.filesModified;
      }

      this.emit('complete', executionResult);
      return new Success(executionResult);
    } catch (error) {
      const duration = Date.now() - startTime;
      const executionResult: ExecutionResult = {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        duration,
        exitCode: 1
      };

      return new Success(executionResult);
    }
  }

  private async performFileOperations(task: Task): Promise<{
    success: boolean;
    output: string;
    error?: string;
    filesModified?: string[];
  }> {
    const fs = await import('fs-extra');
    const path = await import('path');

    const title = task.schema.title.toLowerCase();
    const description = (task.schema.description || '').toLowerCase();

    try {
      // Create folder operations
      if (title.includes('create') && title.includes('folder')) {
        const folderMatch =
          title.match(/folder.*?named\s+(\w+)/i) || title.match(/create.*?(\w+)/i);
        if (folderMatch) {
          const folderName = folderMatch[1] || 'Tests';
          const folderPath = path.join(process.cwd(), folderName);

          await fs.ensureDir(folderPath);

          return {
            success: true,
            output: `Successfully created folder: ${folderName}\nPath: ${folderPath}`,
            filesModified: [folderName]
          };
        }
      }

      // Create file operations
      if (title.includes('create') && title.includes('file')) {
        // More flexible regex patterns
        const fileMatch =
          title.match(/file.*?named\s+([^\s]+)/i) ||
          title.match(/create.*?file.*?([a-zA-Z0-9._-]+\.[a-zA-Z]+)/i);
        const folderMatch =
          title.match(/(?:inside|in).*?folder.*?named\s+(\w+)/i) ||
          description.match(/(\w+)\s+folder/i);

        if (fileMatch) {
          const fileName = fileMatch[1];
          const folderName = folderMatch ? folderMatch[1] : '';

          let filePath: string;
          if (folderName) {
            const folderPath = path.join(process.cwd(), folderName);
            await fs.ensureDir(folderPath); // Ensure folder exists
            filePath = path.join(folderPath, fileName);
          } else {
            filePath = path.join(process.cwd(), fileName);
          }

          // Create file with basic content
          const content = `# ${fileName}\n\nThis file was created by Looper CLI auto-process.\n\n- Task: ${task.schema.title}\n- Created: ${new Date().toISOString()}\n- Category: ${task.schema.category}\n`;

          await fs.writeFile(filePath, content);

          return {
            success: true,
            output: `Successfully created file: ${fileName}\nPath: ${filePath}\nContent written: ${content.length} characters\nFolder: ${folderName || 'root'}`,
            filesModified: [folderName ? `${folderName}/${fileName}` : fileName]
          };
        }
      }

      // Default fallback for other operations
      return {
        success: true,
        output: `Task processed: ${task.schema.title}\nNote: This was a simple file executor - no specific file operations detected.`,
        filesModified: []
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `File operation failed: ${error instanceof Error ? error.message : String(error)}`,
        filesModified: []
      };
    }
  }
}
