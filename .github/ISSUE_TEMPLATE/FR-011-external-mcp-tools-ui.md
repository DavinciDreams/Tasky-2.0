---
name: "FR-011 External MCP Tools UI"
about: "UI to add/manage MCP tools without editing config manually"
title: "[FR-011] External MCP Tools UI"
labels: [feature, ui, backend, beta]
assignees: ""
---

## Summary
UI for managing external MCP tools.

## Requirements
- Registry UI: add/edit/remove/enable tools.
- Validate commands and schemas.
- Save to tasky.config.json.
- Security warnings for net/fs access.
- Integrates into HUD Settings.

## Acceptance Criteria
- Adding a tool makes it callable.
- Disabling hides from suggestions.
- Invalid tools show errors.
- Export/import works.

## Dependencies
- FR-007 MCP Core
- FR-003 HUD
- FR-010 Data & Security
