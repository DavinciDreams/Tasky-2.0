<p align="center">
  <img src="./tasky-banner.png" alt="Tasky 2.0 Banner" width="800" />
</p>

# Tasky 2.0 – AI-Powered Desktop Task Management

Tasky 2.0 is a modern, cross-platform desktop task management application built with Electron, React, and TypeScript. It features an animated desktop companion, AI integration, smart reminders, and seamless Model Context Protocol (MCP) support for external AI tools.

## ✨ Features

### 🎯 **Core Task Management**
- **Rich Tasks**: Create tasks with titles, descriptions, due dates, tags, file attachments, and execution paths
- **Smart Dependencies**: Set up task dependencies and execution workflows
- **Status Tracking**: Monitor task progress with statuses (PENDING, IN_PROGRESS, COMPLETED, NEEDS_REVIEW, ARCHIVED)
- **Analytics Dashboard**: View task completion statistics and productivity insights

### 🔔 **Intelligent Reminders** 
- **Desktop Notifications**: Custom bubble notifications with sound alerts
- **Flexible Scheduling**: One-time or recurring reminders with timezone support
- **Pre-due Alerts**: 15-minute advance warnings for upcoming deadlines
- **Smart Snoozing**: Customizable reminder intervals

### 🤖 **AI Assistant Companion**
- **Animated Desktop Companion**: GSAP-powered avatar with customizable positioning
- **Multiple Avatar Options**: Choose from preset characters or upload custom images
- **Interactive Behaviors**: Responds to task events with animations and notifications
- **Configurable Presence**: Adjustable layer positioning and interaction modes

### 🧠 **AI Integration & Execution**
- **Multi-Agent Support**: Execute tasks using Claude or Gemini CLI agents
- **Smart Terminal Integration**: Automatic working directory resolution and cross-platform terminal support
- **Structured Prompts**: AI agents receive rich context from task details and dependencies
- **Execution Tracking**: Sentinel files and status monitoring for automated completion

### 💬 **Integrated Chat Interface**
- **AI Chat Module**: Built-in chat interface with AI provider support (Google AI, OpenAI-compatible)
- **MCP Tools Integration**: Direct access to Tasky functions within chat conversations
- **Chat Persistence**: Save and manage chat transcripts with SQLite storage
- **Adaptive Cards**: Rich message formatting and tool result visualization

### 🔗 **Model Context Protocol (MCP)**
- **Full CRUD Operations**: Create, read, update, and delete tasks via MCP
- **Real-time Sync**: Bidirectional synchronization between app and MCP clients
- **External AI Integration**: Compatible with Cursor, Claude Desktop, and other MCP clients
- **Tool Discovery**: Automatic MCP tool registration and documentation

### 🎨 **Modern UI/UX**
- **Perano Color Theme**: Beautiful purple-blue gradient theme with smooth animations
- **Responsive Design**: Adaptive layouts with Tailwind CSS and Framer Motion
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Customizable Interface**: Adjustable time formats, themes, and layout preferences

# Building
npm run build            # Build all components
npm run build-renderer   # Build React frontend only
npm run build-electron   # Build Electron main process only

# Distribution
npm run dist             # Build distributables for all platforms
npm run dist:win         # Windows installer
npm run dist:mac         # macOS app bundle  
npm run dist:linux       # Linux packages

# Database
npm run backup:db        # Create database backup

# MCP Agent
npm run agent:dev        # Develop MCP agent
npm run agent:build      # Build MCP agent

# Testing & Quality
npm run lint             # ESLint code quality check
npm run test             # Run test suite
npm run test:watch       # Watch mode testing
```

### Tech Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Desktop**: Electron 29, Better SQLite3, Node Cron
- **AI Integration**: AI SDK (Google/OpenAI), Model Context Protocol
- **Build Tools**: Vite, ESBuild, Electron Builder
- **Animation**: GSAP (desktop companion), Framer Motion (UI)
- **Testing**: Vitest, Happy DOM, Testing Library
- **Theme**: Custom Perano color palette with dark mode support

## 🎨 Color Palette

Tasky 2.0 uses a beautiful Perano-inspired color scheme:

```css
--color-perano-50: #eef3ff;   /* Lightest blue */
--color-perano-100: #e0e8ff;  /* Very light blue */
--color-perano-200: #bdccfd;  /* Light blue */
--color-perano-300: #a6b8fb;  /* Soft blue */
--color-perano-400: #8291f7;  /* Medium blue */
--color-perano-500: #656def;  /* Primary blue */
--color-perano-600: #4c48e3;  /* Strong blue */
--color-perano-700: #403ac8;  /* Deep blue */
--color-perano-800: #3431a2;  /* Very deep blue */
--color-perano-900: #2f2f80;  /* Dark blue */
--color-perano-950: #1d1c4a;  /* Darkest blue */
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use ESLint configuration for code quality
- Write tests for new features
- Update documentation for API changes
- Ensure cross-platform compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Electron team for the excellent desktop framework
- Anthropic and Google for AI integration capabilities
- Model Context Protocol for seamless AI tool integration
- Open source community for the amazing libraries and tools

