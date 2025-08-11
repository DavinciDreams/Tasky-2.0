# Tasky MCP Agent - Tools Documentation

This document provides comprehensive documentation for all Model Context Protocol (MCP) tools available in the Tasky MCP Agent. Each tool is designed to interact with the Tasky task and reminder management system through standardized interfaces.

## Overview

The Tasky MCP Agent provides **12 tools** organized into two main categories:
- **Task Management** (6 tools)
- **Reminder Management** (6 tools)

All tools follow MCP 2025-03-26 protocol standards and provide JSON-based responses with appropriate error handling.

---

## Task Management Tools

### 1. tasky_create_task

**Purpose**: Create a new task in the Tasky system

**How it works**: 
- Generates a unique task ID based on title, timestamp, and UUID
- Creates a task with comprehensive metadata and schema structure
- Stores the task in the JSON file-based storage system
- Supports optional fields for enhanced task management

**Technical Details**:
- **Input Schema**: 
  ```json
  {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" },
      "dueDate": { "type": "string", "description": "ISO datetime" },
      "tags": { "type": "array", "items": { "type": "string" } },
      "affectedFiles": { "type": "array", "items": { "type": "string" } },
      "estimatedDuration": { "type": "number" },
      "dependencies": { "type": "array", "items": { "type": "string" } },
      "reminderEnabled": { "type": "boolean" },
      "reminderTime": { "type": "string" },
      "assignedAgent": { "type": "string" },
      "executionPath": { "type": "string" }
    },
    "required": ["title"]
  }
  ```
- **Returns**: Complete task object with generated ID and metadata
- **Storage**: Atomic write to `tasky-tasks.json` with backup mechanism
- **ID Format**: `{title_prefix}_{timestamp}_{uuid8}`

**Reusability**: 
- Can be integrated into any MCP-compatible client
- Supports batch operations through multiple calls
- Thread-safe with atomic file operations
- Extensible schema for custom fields

---

### 2. tasky_update_task

**Purpose**: Update an existing task's properties and status

**How it works**:
- Locates task by ID in the storage system
- Applies selective updates to task properties
- Handles both schema-level and top-level field updates
- Automatically updates timestamps and version metadata
- Manages status transitions (e.g., PENDING → IN_PROGRESS → COMPLETED)

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "updates": {
        "type": "object",
        "properties": {
          "status": { "type": "string", "enum": ["PENDING","IN_PROGRESS","COMPLETED","NEEDS_REVIEW","ARCHIVED"] },
          "reminderEnabled": { "type": "boolean" },
          "reminderTime": { "type": "string" },
          "result": { "type": "string" },
          "humanApproved": { "type": "boolean" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "dueDate": { "type": "string", "description": "ISO datetime" },
          "tags": { "type": "array", "items": { "type": "string" } },
          "affectedFiles": { "type": "array", "items": { "type": "string" } },
          "estimatedDuration": { "type": "number" },
          "dependencies": { "type": "array", "items": { "type": "string" } },
          "assignedAgent": { "type": "string" },
          "executionPath": { "type": "string" }
        }
      }
    },
    "required": ["id", "updates"]
  }
  ```
- **Field Categories**:
  - **Schema Fields**: title, description, dueDate, tags, affectedFiles, estimatedDuration, dependencies, assignedAgent, executionPath
  - **Top-Level Fields**: status, reminderEnabled, reminderTime, result, humanApproved
- **Auto-completion**: Sets `completedAt` timestamp when status changes to COMPLETED

**Reusability**:
- Supports partial updates (only specified fields are changed)
- Version tracking for audit trails
- Status workflow management
- Extensible for custom update logic

---

### 3. tasky_delete_task

**Purpose**: Remove a task from the system

**How it works**:
- Locates task by ID in the storage
- Removes task from the tasks array
- Performs atomic write to persist changes
- Returns confirmation of deletion

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" }
    },
    "required": ["id"]
  }
  ```
- **Returns**: Success confirmation object
- **Error Handling**: Returns error if task not found

**Reusability**:
- Safe deletion with existence verification
- Atomic operation prevents data corruption
- Can be used for bulk deletion through iteration

---

### 4. tasky_get_task

**Purpose**: Retrieve a specific task by ID

