# PowerShell script to send prompt to Claude CLI when available
$ErrorActionPreference = 'SilentlyContinue'
$hasClaude = Get-Command claude -ErrorAction SilentlyContinue
$Prompt = @"
# Task: Create test folder with file named Happy-it-works
ID: create_test_folder_20250808_012905_0627299c

Description:
Create test folder with file named Happy-it-works

Status: PENDING

Instructions:
- Analyze the repository and implement the task requirements.
"@
if ($hasClaude) {
  Write-Output $Prompt | claude --dangerously-skip-permissions
} else {
  Write-Host "Claude CLI not found. Showing prompt below:" -ForegroundColor Yellow
  Write-Host "`n================ PROMPT ================`n"
  Write-Output $Prompt
  Write-Host "`n=======================================`n"
}
Write-Host "`nPress any key to close..."
[void][System.Console]::ReadKey($true)
