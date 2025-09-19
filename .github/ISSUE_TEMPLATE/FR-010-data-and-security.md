---
name: "FR-010 Data & Security"
about: "Encrypt data and secure API tokens"
title: "[FR-010] Data & Security"
labels: [security, backend, mvp]
assignees: ""
---

## Summary
Ensure data security and safe token storage.

## Requirements
- SQLite + sqlcipher encryption.
- Keytar for token storage.
- HTTPS enforced.
- Migration scripts.

## Acceptance Criteria
- DB encrypted with passphrase.
- Tokens not visible in plaintext.
- Migration works without data loss.

## Dependencies
- All DB-using modules
