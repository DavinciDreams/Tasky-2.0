# Looper CLI MCP Agent

<div align="center">

![MCP Agent](https://img.shields.io/badge/MCP-Agent-blue?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?style=for-the-badge&logo=typescript)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)

**🔌 Model Context Protocol Integration for Looper CLI**

*Seamlessly manage tasks through AI conversations*

</div>

---

A Model Context Protocol (MCP) agent that provides AI assistants with powerful tools to interact with the Looper CLI task management system. This agent enables natural language task management through AI conversations while maintaining full synchronization with the CLI interface.

## 🌟 Overview

This MCP agent bridges AI assistants with the Looper CLI, enabling them to:

- **🎯 Create and manage tasks** in repository contexts through natural conversation
- **📊 Track task progress** and statistics in real-time
- **🚀 Execute task workflows** with AI agent integration
- **📋 Maintain project organization** through intelligent task categorization
- **🔄 Real-time synchronization** with CLI and TUI interfaces
- **🌐 Cross-platform support** for all major operating systems

## ✨ Features

### 🎯 **Task Management**
- **Create, read, update, and delete tasks** through natural language
- **Filter and search tasks** by status, category, priority
- **Track task dependencies** and affected files automatically
- **Manage task approval workflows** with human-in-the-loop integration
- **Bulk operations** for efficient task management
- **Task templates** for consistent task creation

### 📊 **Repository Analysis**
- **Detect project type, framework, and language** automatically
- **Analyze project structure** and important files
- **Identify package managers** and build tools
- **Extract Git repository information** and branch status
- **Find configuration files** and documentation
- **Assess project health** and complexity metrics

### 📈 **Statistics & Insights**
- **Task distribution** by status, category, and priority
- **Project health metrics** and workflow efficiency
- **Progress tracking** with completion rates
- **Time estimation** and duration analysis
- **Team productivity** insights

### 🔧 **Integration**
- **Seamless integration** with Looper CLI and TUI
- **Real-time task file synchronization** with automatic conflict resolution
- **Cross-platform compatibility** (Windows, macOS, Linux)
- **Multiple MCP client support** (Claude Desktop, Cursor, etc.)
- **Bi-directional sync** between MCP and CLI interfaces

## 🚀 Installation

### Prerequisites

- **Node.js 18.0.0 or higher**
- **Looper CLI installed and configured** (main project)
- **MCP-compatible AI assistant** (Claude Desktop, Cursor, etc.)

### Quick Start

```bash
# Navigate to the MCP agent directory
cd looper-mcp-agent

# Install dependencies
npm install

# Build the project
npm run build

# Verify the build
npm run start --help
```

### From Source (Development)

```bash
# Clone the main Looper CLI repository
git clone <repository-url>
cd Looper_CLI/looper-mcp-agent

# Install dependencies
npm install

# Build the project
npm run build

# Optional: Install globally for system-wide access
npm install -g .
```

### From NPM (when published)

```bash
npm install -g @looper/mcp-agent
```

### Verification

```bash
# Test the MCP agent
node dist/index.js --help

# Should output MCP server information
```

## ⚙️ Configuration

### MCP Client Configuration

Add the agent to your MCP client configuration:

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "looper-cli": {
      "command": "node",
      "args": ["/absolute/path/to/looper-mcp-agent/dist/index.js"],
      "cwd": "/absolute/path/to/your/project",
      "env": {
        "NODE_ENV": "production",
        "MCP_VERSION": "1.1"
      }
    }
  }
}
```

#### Cursor

Cursor uses MCP natively [[memory:2250502]]. Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "looper-cli": {
      "command": "node",
      "args": ["C:/Users/username/path/to/looper-mcp-agent/dist/index.js"],
      "cwd": "C:/Users/username/path/to/your/project",
      "env": {
        "NODE_ENV": "production",
        "MCP_VERSION": "1.1"
      }
    }
  }
}
```

#### Other MCP Clients

