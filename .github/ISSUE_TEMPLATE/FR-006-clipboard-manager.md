---
name: "FR-006 Clipboard Manager"
about: "Track and view clipboard history"
title: "[FR-006] Clipboard Manager"
labels: [feature, clipboard, mvp]
assignees: ""
---

## Summary
Clipboard history system integrated into HUD.

## Requirements
- Capture text from system clipboard.
- Store in SQLite with timestamps.
- HUD panel for viewing.
- Configurable max history.

## Acceptance Criteria
- Copied text is tracked automatically.
- HUD shows recent clipboard entries.
- Old entries removed when limit is reached.

## Dependencies
- FR-003 HUD
- FR-010 Data & Security
