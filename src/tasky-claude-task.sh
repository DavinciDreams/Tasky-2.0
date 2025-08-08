#!/usr/bin/env bash
set -euo pipefail
CLAUDE_PROMPT=$(cat <<'EOF'
# Task: Edit thetest folder with file named Happy-it-works rename it Jim
ID: create_test_folder_20250808_012905_0627299c

Description:
test folder with file renamed Jim

Affected Files:
C:\Users\trave\Desktop\Programs\Tasky 2.0\src\test\Happy-it-works

Status: IN_PROGRESS

Instructions:
- Analyze the repository and implement the task requirements.
EOF
)
printf "%s" "$CLAUDE_PROMPT" | claude --dangerously-skip-permissions
read -p "Press Enter to close..." _