---

**Built with ❤️ using Electron, React, and TypeScript**t. It features an animated desktop companion, AI integration, smart reminders, and seamless Model Context Protocol (MCP) support for external AI tools.

## ✨ Features

### 🎯 **Core Task Management**
- **Rich Tasks**: Create tasks with titles, descriptions, due dates, tags, file attachments, and execution paths
- **Smart Dependencies**: Set up task dependencies and execution workflows
- **Status Tracking**: Monitor task progress with statuses (PENDING, IN_PROGRESS, COMPLETED, NEEDS_REVIEW, ARCHIVED)
- **Analytics Dashboard**: View task completion statistics and productivity insights

### 🔔 **Intelligent Reminders** 
- **Desktop Notifications**: Custom bubble notifications with sound alerts
- **Flexible Scheduling**: One-time or recurring reminders with timezone support
- **Pre-due Alerts**: 15-minute advance warnings for upcoming deadlines
- **Smart Snoozing**: Customizable reminder intervals

### 🤖 **AI Assistant Companion**
- **Animated Desktop Companion**: GSAP-powered avatar with customizable positioning
- **Multiple Avatar Options**: Choose from preset characters or upload custom images
- **Interactive Behaviors**: Responds to task events with animations and notifications
- **Configurable Presence**: Adjustable layer positioning and interaction modes

### 🧠 **AI Integration & Execution**
- **Multi-Agent Support**: Execute tasks using Claude or Gemini CLI agents
- **Smart Terminal Integration**: Automatic working directory resolution and cross-platform terminal support
- **Structured Prompts**: AI agents receive rich context from task details and dependencies
- **Execution Tracking**: Sentinel files and status monitoring for automated completion

### 💬 **Integrated Chat Interface**
- **AI Chat Module**: Built-in chat interface with AI provider support (Google AI, OpenAI-compatible)
- **MCP Tools Integration**: Direct access to Tasky functions within chat conversations
- **Chat Persistence**: Save and manage chat transcripts with SQLite storage
- **Adaptive Cards**: Rich message formatting and tool result visualization

### 🔗 **Model Context Protocol (MCP)**
- **Full CRUD Operations**: Create, read, update, and delete tasks via MCP
- **Real-time Sync**: Bidirectional synchronization between app and MCP clients
- **External AI Integration**: Compatible with Cursor, Claude Desktop, and other MCP clients
- **Tool Discovery**: Automatic MCP tool registration and documentation

### 🎨 **Modern UI/UX**
- **Perano Color Theme**: Beautiful purple-blue gradient theme with smooth animations
- **Responsive Design**: Adaptive layouts with Tailwind CSS and Framer Motion
- **Accessibility**: ARIA labels, keyboard navigation, and screen reader support
- **Customizable Interface**: Adjustable time formats, themes, and layout preferences

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (LTS recommended)
- **Operating System**: Windows, macOS, or Linux
- **For AI Execution**: Install CLI tools on PATH:
  - [Claude CLI](https://github.com/anthropics/claude-cli) for Anthropic integration
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli) for Google AI integration

### Installation & Development

1. **Clone and Install**
   ```bash
   git clone https://github.com/Traves-Theberge/Tasky-2.0.git
   cd Tasky-2.0
   npm install
   ```

2. **Development Mode**
   ```bash
   npm run dev
   ```
   This builds the application and starts Electron with development tools enabled.

3. **Production Build**
   ```bash
   npm start
   ```
   Creates optimized builds and runs the production-ready application.

