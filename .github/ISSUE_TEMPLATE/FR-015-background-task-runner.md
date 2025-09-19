---
name: "FR-015 Background Task Runner"
about: "Silent CLI/WSL execution with completion hooks"
title: "[FR-015] Background Task Runner"
labels: [feature, backend, beta]
assignees: ""
---

## Summary
Run terminal tasks silently and fire completion events.

## Requirements
- node-pty/child_process for silent runs.
- Support native shells + WSL.
- Detect completion via exit code or sentinel line.
- MCP bridge returns status/output.
- Hook: task_completed event.

## Acceptance Criteria
- Tasks run silently in background.
- Long-running tasks stream logs.
- Completion hook fires once.
- Sentinel JSON parsed correctly.

## Dependencies
- FR-007 MCP Core
- FR-003 HUD
- FR-010 Data & Security