**How it works**:
- Searches the task storage for the specified ID
- Returns complete task object with all metadata
- Provides resource link to the underlying storage file
- Includes human-readable summary

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" }
    },
    "required": ["id"]
  }
  ```
- **Returns**: Multi-part response with:
  - Text summary
  - Complete JSON task object
  - Resource link to storage file
- **Resource Link**: Provides file URI for direct access

**Reusability**:
- Detailed task information retrieval
- File system integration through resource links
- Suitable for task detail views
- Debugging and inspection capabilities

---

### 5. tasky_list_tasks

**Purpose**: Retrieve multiple tasks with filtering and pagination

**How it works**:
- Loads all tasks from storage
- Applies multiple filter criteria (status, tags, search, date range)
- Sorts results by due date and creation time
- Supports pagination with offset and limit
- Returns filtered and paginated results

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "status": { "type": "array", "items": { "type": "string" } },
      "tags": { "type": "array", "items": { "type": "string" } },
      "search": { "type": "string" },
      "dueDateFrom": { "type": "string" },
      "dueDateTo": { "type": "string" },
      "limit": { "type": "number" },
      "offset": { "type": "number" }
    }
  }
  ```
- **Filtering**:
  - **Status**: Filter by one or more task statuses
  - **Tags**: Filter by tasks containing any of the specified tags
  - **Search**: Text search in title and description
  - **Date Range**: Filter by due date range
- **Sorting**: Due date ascending, then creation date descending
- **Pagination**: Offset-based with configurable limit

**Reusability**:
- Flexible querying system
- Performance-optimized with pagination
- Multiple filter combinations
- Suitable for dashboard and list views

---

### 6. tasky_execute_task

**Purpose**: Execute a task by updating its status to IN_PROGRESS or COMPLETED

**How it works**:
- Simplified wrapper around task update functionality
- Specifically designed for status transitions during task execution
- Automatically sets status based on the execution state
- Uses the update task mechanism internally

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "status": { "type": "string", "enum": ["IN_PROGRESS", "COMPLETED"] }
    },
    "required": ["id"]
  }
  ```
- **Default Behavior**: Sets status to IN_PROGRESS if not specified
- **Internal**: Calls `updateTask` with status update

**Reusability**:
- Simplified execution interface
- Workflow integration friendly
- Task runner compatibility
- Status transition management

---

## Reminder Management Tools

### 7. tasky_create_reminder

**Purpose**: Create a new reminder with scheduling information

**How it works**:
- Generates unique reminder ID with timestamp and random suffix
- Creates reminder with message, time, and day scheduling
- Stores in the configuration file alongside other settings
- Supports multi-day scheduling and enable/disable states

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "message": { "type": "string" },
      "time": { "type": "string" },
      "days": { "type": "array", "items": { "type": "string" } },
      "enabled": { "type": "boolean" }
    },
    "required": ["message", "time", "days"]
  }
  ```
- **ID Format**: `rem_{timestamp}_{random6}`
- **Storage**: JSON configuration file
- **Default**: Reminders are enabled by default

**Reusability**:
- Flexible scheduling system
- Multi-day support
- Integration with notification systems
- Bulk creation support

---

### 8. tasky_update_reminder

**Purpose**: Update an existing reminder's properties

**How it works**:
- Locates reminder by ID in the configuration storage
- Applies updates to specified fields
- Maintains creation timestamp while updating modification time
- Supports partial updates

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "updates": { "type": "object" }
    },
    "required": ["id", "updates"]
  }
  ```
- **Update Fields**: Any combination of message, time, days, enabled
- **Timestamp Management**: Updates `updatedAt` automatically

**Reusability**:
- Flexible update system
- Partial modification support
- Audit trail with timestamps
- Schedule modification capabilities

---

### 9. tasky_delete_reminder

**Purpose**: Remove a reminder from the system

**How it works**:
- Locates reminder by ID
- Removes from the reminders array
- Persists changes to configuration file
- Returns deletion confirmation

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" }
    },
    "required": ["id"]
  }
  ```
- **Returns**: Success confirmation
- **Safety**: Verifies reminder exists before deletion

**Reusability**:
- Safe deletion with verification
- Atomic configuration updates
- Bulk deletion support through iteration

---

### 10. tasky_get_reminder

**Purpose**: Retrieve a specific reminder by ID

