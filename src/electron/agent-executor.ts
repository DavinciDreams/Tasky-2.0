import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import type { TaskyTask } from '../types/task';

type Provider = 'claude' | 'gemini';

export class AgentTerminalExecutor {
  async execute(task: TaskyTask, provider: Provider): Promise<void> {
    const platform = os.platform();
    const cwd = this.resolveCwd(task);
    const prompt = this.buildPrompt(task);

    if (provider === 'claude') {
      await this.launchClaude(prompt, task, cwd, platform);
    } else {
      await this.launchGemini(prompt, task, cwd, platform);
    }
  }

  private resolveCwd(task: TaskyTask): string {
    const base = process.cwd();
    const execPath = task.schema.executionPath;
    if (!execPath) return base;
    try {
      return path.isAbsolute(execPath) ? execPath : path.resolve(base, execPath);
    } catch {
      return base;
    }
  }

  private buildPrompt(task: TaskyTask): string {
    const lines: string[] = [];
    lines.push(`# Task: ${task.schema.title}`);
    lines.push(`ID: ${task.schema.id}`);
    if (task.schema.description) lines.push(`\nDescription:\n${task.schema.description}`);
    if (task.schema.tags?.length) lines.push(`\nTags: ${task.schema.tags.join(', ')}`);
    if (task.schema.affectedFiles?.length) lines.push(`\nAffected Files:\n${task.schema.affectedFiles.join('\n')}`);
    if (task.schema.dueDate) lines.push(`\nDue: ${new Date(task.schema.dueDate).toISOString()}`);
    lines.push(`\nStatus: ${task.status}`);
    lines.push(`\nInstructions:\n- Analyze the repository and implement the task requirements.`);
    return lines.join('\n');
  }

  private async launchClaude(prompt: string, task: TaskyTask, cwd: string, platform: NodeJS.Platform): Promise<void> {
    if (platform === 'win32') {
      // Prefer PowerShell on Windows; call claude CLI if available
      const psScriptPath = path.join(cwd, 'tasky-claude-task.ps1');
      fs.writeFileSync(psScriptPath, this.createClaudePowerShellScript(prompt), 'utf-8');
      try {
        spawn('wt', ['new-tab', '--title', `Claude Task: ${task.schema.title}`, 'powershell', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath], { cwd, detached: true, stdio: 'ignore' });
      } catch {
        spawn('cmd', ['/c', 'start', 'powershell', '-ExecutionPolicy', 'Bypass', '-File', psScriptPath], { cwd, detached: true, stdio: 'ignore' });
      }
      return;
    }

    // macOS/Linux
    const scriptPath = path.join(cwd, 'tasky-claude-task.sh');
    fs.writeFileSync(scriptPath, this.createClaudeBashScript(prompt), 'utf-8');
    try { fs.chmodSync(scriptPath, '755'); } catch {}

    if (platform === 'darwin') {
      spawn('open', ['-a', 'Terminal', scriptPath], { cwd, detached: true, stdio: 'ignore' });
    } else {
      // Try common terminals
      const terminals = ['gnome-terminal', 'konsole', 'xterm'];
      for (const term of terminals) {
        try {
          spawn(term, ['-e', 'bash', scriptPath], { detached: true, stdio: 'ignore' });
          break;
        } catch { /* try next */ }
      }
    }
  }

  private async launchGemini(prompt: string, task: TaskyTask, cwd: string, platform: NodeJS.Platform): Promise<void> {
    if (platform === 'win32') {
      const scriptPath = path.join(cwd, 'tasky-gemini-task.ps1');
      fs.writeFileSync(scriptPath, this.createGeminiPowerShellScript(prompt), 'utf-8');
      try {
        spawn('wt', ['new-tab', '--title', `Gemini Task: ${task.schema.title}`, 'powershell', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { cwd, detached: true, stdio: 'ignore' });
      } catch {
        spawn('cmd', ['/c', 'start', 'powershell', '-ExecutionPolicy', 'Bypass', '-File', scriptPath], { cwd, detached: true, stdio: 'ignore' });
      }
      return;
    }

    const scriptPath = path.join(cwd, 'tasky-gemini-task.sh');
    fs.writeFileSync(scriptPath, this.createGeminiBashScript(prompt), 'utf-8');
    try { fs.chmodSync(scriptPath, '755'); } catch {}

    if (platform === 'darwin') {
      spawn('open', ['-a', 'Terminal', scriptPath], { cwd, detached: true, stdio: 'ignore' });
    } else {
      const terminals = ['gnome-terminal', 'konsole', 'xterm'];
      for (const term of terminals) {
        try {
          spawn(term, ['-e', 'bash', scriptPath], { detached: true, stdio: 'ignore' });
          break;
        } catch { /* try next */ }
      }
    }
  }

  private createClaudeBashScript(prompt: string): string {
    // Relies on `claude` CLI being available on PATH
    const escaped = prompt.replace(/`/g, '\\`');
    return `#!/usr/bin/env bash
set -euo pipefail
CLAUDE_PROMPT=$(cat <<'EOF'
${escaped}
EOF
)
printf "%s" "$CLAUDE_PROMPT" | claude --dangerously-skip-permissions
read -p "Press Enter to close..." _
`;
  }

  private createClaudePowerShellScript(prompt: string): string {
    const here = prompt.replace(/`/g, '``');
    // Try to use 'claude' CLI if available; otherwise print the prompt for manual copy
    return `# PowerShell script to send prompt to Claude CLI when available
$ErrorActionPreference = 'SilentlyContinue'
$hasClaude = Get-Command claude -ErrorAction SilentlyContinue
$Prompt = @"
${here}
"@
if ($hasClaude) {
  Write-Output $Prompt | claude --dangerously-skip-permissions
} else {
  Write-Host "Claude CLI not found. Showing prompt below:" -ForegroundColor Yellow
  Write-Host "\`n================ PROMPT ================\`n"
  Write-Output $Prompt
  Write-Host "\`n=======================================\`n"
}
Write-Host "\`nPress any key to close..."
[void][System.Console]::ReadKey($true)
`;
  }

  private createGeminiBashScript(prompt: string): string {
    const escaped = prompt.replace(/`/g, '\\`');
    return `#!/usr/bin/env bash
set -euo pipefail
GEMINI_PROMPT=$(cat <<'EOF'
${escaped}
EOF
)
printf "%s" "$GEMINI_PROMPT" | gemini --stdin
read -p "Press Enter to close..." _
`;
  }

  private createGeminiPowerShellScript(prompt: string): string {
    const here = prompt.replace(/`/g, '``');
    return `# PowerShell script to pipe prompt to Gemini CLI
$Prompt = @"
${here}
"@
Write-Output $Prompt | gemini --stdin
Write-Host "\`nPress any key to close..."
[void][System.Console]::ReadKey($true)
`;
  }
}