Configure according to your client's documentation, using:
- **Command**: `node`
- **Args**: `["/absolute/path/to/looper-mcp-agent/dist/index.js"]`
- **Working Directory**: Your project root (absolute path)
- **Environment**: Optional environment variables

### Configuration Files

The repository includes example configurations:

#### `mcp-config.json` (Example)
```json
{
  "mcpServers": {
    "looper-cli": {
      "command": "node",
      "args": ["C:/Users/trave/Desktop/Open Code Mission/Looper_CLI/looper-mcp-agent/dist/index.js"],
      "cwd": "C:/Users/trave/Desktop/Open Code Mission/Looper_CLI",
      "env": {
        "NODE_ENV": "production",
        "MCP_VERSION": "1.1"
      }
    }
  }
}
```

### Environment Variables

```bash
# Optional: Set default project path
LOOPER_PROJECT_PATH=/path/to/your/project

# Optional: Enable debug logging
DEBUG=looper-mcp-agent

# Optional: Set Node environment
NODE_ENV=production

# Optional: MCP version
MCP_VERSION=1.1
```

### Path Configuration

**⚠️ Important:** Always use **absolute paths** in MCP configuration:

```bash
# ✅ Correct (absolute path)
"args": ["/Users/username/projects/looper-cli/looper-mcp-agent/dist/index.js"]

# ❌ Incorrect (relative path)
"args": ["./looper-mcp-agent/dist/index.js"]
```

## 🛠️ Available Tools

The MCP agent provides a comprehensive set of tools for task management and repository analysis:

### Task Management

#### `looper_create_task`
Create a new task in the Looper CLI system.

**Parameters:**
- `title` (required): Task title
- `description`: Detailed description
- `category` (required): Task category (FRONTEND, BACKEND, API, etc.)
- `priority` (required): Priority level (0=Low, 1=Medium, 2=High, 3=Critical)
- `affectedFiles`: Array of file paths
- `estimatedDuration`: Duration in minutes
- `dependencies`: Array of task IDs

**Categories Available:**
- `FRONTEND` - UI/UX related tasks
- `BACKEND` - Server-side logic
- `DATABASE` - Database operations
- `API` - API development
- `UI_UX` - Design and user experience
- `PERFORMANCE` - Optimization tasks
- `SECURITY` - Security improvements
- `TESTING` - Test creation and maintenance
- `DOCUMENTATION` - Documentation tasks
- `CONFIG` - Configuration changes
- `REFACTOR` - Code refactoring
- `BUGFIX` - Bug fixes
- `FEATURE` - New feature development

**Example:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication to the API",
  "category": "BACKEND",
  "priority": 2,
  "affectedFiles": ["src/auth/", "src/middleware/"],
  "estimatedDuration": 120
}
```

#### `looper_list_tasks`
List tasks with optional filtering.

**Parameters:**
- `status`: Filter by status array
- `category`: Filter by category array
- `priority`: Filter by priority array
- `search`: Text search in titles/descriptions
- `limit`: Maximum results (default: 20)
- `offset`: Skip results (default: 0)

#### `looper_get_task`
Get detailed information about a specific task.

**Parameters:**
- `taskId` (required): The task ID to retrieve

#### `looper_update_task`
Update an existing task.

**Parameters:**
- `taskId` (required): Task ID to update
- Plus any fields from `create_task` to update

#### `looper_delete_task`
Delete a task.

**Parameters:**
- `taskId` (required): Task ID to delete

#### `looper_execute_task`
Execute a task using AI agents (Claude or Gemini) in a new terminal window.

**Parameters:**
- `taskId` (required): Task ID to execute
- `provider`: AI provider to use ('claude' or 'gemini', default: 'claude')

#### `looper_run_next_task`
🚀 **NEW** Execute the next available pending task automatically using Claude Code agent. This is a non-interactive mode designed specifically for MCP usage with no manual steps or human-in-the-loop requirements.

**Parameters:**
- `autoApprove`: Automatically approve the task before execution (default: true)

**Features:**
- ✅ **No manual steps required** - Fully automated execution
- ✅ **Auto-selects Claude Code agent** - Optimized for complex tasks
- ✅ **Bypasses human-in-the-loop confirmations** - MCP-controlled workflow
- ✅ **Runs in dedicated terminal window** - Non-blocking execution
- ✅ **Designed for MCP automation** - Perfect for AI assistant control

**Use Cases:**
- AI assistants managing task queues automatically
- Continuous integration workflows
- Automated development assistance
- Hands-off task processing

**Example Response:**
```
🚀 Next Task Execution Started (MCP Mode)