**How it works**:
- Searches reminder configuration for specified ID
- Returns complete reminder object
- Provides human-readable summary
- Includes resource link to configuration file

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" }
    },
    "required": ["id"]
  }
  ```
- **Returns**: Multi-part response with summary, JSON, and resource link
- **Resource Link**: Direct access to configuration file

**Reusability**:
- Detailed reminder inspection
- Configuration file access
- Debugging capabilities
- Integration with reminder editors

---

### 11. tasky_list_reminders

**Purpose**: Retrieve multiple reminders with filtering options

**How it works**:
- Loads all reminders from configuration
- Applies filtering based on enabled status, specific day, and text search
- Returns filtered results with count summary
- Provides configuration file access

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "enabled": { "type": "boolean" },
      "day": { "type": "string" },
      "search": { "type": "string" }
    }
  }
  ```
- **Filtering**:
  - **Enabled**: Filter by enabled/disabled status
  - **Day**: Filter by reminders scheduled for specific day
  - **Search**: Text search in reminder messages
- **Returns**: Count summary and reminder array

**Reusability**:
- Flexible reminder querying
- Schedule-based filtering
- Dashboard integration
- Notification system compatibility

---

### 12. tasky_toggle_reminder

**Purpose**: Enable or disable a reminder

**How it works**:
- Locates reminder by ID
- Updates the enabled status to the specified value
- Updates modification timestamp
- Returns updated reminder object

**Technical Details**:
- **Input Schema**:
  ```json
  {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "enabled": { "type": "boolean" }
    },
    "required": ["id", "enabled"]
  }
  ```
- **State Management**: Direct boolean control over enabled state
- **Timestamp**: Updates `updatedAt` on toggle

**Reusability**:
- Simple state management
- Quick enable/disable operations
- Notification system integration
- Bulk state changes support

---

## Architecture and Storage

### File-Based Storage
- **Tasks**: `tasky-tasks.json` - Structured task storage with metadata
- **Reminders**: `tasky-config-v2.json` - Configuration including reminders and settings

### Data Integrity
- **Atomic Writes**: All file operations use temporary files and atomic renames
- **Backup Strategy**: Corrupt file detection with timestamp-based backups
- **Validation**: Schema validation on read/write operations

### Error Handling
- **Consistent Format**: All errors return MCP-compliant error objects
- **Graceful Degradation**: Missing files are automatically created
- **Detailed Logging**: Comprehensive error messages for debugging

### Performance Considerations
- **In-Memory Operations**: Data loaded into memory for filtering and sorting
- **Efficient Serialization**: JSON with optimized date handling
- **Minimal I/O**: Batch operations where possible

---

## Integration Examples

### Basic Task Creation
```javascript
const result = await mcpClient.call('tasky_create_task', {
  title: 'Review PR #123',
  description: 'Review the authentication changes',
  tags: ['review', 'urgent'],
  estimatedDuration: 45
});
```

### Task Workflow Management
```javascript
// Start working on a task
await mcpClient.call('tasky_execute_task', {
  id: 'task_id',
  status: 'IN_PROGRESS'
});

// Complete the task
await mcpClient.call('tasky_update_task', {
  id: 'task_id',
  updates: {
    status: 'COMPLETED',
    result: 'Successfully reviewed and approved PR'
  }
});
```

### Reminder Scheduling
```javascript
// Create daily standup reminder
await mcpClient.call('tasky_create_reminder', {
  message: 'Daily standup meeting',
  time: '09:00',
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  enabled: true
});
```

### Advanced Querying
```javascript
// Get urgent tasks due this week
const tasks = await mcpClient.call('tasky_list_tasks', {
  tags: ['urgent'],
  dueDateFrom: '2025-01-13T00:00:00Z',
  dueDateTo: '2025-01-19T23:59:59Z',
  status: ['PENDING', 'IN_PROGRESS']
});
```

---

## Testing and Validation

The Tasky MCP Agent includes comprehensive testing tools:

1. **test-comprehensive.js**: Full test suite with logging for all 12 tools
2. **validate-tools.js**: Schema and mapping validation
3. **test-http-client.js**: HTTP transport testing
4. **test-mcp-simple.js**: Basic MCP protocol testing

### Running Tests
```bash
# Comprehensive testing with full logging
LOG_LEVEL=DEBUG node test-comprehensive.js

# Schema validation
node validate-tools.js

# Basic functionality test
node test-http-client.js
```

---

## Conclusion

The Tasky MCP Agent provides a robust, well-documented set of tools for task and reminder management. Each tool is designed with reusability, error handling, and integration in mind. The comprehensive test suite ensures reliability, while the flexible architecture supports various use cases from simple task tracking to complex workflow management systems.

For implementation questions or feature requests, refer to the test files for usage examples and the source code for detailed technical specifications.
