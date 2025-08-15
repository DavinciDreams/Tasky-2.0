# 🛠️ Tasky Tool Call Flow Examples

Complete documentation of how each MCP tool works from user input to execution.

## Tool Call Architecture

```
User Input → AI Processing → Tool Call → MCP Server → Bridge → Database → Response → UI Update
```

1. **User Input**: Natural language request
2. **AI Processing**: Extract parameters using enhanced system prompt
3. **Tool Call**: `mcpCall` with structured arguments
4. **MCP Server**: Receives JSON-RPC call on port 7844
5. **Bridge**: TaskBridge or ReminderBridge handles database operations
6. **Database**: SQLite operations (INSERT/UPDATE/DELETE/SELECT)
7. **Response**: Structured JSON response back through chain
8. **UI Update**: Real-time updates via IPC events

---

## Task Management Tools

### 1. tasky_create_task

**User Input:**
```
"Create a task called 'Fix login bug' with description 'The login form is not validating passwords correctly'"
```

**AI Response:**
```
Plan: I'll create a new task with the specified title and description.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_create_task",
  "args": {
    "title": "Fix login bug",
    "description": "The login form is not validating passwords correctly"
  }
}
```

**Flow:**
1. AI extracts title and description from natural language
2. `mcpCall` sends POST to `http://localhost:7844/mcp`
3. MCP server calls `taskBridge.createTask(args)`
4. TaskBridge inserts into SQLite database
5. Returns created task JSON
6. UI shows confirmation and updates task list

---

### 2. tasky_list_tasks

**User Input:**
```
"Show me all my pending tasks"
```

**AI Response:**
```
Plan: I'll list all tasks filtered by pending status.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_list_tasks",
  "args": {
    "status": "pending"
  }
}
```

**Flow:**
1. AI identifies filter criteria (status = pending)
2. MCP server calls `taskBridge.listTasks({status: "pending"})`
3. TaskBridge queries SQLite with WHERE status = 'PENDING'
4. Returns array of matching tasks
5. AI formats and displays the task list

---

### 3. tasky_update_task

**User Input:**
```
"Mark task 'fix-login-bug-abc123' as in progress"
```

**AI Response:**
```
Plan: I'll update the specified task status to in progress.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_update_task",
  "args": {
    "id": "fix-login-bug-abc123",
    "status": "in_progress"
  }
}
```

**Flow:**
1. AI extracts task ID and new status
2. MCP server calls `taskBridge.updateTask({id, updates: {status}})`
3. TaskBridge runs SQL UPDATE on tasks table
4. Returns updated task object
5. UI reflects status change

---

### 4. tasky_execute_task

**User Input:**
```
"Start working on task 'fix-login-bug-abc123'"
```

**AI Response:**
```
Plan: I'll execute the specified task to begin work on it.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_execute_task",
  "args": {
    "id": "fix-login-bug-abc123",
    "status": "IN_PROGRESS"
  }
}
```

**Flow:**
1. AI identifies task to execute
2. MCP server calls `taskBridge.executeTask(args)`
3. TaskBridge makes HTTP call to main app's `/execute-task` endpoint
4. Main app launches external agent (Claude/Gemini) to work on task
5. Task status updated to IN_PROGRESS
6. Returns execution confirmation

---

### 5. tasky_delete_task

**User Input:**
```
"Delete the task with ID 'old-task-xyz789'"
```

**AI Response:**
```
Plan: I'll delete the specified task from your task list.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_delete_task",
  "args": {
    "id": "old-task-xyz789"
  }
}
```

**Flow:**
1. AI extracts task ID to delete
2. MCP server calls `taskBridge.deleteTask({id})`
3. TaskBridge runs SQL DELETE on tasks and task_tags tables
4. Returns success confirmation
5. UI removes task from display

---

## Reminder Management Tools

### 6. tasky_create_reminder

**User Input:**
```
"Remind me to call mom in 10 minutes"
```

