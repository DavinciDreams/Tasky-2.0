# Tasky Chat & MCP — Current vs Target Architecture

This document explains how the system currently works and how it should work. It highlights gaps, proposes changes, and defines validation criteria and rollout steps.

## Scope
- Chat UI and UX (Composer, Timeline, Streaming, Confirmations, Adaptive Cards)
- AI Providers and Tools (Google tools on, LM Studio tools off)
- Electron IPC (preload bridge, main handlers, notifications, refresh events)
- MCP Server and Bridges (tasks, reminders, time parsing, DB operations)

References: See `docs/chat-ui-cheatsheet.md`, `docs/state-management-diagrams.md`, and `docs/mcp-tools/*` for deep dives.

## Current Behavior (As-Is)
- Composer: Sends on Enter, supports stop during streaming.
- Timeline: Persists messages; tool results embedded via `__taskyCard` snapshots.
- Confirmations: Read-only tools auto-accept; write/delete/execute show inline overlay.
- AI Providers: Tools only with Google; LM Studio streams text only.
- IPC: `mcp:tools/list` and `mcp:tools/call`; main emits `tasky:*updated` + OS notifications for CRUD.
- MCP: Tools for tasks and reminders; SQLite via better-sqlite3; execute attempts HTTP then fallback.

## Desired Behavior (To-Be)
- Unified Provider Abstraction: Allow seamless switching; surface capability flags in UI.
- Robust Confirmation UX: Consistent overlay with keyboard shortcuts, clear diff, and risk hints.
- Deterministic Snapshots: Standardized `__taskyCard` schema per tool with versioning and error shape.
- Resilient Tooling: Graceful degradation for model-only modes; explicit banner when tools unavailable.
- Event Cohesion: Single event topic per domain with payloads to drive reactive UI refreshes.
- Observability: Structured logs for tool calls, outcomes, and timings across Renderer/Main/MCP.

## Gaps & Pain Points
- Tool Availability Ambiguity: Users may not realize tools are disabled with certain providers.
- Error Variability: Schema/DB errors bubble inconsistently; need normalized UX.
- Diagram Drift: Docs and code can diverge; need CI lint or examples validation.
- Execute Visibility: Primary vs fallback path not always evident to users.
- Snapshot Consistency: Mixed shapes across tools; versioning missing.

## Proposals
1. Capability Banner and Guardrails
   - Surface provider capability (tools on/off) in ChatHeader; disable templates when off.
2. Confirmation Overlay Enhancements
   - Before/after diffs, destructive warnings, keyboard hints, and intent summary.
3. Snapshot v1 Contract
   - `__taskyCard`: `{ version: 1, kind: 'result', tool, status, data?, error?, meta? }` with per-tool data schemas.
4. Error Normalization
   - Map MCP errors to `{ code, message, details? }`; render consistent error cards with retry hooks.
5. Event Payloads
   - Emit `tasky:tasks-updated|reminders-updated` with `{ reason: 'create|update|delete', ids: [] }`.
6. Execute Feedback
   - Explicit “primary” vs “fallback” badges in cards; log timings; show HTTP endpoint status.
7. Docs Hygiene
   - Keep Mermaid labels parser-safe; add examples lint; cross-link tool docs with snapshot shapes.

## Acceptance Criteria
- Provider switch hides tools and shows capability banner when unsupported.
- All CRUD tools render confirmation with diff and risk cues; list tools auto-run without overlay.
- All tool results include `__taskyCard.version = 1` and valid per-tool `data` or `error`.
- Events include `reason` and `ids`; UI refreshes without manual reload.
- Execute shows primary/fallback outcome and warnings when degraded.
- Documentation updated with diagrams and per-tool snapshot contracts.

## Validation Plan
- Manual: Use the checklist in the test plan from chat; verify UI, cards, events, notifications.
- Automated: Add unit tests for `mcp-tools.ts` confirmation logic and snapshot builder; integration tests for IPC handlers.
- Smoke: MCP offline scenario; DB error injection; provider tools disabled scenario.

## Rollout Steps
1. Implement snapshot v1 contract and update renderer.
2. Add capability banner and disable tool templates when tools off.
3. Enhance confirmation overlay with diffs and hotkeys.
4. Normalize error mapping and error card.
5. Update main to include `reason` and `ids` in events; adjust renderer listeners.
6. Extend docs with contracts and update diagrams.

## Open Questions
- Should list operations include pagination cursors in snapshots for very large datasets?
- Do we need i18n for confirmation and error copy now or later?
- What telemetry level is acceptable for local desktop privacy?
