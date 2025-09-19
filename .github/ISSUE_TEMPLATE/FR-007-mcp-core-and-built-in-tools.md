---
name: "FR-007 MCP Core & Built-In Tools"
about: "Middleware for command execution via MCP"
title: "[FR-007] MCP Core & Built-In Tools"
labels: [feature, backend, mvp]
assignees: ""
---

## Summary
Core MCP engine for handling commands.

## Requirements
- JSON-RPC style handler.
- Built-in tools: show_summary, take_screenshot, run_task.
- Load tools from config.
- Expose API: tasky.call("tool", params).

## Acceptance Criteria
- Built-in tools callable.
- External tools executable.
- Errors handled gracefully.

## Dependencies
- FR-010 Data & Security