4. **Build Distributables**
   ```bash
   npm run dist        # All platforms
   npm run dist:win    # Windows installer
   npm run dist:mac    # macOS app bundle
   npm run dist:linux  # Linux packages
   ```

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TASKY_DB_PATH` | `./data/tasky.db` | SQLite database location |
| `TASKY_SQLITE_JOURNAL` | `DELETE` | SQLite journal mode (`DELETE` or `WAL`) |
| `NODE_ENV` | `production` | Environment mode (enables DevTools in development) |

### Important Notes
- Both the Electron app and MCP agent must reference the same `TASKY_DB_PATH` for proper synchronization
- Database backups are automatically created using: `npm run backup:db`
- The application supports custom avatar uploads and theme configurations

## 🏗️ Architecture

Tasky 2.0 follows a modular, event-driven architecture designed for scalability and maintainability:

### Project Structure

```
src/
├── main.ts                     # Electron main process entry point
├── preload.ts                  # Secure IPC bridge
├── ai/                         # AI integration layer
│   ├── index.ts               # Main AI service exports
│   ├── mcp-tools.ts           # MCP tool implementations
│   ├── config/                # AI configuration
│   │   └── index.ts
│   ├── providers/             # AI service providers
│   │   └── index.ts           # Google AI, OpenAI providers
│   ├── settings/              # AI settings management
│   │   ├── adapter.ts
│   │   └── index.ts
│   └── types/                 # AI type definitions
│       ├── index.ts
│       └── settings.ts
├── assets/                     # Static resources
│   ├── app-icon.png
│   ├── icon.ico
│   ├── notification.mp3
│   ├── setup-icon.ico
│   ├── tasky.png
│   └── tray-icon.png
├── components/                 # React component library
│   ├── SettingItem.tsx
│   ├── SettingSection.tsx
│   ├── ai-elements/           # AI-specific components
│   │   ├── index.ts
│   │   ├── response.tsx
│   │   ├── task.tsx
│   │   └── tool.tsx
│   ├── apps/                  # Application modules
│   │   ├── ApplicationsTab.tsx
│   │   ├── ChatModule.tsx
│   │   ├── PomodoroTaskList.tsx
│   │   └── PomodoroTimer.tsx
│   ├── avatar/                # Desktop companion
│   │   ├── avatarPresets.ts
│   │   ├── index.ts
│   │   ├── TaskyEventHandler.ts
│   │   └── TaskyGSAPAvatar.tsx
│   ├── chat/                  # Chat interface
│   │   ├── hooks/             # Chat-specific hooks
│   │   │   ├── useChatPersistence.ts
│   │   │   ├── useMcpTools.ts
│   │   │   └── useScroll.ts
│   │   ├── AdaptiveCardRenderer.tsx
│   │   ├── ChatComposer.tsx
│   │   ├── ChatHeader.tsx
│   │   ├── ConfirmOverlay.tsx
│   │   ├── index.ts
│   │   ├── InlineConfirmation.tsx
│   │   ├── McpToolsHelper.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageContainer.tsx
│   │   ├── MessageSkeleton.tsx
│   │   ├── TaskDisplay.tsx
│   │   ├── ToolCallDisplay.tsx
│   │   ├── ToolCallFlow.tsx
│   │   ├── ToolEventTimeline.tsx
│   │   └── types.ts
│   ├── tasks/                 # Task management UI
│   │   ├── index.ts
│   │   ├── TaskForm.tsx
│   │   ├── TaskList.tsx
│   │   └── TasksTab.tsx
│   └── ui/                    # Base UI components
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── checkbox.tsx
│       ├── collapsible.tsx
│       ├── CustomSwitch.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── LocationDateTime.tsx
│       ├── modal.tsx
│       └── select.tsx
├── core/                       # Business logic layer
│   ├── storage/               # Data persistence
│   │   ├── ChatSqliteStorage.ts
│   │   ├── ITaskStorage.ts
│   │   ├── JsonTaskStorage.ts
│   │   ├── ReminderSqliteStorage.ts
│   │   └── SqliteTaskStorage.ts
│   └── task-manager/          # Task engine
│       ├── events.ts
│       ├── index.ts
│       └── tasky-engine.ts
├── electron/                   # Electron main process
│   ├── agent-executor.ts      # AI agent execution
│   ├── assistant-preload.ts   # Desktop companion preload
│   ├── assistant-script.ts    # Companion script injection
│   ├── assistant.ts           # Desktop companion logic
│   ├── notification-utility.ts
│   ├── pomodoro-service.ts
│   ├── scheduler.ts           # Reminder scheduling
│   ├── storage.ts             # Data persistence
│   └── task-manager.ts        # Task orchestration
├── lib/                        # Utility libraries
│   ├── chat-diagnostic.ts
│   ├── chat-terminal-commands.ts
│   ├── logger.ts
│   └── utils.ts
├── renderer/                   # React frontend
│   ├── dist/                  # Built assets
│   ├── App.css
│   ├── App.tsx                # Main application component
│   ├── csp-config.js
│   ├── index.html
│   ├── renderer.tsx           # React root
│   └── tsconfig.renderer.tsbuildinfo
├── styles/                     # Global styles
│   ├── avatar-gsap.css        # Avatar animations
│   ├── chat-animations.css    # Chat UI animations
│   └── theme.css              # Perano color theme
└── types/                      # TypeScript definitions
    ├── css.d.ts
    ├── electron.ts
    ├── index.ts
    ├── pomodoro.ts
    └── task.ts