**AI Response:**
```
Plan: I'll create a one-time reminder to call mom in 10 minutes.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_create_reminder",
  "args": {
    "message": "call mom",
    "time": "in 10 minutes",
    "days": ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"],
    "oneTime": true
  }
}
```

**Flow:**
1. AI parses "call mom" as message, "in 10 minutes" as time
2. Sets oneTime=true for relative times
3. MCP server calls `reminderBridge.createReminder(args)`
4. ReminderBridge inserts into SQLite reminders table
5. Main app scheduler picks up new reminder
6. Returns success confirmation

---

### 7. tasky_list_reminders

**User Input:**
```
"What reminders do I have set up?"
```

**AI Response:**
```
Plan: I'll list all your current reminders.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_list_reminders",
  "args": {}
}
```

**Flow:**
1. AI calls list without filters
2. MCP server calls `reminderBridge.listReminders()`
3. ReminderBridge queries all reminders from SQLite
4. Returns array of reminder objects with message, time, days, enabled status
5. AI formats and displays reminder list

---

### 8. tasky_update_reminder

**User Input:**
```
"Disable the reminder with ID 'rem-call-mom-456'"
```

**AI Response:**
```
Plan: I'll disable the specified reminder.

[Calls mcpCall tool]
```

**Tool Execution:**
```json
{
  "name": "tasky_update_reminder",
  "args": {
    "id": "rem-call-mom-456",
    "enabled": false
  }
}
```

**Flow:**
1. AI extracts reminder ID and enabled=false
2. MCP server calls `reminderBridge.updateReminder({id, updates})`
3. ReminderBridge runs SQL UPDATE on reminders table
4. Main app scheduler updates reminder status
5. Returns updated reminder object

---

### 9. tasky_delete_reminder

**User Input:**
```
"Remove the daily standup reminder"
```

**AI Response:**
```
Plan: I need to find and delete the daily standup reminder. Let me first list reminders to find the ID.

[First calls tasky_list_reminders, then tasky_delete_reminder]
```

**Tool Execution:**
```json
{
  "name": "tasky_delete_reminder",
  "args": {
    "id": "rem-standup-789"
  }
}
```

**Flow:**
1. AI may first list reminders to find the right ID
2. Extracts reminder ID to delete
3. MCP server calls `reminderBridge.deleteReminder({id})`
4. ReminderBridge runs SQL DELETE on reminders table
5. Main app scheduler removes reminder from schedule
6. Returns success confirmation

---

## Technical Implementation Details

### MCP Server (Port 7844)
- Receives JSON-RPC calls from chat AI
- Routes to appropriate bridge functions
- Handles error responses and validation
- Returns structured content arrays

### Task Bridge
- Manages SQLite operations for tasks table
- Generates unique task IDs from titles
- Handles tags via separate task_tags table
- Notifies main app of task changes via HTTP

### Reminder Bridge
- Manages SQLite operations for reminders table
- Supports one-time and recurring reminders
- Parses relative time expressions
- Integrates with main app scheduler

### Database Schema
```sql
-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','NEEDS_REVIEW','ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  due_date TEXT,
  -- ... other fields
);

-- Reminders  
CREATE TABLE reminders (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  time TEXT NOT NULL,
  days TEXT NOT NULL, -- JSON array
  enabled INTEGER NOT NULL DEFAULT 1,
  one_time INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Error Handling
- All tools include try/catch with structured error responses
- Invalid IDs return `{isError: true}` responses
- Missing required parameters are validated
- Database errors are caught and returned as error messages

### UI Integration
- Real-time updates via Electron IPC events
- Toast notifications for confirmations
- Automatic list refreshes after operations
- Visual feedback during tool execution

---

## Usage Tips

1. **Natural Language**: Use conversational language - the AI will extract parameters
2. **Task IDs**: For updates/deletes, you can reference tasks by partial title if unique
3. **Relative Times**: "in X minutes/hours" automatically creates one-time reminders
4. **Status Updates**: Use natural terms like "mark as done", "start working on", etc.
5. **Batch Operations**: The AI can handle multiple operations in sequence

Each tool follows the same pattern but with specific database operations and validation rules appropriate for its function.