Selected Task: Fix responsive design on mobile
Agent: Claude Code (Auto-selected)
Mode: Non-Interactive MCP Mode
Auto-Approved: Yes

Task Details:
- ID: fix_responsive_mobile_001
- Description: Update CSS media queries for mobile devices
- Category: FRONTEND
- Priority: 2
- Files: src/styles/responsive.css, src/components/Header.tsx

Execution Features:
✅ No manual steps required
✅ Auto-selects Claude Code agent
✅ Bypasses human-in-the-loop confirmations
✅ Runs in dedicated terminal window
✅ Designed for MCP automation

Status: Launched in new terminal window
The task will execute automatically without any user interaction required.
Use looper_get_task to check completion status afterward.
```

### Repository Analysis

#### `looper_analyze_repository`
Analyze repository and get context information.

**Returns:**
- Project type and framework detection
- Primary programming language
- Package manager information
- Git repository status
- Important configuration files

**Parameters:**
- `repositoryPath`: Path to analyze (default: current directory)

#### `looper_get_project_structure`
Get project structure as a tree.

**Returns:**
- Hierarchical directory structure
- File counts and types
- Important directories highlighted

**Parameters:**
- `repositoryPath`: Repository path (default: current directory)
- `maxDepth`: Maximum traversal depth (default: 3)

#### `looper_find_important_files`
Find important configuration and documentation files.

**Returns:**
- Configuration files (package.json, tsconfig.json, etc.)
- Documentation files (README.md, docs/, etc.)
- Build and deployment files

**Parameters:**
- `repositoryPath`: Repository path (default: current directory)

### Statistics & Utilities

#### `looper_get_statistics`
Get comprehensive task statistics and overview.

**Returns:**
- Task distribution by status, category, priority
- Completion rates and progress metrics
- Time estimation summaries
- Project health indicators

#### `looper_get_next_pending_task`
Get the next pending task by priority.

**Returns:**
- Highest priority pending task
- Task details and context
- Recommended execution approach

#### `looper_initialize`
Initialize Looper CLI in a repository.

**Parameters:**
- `repositoryPath`: Repository path (default: current directory)

**Actions:**
- Creates `tasks/` directory structure
- Generates `tasks.json` and `schema.json`
- Sets up initial project configuration

## 💬 Usage Examples

### Creating a Task

```
👤 User: Create a task to implement user authentication with JWT

🤖 AI: I'll create that task for you using the Looper CLI.

Using looper_create_task:
{
  "title": "Implement JWT Authentication",
  "description": "Add JWT-based authentication with login/logout endpoints",
  "category": "BACKEND",
  "priority": 2,
  "affectedFiles": ["src/auth/auth.controller.ts", "src/middleware/auth.middleware.ts"],
  "estimatedDuration": 180
}

✅ Task created successfully!
- ID: implement_jwt_authentication_20241204_120000_a1b2c3d4
- Title: Implement JWT Authentication
- Category: BACKEND
- Priority: 2
- Status: PENDING

The task has been added to your project's task queue and will sync with the CLI interface.
```

### Analyzing Repository

```
👤 User: Can you analyze my project structure and tell me what type of project this is?

🤖 AI: I'll analyze your repository structure for you.

Using looper_analyze_repository:

🔍 Repository Analysis:
- Path: /Users/dev/my-project
- Project Type: Node.js Project
- Primary Language: TypeScript
- Framework: Express.js
- Package Manager: npm
- Git Repository: Yes
- Current Branch: main
- Modified Files: 3 file(s)
- Dependencies: 45 packages
- Dev Dependencies: 12 packages

This appears to be a TypeScript Express.js backend project with a well-structured codebase.
```

### Getting Task Statistics

```
👤 User: Show me an overview of all my tasks

🤖 AI: Here's a comprehensive overview of your project tasks.

Using looper_get_statistics:

📊 Task Statistics:
- Total Tasks: 15

By Status:
- PENDING: 8
- IN_PROGRESS: 2
- COMPLETED: 4
- NEEDS_REVIEW: 1

By Category:
- BACKEND: 6
- FRONTEND: 4
- API: 3
- TESTING: 2

By Priority:
- Critical: 1
- High: 4
- Medium: 7
- Low: 3

Recent Activity:
- 3 tasks completed this week
- 2 tasks currently in progress
- Average completion time: 2.5 hours
```

### Filtering Tasks

```
👤 User: Show me all pending frontend tasks

🤖 AI: I'll find all pending frontend tasks for you.

Using looper_list_tasks:
{
  "status": ["PENDING"],
  "category": ["FRONTEND"],
  "limit": 10
}

Found 3 pending frontend tasks:

**Fix responsive design on mobile** (fix_responsive_mobile_001)
- Status: PENDING
- Category: FRONTEND
- Priority: 2
- Created: 2024-12-03
- Affected Files: src/components/Header.tsx, src/styles/responsive.css

**Implement dark mode toggle** (implement_dark_mode_002)
- Status: PENDING
- Category: FRONTEND
- Priority: 1
- Created: 2024-12-02
- Affected Files: src/contexts/ThemeContext.tsx

**Add loading spinners** (add_loading_spinners_003)
- Status: PENDING
- Category: FRONTEND
- Priority: 1
- Created: 2024-12-01
- Affected Files: src/components/LoadingSpinner.tsx
```

### Executing Tasks

```
👤 User: Execute the highest priority pending task

🤖 AI: I'll execute the next high-priority task for you.

Using looper_execute_task:
{
  "taskId": "fix_responsive_mobile_001",
  "provider": "claude"
}

🚀 Task Execution Started:
- Task: Fix responsive design on mobile
- Provider: Claude Code
- Terminal: New terminal window opened
- Status: IN_PROGRESS

The task is now being executed by Claude Code in a new terminal window. You can monitor progress there and the task status will be updated automatically.
```

### Automated Task Execution (MCP Mode)

```
👤 User: Just run the next task automatically, I don't want to choose anything

🤖 AI: I'll run the next pending task automatically for you using the optimized MCP mode.

Using looper_run_next_task:
{
  "autoApprove": true
}

🚀 Next Task Execution Started (MCP Mode)

Selected Task: Implement user authentication
Agent: Claude Code (Auto-selected)
Mode: Non-Interactive MCP Mode
Auto-Approved: Yes

Task Details:
- ID: implement_user_auth_004
- Description: Add JWT-based authentication with login/logout endpoints
- Category: BACKEND
- Priority: 2
- Files: src/auth/auth.controller.ts, src/middleware/auth.middleware.ts

Execution Features:
✅ No manual steps required
✅ Auto-selects Claude Code agent
✅ Bypasses human-in-the-loop confirmations
✅ Runs in dedicated terminal window
✅ Designed for MCP automation