tasky-mcp-agent/               # MCP server
├── src/
│   └── mcp-server.ts         # MCP protocol implementation
├── package.json
├── README.md
└── tsconfig.json
```

### Key Services

- **TaskyEngine**: Central task management with CRUD operations, filtering, and analytics
- **ReminderScheduler**: Cron-based scheduling with timezone support
- **TaskyAssistant**: GSAP-powered animated desktop companion
- **ChatSqliteStorage**: Persistent chat transcript management
- **PomodoroService**: Integrated productivity timer
- **NotificationUtility**: Cross-platform desktop notifications

### HTTP Bridge
The main process runs a lightweight HTTP server on `http://localhost:7844` for MCP integration:
- `POST /execute-task` → Execute tasks via external AI agents
- `POST /notify-task-created` → Trigger creation notifications
- `POST /notify-reminder-created` → Trigger reminder notifications

### MCP Agent
Standalone Node.js service (`tasky-mcp-agent/`) that exposes Tasky functionality via stdio:
- Compatible with any MCP-enabled client (Cursor, Claude Desktop, etc.)
- Shares the same SQLite database for real-time synchronization
- Provides comprehensive CRUD operations and task execution

## 📊 Data Model

All dates are stored as ISO strings and converted to `Date` objects in-memory for consistent timezone handling.

### TaskyTask Schema
```typescript
interface TaskyTask {
  // Core Properties
  id: string;                    // Unique identifier
  title: string;                 // Task title
  description?: string;          // Optional description
  dueDate?: Date;               // Due date/time
  createdAt: Date;              // Creation timestamp
  updatedAt?: Date;             // Last modification
  
  // Organization
  tags?: string[];              // Categorization tags
  affectedFiles?: string[];     // Related file paths
  dependencies?: string[];      // Prerequisite task IDs
  
  // Execution
  estimatedDuration?: number;   // Minutes
  assignedAgent?: 'gemini' | 'claude';
  executionPath?: string;       // Working directory
  
  // Status & Results
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW' | 'ARCHIVED';
  result?: string;              // Execution output
  completedAt?: Date;           // Completion timestamp
  
  // Reminders
  reminderEnabled?: boolean;    // Enable notifications
  reminderTime?: string;        // HH:MM format
  
  // Metadata
  metadata?: {
    version: number;
    createdBy: string;
    lastModified: Date;
    archivedAt?: Date;
  };
}
```

### Reminder Schema
```typescript
interface Reminder {
  id: string;
  message: string;
  time: string;                 // HH:MM format
  days: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  enabled: boolean;
  oneTime?: boolean;            // Single occurrence
  timezone?: string;            // IANA timezone
}
```

## Creating tasks

- UI: use the Task form in the app
- IPC: `window.electronAPI.invoke('task:create', createTaskInput)`
- Import: `window.electronAPI.invoke('task:import', { filePath | tasks })` supporting JSON/CSV/YAML/XML
- MCP: see “MCP integration” below

## Executing tasks (AI agents)

```ts
window.electronAPI.invoke('task:execute', taskId, { agent: 'claude' | 'gemini' })
```

What happens:

- Builds a structured prompt from the task details
- Resolves the working directory to `schema.executionPath` (relative to project root if needed)
- Opens a terminal and pipes the prompt to the selected CLI
  - Windows prefers WSL if available, otherwise PowerShell
  - macOS/Linux use Terminal/Bash
- Creates a sentinel file `.tasky/status/done-<id>` on success to auto‑complete the task

## MCP integration

Install and build the agent:

```bash
npm run agent:build
```

Example MCP client config (Cursor `mcp-config.json`):

```json
{
  "mcpServers": {
    "tasky-command": {
      "type": "command",
      "command": "node",
      "args": ["tasky-mcp-agent/dist/mcp-server.js"],
      "cwd": ".",
      "env": {
        "TASKY_DB_PATH": "data/tasky.db"
      },
      "disabled": false
    }
  }
}
```

Notes:

- The Tasky app must be running for full execution via `POST /execute-task`. If it’s not, the MCP agent falls back to status updates only.
- Ensure the MCP agent and the app share the same `TASKY_DB_PATH`.

