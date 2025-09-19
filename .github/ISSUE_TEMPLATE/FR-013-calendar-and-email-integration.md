---
name: "FR-013 Calendar & Email Integration"
about: "Read events and email metadata for daily report"
title: "[FR-013] Calendar & Email Integration"
labels: [feature, calendar, email, beta]
assignees: ""
---

## Summary
Read-only integration with Google/Outlook calendars and mail.

## Requirements
- Fetch next 24h events.
- Fetch top 10 unread/flagged emails.
- HUD toggles for inclusion/exclusion.
- Cache results (2–5 min).
- Privacy defaults to metadata only.

## Acceptance Criteria
- /summary shows events and emails.
- Items open in provider link.
- If no account, prompt to connect.

## Dependencies
- FR-012 Accounts & OAuth
- FR-003 HUD
- FR-010 Data & Security