Status: Launched in new terminal window
The task will execute automatically without any user interaction required.
Use looper_get_task to check completion status afterward.
```

## 🔄 Integration with Looper CLI

The MCP agent seamlessly integrates with the existing Looper CLI ecosystem:

### Synchronization Features

1. **🔄 Shared Task Files**: Uses the same `tasks/tasks.json` format for perfect compatibility
2. **⚡ Real-time Sync**: Changes are immediately visible in both MCP and CLI interfaces
3. **🤝 Compatible Workflows**: Works alongside CLI commands and TUI without conflicts
4. **🚀 Agent Execution**: Can trigger AI agent execution through Looper CLI
5. **📊 Live Updates**: Status changes sync instantly across all interfaces
6. **🔒 Conflict Resolution**: Intelligent merging when simultaneous changes occur

### Workflow Examples

#### Hybrid Workflow
1. **AI creates tasks** using MCP agent through conversation
2. **Human reviews** tasks in Looper CLI TUI
3. **AI agent executes** tasks via `looper run` command
4. **Status updates** sync across all interfaces in real-time

#### AI-First Workflow
1. **AI analyzes** repository structure via MCP
2. **AI creates** comprehensive task breakdown
3. **AI executes** tasks using MCP `looper_execute_task`
4. **Human monitors** progress in CLI/TUI

#### CLI-First Workflow
1. **Human creates** tasks using `looper add`
2. **AI reviews** tasks via MCP `looper_list_tasks`
3. **AI suggests** improvements or dependencies
4. **Collaborative execution** using both interfaces

### Cross-Interface Compatibility

| Feature | CLI | TUI | MCP Agent |
|---------|-----|-----|-----------|
| Create Tasks | ✅ | ✅ | ✅ |
| List/Filter Tasks | ✅ | ✅ | ✅ |
| Update Tasks | ✅ | ✅ | ✅ |
| Execute Tasks | ✅ | ✅ | ✅ |

## 🛠️ Development

### Building

```bash
npm run build        # Build TypeScript to dist/
npm run build:watch  # Watch mode for development
npm run dev          # Development mode with tsx
npm run start        # Run compiled version
npm run clean        # Clean dist/ directory
```

### Testing

```bash
npm test            # Run tests
npm run test:watch  # Watch mode
npm run lint        # Lint code
npm run lint:fix    # Auto-fix linting issues
```

### Development Scripts

```bash
# Development workflow
npm run dev          # Start in development mode
npm run build:watch  # Build and watch for changes

# Production workflow
npm run clean        # Clean previous build
npm run build        # Build for production
npm run start        # Start production server

# Quality assurance
npm run lint         # Check code quality
npm run typecheck    # TypeScript type checking
```

### Project Structure

```
looper-mcp-agent/
├── src/
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts     # MCP-specific types
│   ├── utils/           # Utility classes
│   │   ├── task-manager.ts      # Task management logic
│   │   └── repository-analyzer.ts # Repository analysis
│   ├── tools/           # MCP tool implementations
│   │   └── index.ts     # Tool definitions and handlers
│   └── index.ts         # Main MCP server entry point
├── dist/                # Compiled JavaScript (generated)
├── tasks/               # Task storage (created at runtime)
│   └── tasks.json       # Task database
├── package.json         # NPM configuration
├── tsconfig.json        # TypeScript configuration
└── README.md           # This file
```

### Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │◄──►│   MCP Agent     │◄──►│  Looper CLI     │
│  (Claude, etc.) │    │   (This Tool)   │    │   (Main App)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Conversation  │    │   Task Tools    │    │   tasks.json    │
│   Interface     │    │   Repository    │    │   (Shared)      │
│                 │    │   Analysis      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Troubleshooting

### Common Issues

#### "Cannot find tasks.json"
**Cause:** Repository not initialized with Looper CLI
**Solution:**
```bash
# Initialize Looper CLI in your project
looper init

# Or use MCP tool
looper_initialize
```

#### "MCP connection failed"
**Cause:** Configuration or build issues
**Solution:**
```bash
# 1. Verify the agent is built
cd looper-mcp-agent
npm run build

# 2. Check paths in MCP config (use absolute paths)
# 3. Verify Node.js version (18.0.0+)
node --version

# 4. Test the agent directly
node dist/index.js
```

#### "Permission denied"
**Cause:** File system permissions
**Solution:**
```bash
# Check file permissions
ls -la tasks/tasks.json

# Fix permissions if needed
chmod 644 tasks/tasks.json
chmod 755 tasks/

