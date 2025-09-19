---
name: "FR-003 HUD"
about: "Design and implement Tasky HUD with text input and controls"
title: "[FR-003] HUD"
labels: [feature, ui, mvp]
assignees: ""
---

## Summary
Core overlay for user interaction with Tasky.

## Requirements
- Text input bar with slash commands.
- Daily summary card.
- Quick action buttons (Voice, Reminder, Note, Clipboard, Settings).
- Light/dark theme support.

## Acceptance Criteria
- HUD can be opened via tray or wake word.
- Commands route to MCP.
- Daily summary loads on startup.

## Dependencies
- FR-007 MCP Core
- FR-009 Theming
