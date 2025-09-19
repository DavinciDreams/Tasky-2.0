# Tasky 2.0 – Product Requirements Document (Directive)

## 1. Product Overview
Tasky 2.0 is a cross-platform productivity assistant built with **Electron + Vite + TypeScript**.  
It combines a playful animated avatar with serious utility: reminders, alarms, notes, clipboard history, screenshots, theming, MCP tool integration, and cloud services.  
Users can interact through **voice (wake word + realtime STT), text, or HUD controls**.

---

## 2. Objectives
- Provide a **multi-modal assistant** (voice, text, buttons).  
- Create an engaging yet lightweight **HUD** for fast interactions.  
- Support **extensible MCP tooling**, both built-in and external.  
- Enable **secure cloud integrations** (Google + Microsoft).  
- Ensure **cross-platform reliability** across Windows, macOS, Linux.  
- Maintain **data privacy** with encrypted storage and secure tokens.  

---

## 3. Core Features (Module-Level)

### FR-001 Wake Word Activation
- Always-on `"Hey Tasky"` detection via **Picovoice Porcupine**.  
- Triggers HUD + listening state.  

### FR-002 Realtime Voice Commands
- **OpenAI Realtime API** for live speech-to-text.  
- Silence detection + parser → MCP commands.  
- HUD shows transcription.  

### FR-003 HUD
- **Text input bar** (commands + notes).  
- **Quick buttons** (Voice, Reminder, Note, Clipboard, Settings).  
- **Daily Summary card**.  
- Light/Dark theming.  

### FR-004 Reminders & Notifications
- **SQLite-based reminders**.  
- Notifications with snooze (5/10/30 min).  
- Alarm sounds + avatar animations.  

### FR-005 Notes
- Quick note pad inside HUD.  
- Searchable list stored in SQLite.  

### FR-006 Clipboard Manager
- Auto-captures clipboard text.  
- History panel in HUD.  
- Configurable max history.  

### FR-007 MCP Core & Built-In Tools
- JSON-RPC style command layer.  
- Built-ins: `create_reminder`, `delete_reminder`, `show_summary`, `take_screenshot`, `run_task`.  
- Loads external tools from config.  

### FR-008 Screenshots
- Capture full-screen or active window.  
- Save path configurable.  
- Trigger via slash command, HUD button, or voice.  

### FR-009 Theming & Animations
- Light/Dark HUD themes.  
- Avatar state machine (idle/listening/alert).  
- Framer Motion + sprite sheets.  

### FR-010 Data & Security
- SQLite + sqlcipher for encrypted DB.  
- `keytar` for OAuth tokens.  
- HTTPS enforced.  
- Migration scripts.  

### FR-011 External MCP Tools UI
- **Settings tab for MCP tools**: add/edit/remove/enable.  
- Validation + import/export.  
- Security warnings for risky permissions.  

### FR-012 Accounts & OAuth
- OAuth2 login for **Google (Gmail, Calendar)** and **Microsoft (Outlook Mail, Calendar)**.  
- Secure token storage (keytar).  
- Connect/disconnect UI in Settings.  

### FR-013 Calendar & Email Integration
- Fetch next 24h calendar events.  
- Fetch recent unread/flagged emails.  
- Show in HUD summary.  

### FR-014 Daily Report
- Auto-show on startup + on-demand `/summary`.  
- Aggregates reminders, notes, clipboard, calendar, email.  
- Local first, cloud streams in async.  

### FR-015 Background Task Runner
- Run CLI/WSL commands silently (`node-pty`).  
- Detect completion (exit code or sentinel line).  
- Completion hooks fire MCP events.  

---

## 4. Technical Architecture

- **Frontend**: React + Vite + TypeScript (HUD).  
- **Backend**: Electron (Node main process).  
- **Data**: SQLite + sqlcipher.  
- **Voice**: Picovoice Porcupine + OpenAI Realtime API.  
- **Animations**: Framer Motion + sprite sheets.  
- **Notifications**: Electron Notification API + node-notifier fallback.  
- **Processes**: `node-pty` for silent CLI execution.  
- **MCP Layer**: JSON-RPC style + extensibility via config/UI.  
- **Cloud**: Google + Microsoft APIs via OAuth2.  
- **Security**: Keytar token storage, encrypted DB, HTTPS enforced.  

---

## 5. Data Schema

- **Reminders**: `id, title, datetime, snooze`  
- **Notes**: `id, content, createdAt`  
- **Clipboard**: `id, content, createdAt`  
- **Preferences**: `theme, animationsEnabled, historyLimit`  
- **Accounts**: provider, email, tokenRef  

---

## 6. Release Roadmap

### MVP
- HUD (FR-003)  
- Notes (FR-005)  
- Clipboard Manager (FR-006)  
- Reminders basic (FR-004, no snooze)  
- MCP Core (FR-007)  
- Data & Security baseline (FR-010)  

### Beta
- Wake Word (FR-001)  
- Realtime Voice (FR-002)  
- Reminders Snooze + Notifications (FR-004 full)  
- Avatar Animations + Theming (FR-009)  
- External MCP Tools UI (FR-011)  

### 1.0
- Screenshots (FR-008)  
- Accounts & OAuth (FR-012)  
- Calendar & Email Integration (FR-013)  
- Daily Report (FR-014)  
- Background Task Runner (FR-015)  

---

## 7. Directive
- **All features must be modular**, tracked by FR IDs (FR-001 → FR-015).  
- Each FR has its own GitHub Issue template for planning, tracking, and review.  
- **MVP → Beta → 1.0** must be delivered in sequence, but individual FRs can be parallelized.  
- **Security is non-negotiable**: all tokens must use keytar; DB must be encrypted.  
- **Extensibility is mandatory**: external MCP tools and cloud connectors must be pluggable.  
- **HUD is the command center**: all interaction routes through HUD (voice, typed, or button).  

---
