---
name: "FR-001 Wake Word Activation"
about: "Implement always-on wake word ('Hey Tasky') activation"
title: "[FR-001] Wake Word Activation"
labels: [feature, voice, mvp]
assignees: ""
---

## Summary
Implement wake word ("Hey Tasky") detection to open HUD and start voice mode.

## Requirements
- Continuous background process (Picovoice Porcupine).
- Low CPU usage (<5% idle).
- HUD auto-opens on wake word.
- Avatar animates listening state.

## Acceptance Criteria
- Saying “Hey Tasky” opens HUD within 1 second.
- CPU usage stays <5% when idle.
- Avatar changes state on listening.

## Dependencies
- Audio input permissions
- Avatar state machine
