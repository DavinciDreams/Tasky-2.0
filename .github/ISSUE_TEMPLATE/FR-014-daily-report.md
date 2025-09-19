---
name: "FR-014 Daily Report"
about: "Generate startup and on-demand daily reports"
title: "[FR-014] Daily Report"
labels: [feature, ui, beta]
assignees: ""
---

## Summary
Aggregate local + cloud data into a daily report.

## Requirements
- Trigger on first open per day + on-demand.
- Include reminders, notes, clipboard, calendars, email.
- Refresh controls.
- Stream cloud data asynchronously.
- Show last updated time.

## Acceptance Criteria
- Daily report loads instantly with local data.
- Cloud data streams in ≤5s.
- Refresh updates all sources.
- Graceful handling of rate limits.

## Dependencies
- FR-003 HUD
- FR-013 Calendar & Email
- FR-004 Reminders & Notifications
