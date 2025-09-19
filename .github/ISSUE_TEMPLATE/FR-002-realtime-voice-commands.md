---
name: "FR-002 Realtime Voice Commands"
about: "Enable live speech-to-text with command parsing"
title: "[FR-002] Realtime Voice Commands"
labels: [feature, voice, beta]
assignees: ""
---

## Summary
Enable transcription and command parsing after wake word or button activation.

## Requirements
- Use OpenAI Realtime API.
- Show live transcription in HUD.
- Silence detection auto-stops.
- Parser converts text → MCP commands.

## Acceptance Criteria
- Voice commands transcribed with >90% accuracy.
- Commands trigger MCP tools reliably.
- Avatar animates during listening.

## Dependencies
- FR-001 Wake Word or manual activation