# Ensure MCP agent has access to project directory
```

#### "Task execution failed"
**Cause:** Missing AI CLI tools or configuration
**Solution:**
```bash
# Install required AI tools
npm install -g @anthropic/claude-cli
# or
npm install -g @google/gemini-cli

# Verify installation
claude --version
gemini --version
```

### Debug Mode

Enable debug logging:

```bash
# Method 1: Environment variable
DEBUG=looper-mcp-agent node dist/index.js

# Method 2: Set in MCP config
{
  "mcpServers": {
    "looper-cli": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "DEBUG": "looper-mcp-agent"
      }
    }
  }
}
```

### Logs

The MCP agent logs to stderr (visible in MCP client logs):

```
🔄 Looper CLI MCP Agent started successfully
📋 Available tools:
  - looper_create_task: Create a new task in the Looper CLI system
  - looper_list_tasks: List tasks with optional filtering
  - looper_get_task: Get a specific task by ID
  - looper_update_task: Update an existing task
  - looper_delete_task: Delete a task
  - looper_execute_task: Execute a task using AI agents
🚀 Ready to manage tasks!
```

### Validation

Test your MCP setup:

```bash
# 1. Build and test the agent
npm run build
node dist/index.js

# 2. Check MCP client logs for connection
# 3. Test a simple command through AI assistant:
#    "Create a test task"

# 4. Verify task file creation
ls -la tasks/tasks.json
```

### Performance Issues

#### Slow task operations
- **Large task files**: Consider archiving completed tasks
- **File system performance**: Ensure SSD storage for better I/O
- **Network latency**: Use local MCP client when possible

#### Memory usage
- **Large repositories**: Use `maxDepth` parameter in analysis tools
- **Many tasks**: Consider pagination with `limit` and `offset`

## 🤝 Contributing

We welcome contributions to the Looper CLI MCP Agent! Here's how to get started:

### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/looper-cli.git
   cd looper-cli/looper-mcp-agent
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-mcp-feature
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Make your changes**
   - Follow TypeScript best practices
   - Add tests for new functionality
   - Update documentation as needed

5. **Test your changes**
   ```bash
   npm run build
   npm run lint
   npm test
   ```

6. **Commit and push**
   ```bash
   git commit -m 'Add amazing MCP feature'
   git push origin feature/amazing-mcp-feature
   ```

7. **Open a Pull Request**

### Development Guidelines

- **Code Style**: Follow existing TypeScript patterns
- **Testing**: Maintain test coverage above 80%
- **Documentation**: Update README and inline comments
- **MCP Compatibility**: Ensure compatibility with MCP specification
- **Backwards Compatibility**: Don't break existing tool interfaces

### Adding New Tools

1. **Define the tool** in `src/tools/index.ts`
2. **Implement the handler** with proper error handling
3. **Add TypeScript types** in `src/types/index.ts`
4. **Write tests** for the new functionality
5. **Update documentation** in this README

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Type checking
npm run typecheck
```

## 📄 License

This project is licensed under the same terms as Looper CLI - **PROPRIETARY**.

All rights reserved by Open Code Mission. For licensing inquiries, please contact: Contact@ocmxai.com

## 🆘 Support

For issues and questions:

1. **Check the [Troubleshooting](#-troubleshooting) section**
2. **Review [Looper CLI documentation](../README.md)**
3. **Search existing issues** in the repository
4. **Open a new issue** with detailed information:
   - MCP client type and version
   - Node.js version
   - Operating system
   - Complete error messages
   - Steps to reproduce

### Getting Help

- **Documentation**: Start with this README and the main Looper CLI docs
- **Issues**: Use GitHub issues for bug reports and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas

---

<div align="center">

**Made with ❤️ for the Looper CLI ecosystem** 

*Bridging AI Conversations with Task Management*

![Looper CLI](https://img.shields.io/badge/Looper-CLI-cyan?style=for-the-badge)
![MCP](https://img.shields.io/badge/MCP-Compatible-blue?style=for-the-badge)

</div> 