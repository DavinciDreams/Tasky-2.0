#!/usr/bin/env bash
set -euo pipefail
CLAUDE_PROMPT=$(cat <<'EOF'
# Task: Create test folder with file named Happy-it-works
ID: create_test_folder_20250808_012905_0627299c

Description:
Create test folder with file named Happy-it-works

Status: PENDING

Instructions:
- Analyze the repository and implement the task requirements.
EOF
)
printf "%s" "$CLAUDE_PROMPT" | claude --dangerously-skip-permissions
read -p "Press Enter to close..." _
