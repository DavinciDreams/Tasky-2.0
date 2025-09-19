---
name: "FR-012 Accounts & OAuth"
about: "OAuth support for Google and Microsoft accounts"
title: "[FR-012] Accounts & OAuth"
labels: [feature, accounts, security, beta]
assignees: ""
---

## Summary
OAuth2 login for Gmail/Google Calendar and Outlook/Outlook Calendar.

## Requirements
- Accounts UI: connect/disconnect.
- Store tokens with keytar.
- Scopes: Gmail.readonly, Calendar.readonly, Mail.Read, Calendars.Read.
- Refresh token rotation.
- Revoke/disconnect support.

## Acceptance Criteria
- Accounts connect and display info.
- Tokens stored securely.
- Revoking removes tokens and cache.

## Dependencies
- FR-010 Data & Security
