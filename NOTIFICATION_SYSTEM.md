# Tasky Notification System

## Overview

Tasky now includes a comprehensive notification system that automatically notifies users when new tasks or reminders are created, whether through the GUI or MCP tools.

## Features

- **Automatic Notifications**: Get notified immediately when tasks or reminders are created
- **Multiple Notification Types**: 
  - Native system notifications (Windows, macOS, Linux)
  - Tasky assistant bubble notifications
  - Fallback notifications (console, Windows toast)
- **Dual Creation Paths**: Works for both GUI and MCP-created items
- **User Preferences**: Respects user's notification and sound settings
- **Clickable Notifications**: Click notifications to open the Tasky main window

## How It Works

### 1. GUI Creation Path

When you create a task or reminder through the Tasky interface:

1. **Task Creation**: `TaskForm` → `onCreateTask` → `window.electronAPI.createTask` → IPC `task:create`
2. **Reminder Creation**: `ReminderForm` → `onAddReminder` → `window.electronAPI.addReminder` → IPC `add-reminder`
3. **Notification**: The main process automatically shows a notification using `NotificationUtility`

### 2. MCP Creation Path

When you create a task or reminder using MCP tools:

1. **Task Creation**: `tasky_create_task` → `TaskBridge.createTask` → Direct SQLite + HTTP notification
2. **Reminder Creation**: `tasky_create_reminder` → `ReminderBridge.createReminder` → Direct SQLite + HTTP notification
3. **Notification**: MCP bridges call HTTP endpoints to trigger notifications in the main process

## Notification Types

### Task Creation Notifications
- **Title**: 📋 New Task Created
- **Content**: Task title and description (if provided)
- **Icon**: Tasky app icon

### Reminder Creation Notifications
- **Title**: 🔔 New Reminder Set
- **Content**: Reminder message, time, and days
- **Icon**: Tasky app icon

## Technical Implementation

### Core Components

1. **`NotificationUtility`** (`src/electron/notification-utility.ts`)
   - Centralized notification management
   - Supports multiple notification methods
   - Handles user preferences

2. **HTTP Endpoints** (`src/main.ts`)
   - `/notify-task-created` - For MCP task notifications
   - `/notify-reminder-created` - For MCP reminder notifications

3. **MCP Integration** (`tasky-mcp-agent/`)
   - TaskBridge and ReminderBridge call notification endpoints
   - Ensures notifications work regardless of creation method

### Notification Flow

```
Creation Event (GUI/MCP) → NotificationUtility → Multiple Outputs
                                                    ├── Native System Notification
                                                    ├── Tasky Assistant Bubble
                                                    └── Fallback Methods
```

## User Settings

The notification system respects these user settings:

- **Enable Notifications**: Global toggle for all notifications
- **Enable Sound**: Controls notification sound
- **Notification Type**: Legacy setting for compatibility
- **Assistant Settings**: Controls bubble notification appearance

## Testing

Use the included test script to verify notifications work:

```bash
node test-notifications.js
```

This will test both notification endpoints and show you if the system is working correctly.

## Troubleshooting

### Notifications Not Appearing

1. **Check Settings**: Ensure notifications are enabled in Tasky settings
2. **Check Permissions**: Verify system notification permissions
3. **Check HTTP Server**: Ensure Tasky is running and HTTP server is active on port 7844
4. **Check Logs**: Look for error messages in the console

### MCP Notifications Not Working

1. **Verify HTTP Endpoints**: Test with the provided test script
2. **Check Network**: Ensure localhost:7844 is accessible
3. **Check MCP Agent**: Verify the MCP agent is properly configured

## Future Enhancements

- **Notification History**: Track and display past notifications
- **Custom Notification Sounds**: User-selectable notification sounds
- **Notification Actions**: Quick actions from notification (complete task, snooze reminder)
- **Notification Scheduling**: Delay notifications for specific times
- **Cross-Device Sync**: Notifications across multiple devices

## API Reference

### NotificationUtility Methods

```typescript
// Show task creation notification
notificationUtility.showTaskCreatedNotification(title: string, description?: string)

// Show reminder creation notification
notificationUtility.showReminderCreatedNotification(message: string, time: string, days: string[])

// Toggle notifications globally
notificationUtility.toggleNotifications(enabled: boolean)

// Toggle sound globally
notificationUtility.toggleSound(enabled: boolean)
```

### HTTP Endpoints

```http
POST /notify-task-created
Content-Type: application/json

{
  "title": "Task Title",
  "description": "Task Description (optional)"
}

POST /notify-reminder-created
Content-Type: application/json

{
  "message": "Reminder Message",
  "time": "15:30",
  "days": ["monday", "wednesday", "friday"]
}
```

## Contributing

When adding new notification types or modifying the system:

1. Update the `NotificationOptions` interface
2. Add new methods to `NotificationUtility`
3. Update the HTTP endpoints if needed
4. Test both GUI and MCP paths
5. Update this documentation
