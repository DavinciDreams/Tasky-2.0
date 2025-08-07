# Looper CLI Task Management System

This directory contains the task management system for the Looper CLI with streamlined task execution flow.

## Schema Overview

The task schema has been simplified to focus on essential information only. Each task contains:

### Required Fields
- **id**: Unique task identifier
- **title**: Brief description of what needs to be done
- **description**: Detailed description of the task
- **category**: Task category (FRONTEND, BACKEND, DATABASE, API, etc.)
- **priority**: Priority level (0=Low, 1=Medium, 2=High, 3=Critical)
- **createdAt**: When the task was created

### Optional Fields
- **affectedFiles**: Array of files that will be modified by this task

## Files

### `schema.json`
JSON Schema definition that validates the structure of task files. This ensures consistency and helps with tooling integration.

### `tasks.json`
Example tasks file showing the expected format. You can:
- Edit this file directly to add new tasks
- Use the TUI to create tasks through the interface
- Import/export tasks using the task manager

## Usage

### Creating Tasks
1. **Through TUI**: Use the Task Manager interface for guided task creation
2. **Direct editing**: Modify `tasks.json` directly following the schema
3. **Import**: Import tasks from other JSON files

### Managing Tasks
- **List**: View all tasks with filtering options
- **Edit**: Modify existing tasks through the TUI
- **Delete**: Remove tasks with confirmation
- **Export**: Save tasks to external files

## Task Categories

- **FRONTEND**: UI/UX related tasks
- **BACKEND**: Server-side logic and APIs
- **DATABASE**: Database schema and queries
- **API**: API endpoints and integration
- **UI_UX**: User interface and experience
- **PERFORMANCE**: Optimization tasks
- **SECURITY**: Security-related improvements
- **TESTING**: Test creation and maintenance
- **DOCUMENTATION**: Documentation updates
- **DEVOPS**: Deployment and infrastructure
- **BUG_FIX**: Bug fixes
- **FEATURE**: New feature development
- **REFACTOR**: Code refactoring
- **MAINTENANCE**: General maintenance tasks

## Priority Levels

- **0 (Low)**: Nice to have, can wait
- **1 (Medium)**: Normal priority, should be done soon
- **2 (High)**: Important, needs attention
- **3 (Critical)**: Urgent, must be done immediately

## Example Task

```json
{
  "id": "task_example_001",
  "title": "Fix navigation menu alignment",
  "description": "The main navigation menu is not properly aligned on mobile devices. Need to adjust CSS to ensure proper responsive behavior.",
  "category": "FRONTEND",
  "priority": 2,
  "affectedFiles": [
    "src/components/Navigation.tsx",
    "src/styles/navigation.css"
  ],
  "createdAt": "2024-12-29T15:00:00.000Z"
}
```

## Integration

The task system integrates with:
- **TUI**: Terminal user interface for task management
- **Agent System**: Automated task execution
- **Git Integration**: Track affected files and changes
- **Export/Import**: JSON-based task portability

Happy task management! 🚀 