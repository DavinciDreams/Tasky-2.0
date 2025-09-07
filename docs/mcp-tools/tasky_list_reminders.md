# tasky_list_reminders

## Description
Lists all Tasky reminders with optional filtering by enabled status.

## Purpose
Query and display existing reminders to help users review their notification schedule. This is a read-only operation that provides comprehensive reminder visibility with schedule details.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enabled` | boolean | ❌ | Filter by enabled status (true = active only, false = disabled only, undefined = all) |

## UI Flow

1. **User Input:** "Show me my reminders" or "List all active reminders"
2. **Auto-Execution:** No confirmation needed (read-only operation)
3. **AI Processing:** Extracts filter requirements from natural language
4. **Tool Call:** `mcpCall` invoked with optional filter parameters
5. **Result Display:** Reminders shown as structured cards in chat
6. **Schedule Visualization:** Each reminder displays its schedule pattern
7. **Status Indicators:** Clear enabled/disabled visual status

## Database Operations

```sql
-- Main query to fetch reminders (handled by ReminderBridge)
SELECT * FROM reminders;

-- Fetch associated days for recurring reminders  
SELECT reminder_id, day FROM reminder_days;

-- Applied filters in application code:
-- - enabled status filtering
-- - sorting by creation date
-- - schedule pattern grouping
```

## MCP Request Examples

### List All Reminders
```bash
curl -X POST http://localhost:7844/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 7,
    "method": "tools/call",
    "params": {
      "name": "tasky_list_reminders",
      "arguments": {}
    }
  }'
```

### List Only Active Reminders
```bash
curl -X POST http://localhost:7844/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 8,
    "method": "tools/call",
    "params": {
      "name": "tasky_list_reminders",
      "arguments": {
        "enabled": true
      }
    }
  }'
```

### List Only Disabled Reminders
```bash
curl -X POST http://localhost:7844/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 9,
    "method": "tools/call",
    "params": {
      "name": "tasky_list_reminders",
      "arguments": {
        "enabled": false
      }
    }
  }'
```

## Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 3 reminders"
      },
      {
        "type": "text",
        "text": "[{\"id\":\"reminder_20250907_164500_abc123\",\"message\":\"Check emails and respond to urgent items\",\"time\":\"09:00\",\"days\":[\"monday\",\"tuesday\",\"wednesday\",\"thursday\",\"friday\"],\"enabled\":true,\"oneTime\":false,\"createdAt\":\"2025-09-07T16:45:00.000Z\",\"nextOccurrence\":\"2025-09-08T09:00:00.000Z\"},{\"id\":\"reminder_20250907_170000_def456\",\"message\":\"Take lunch break\",\"time\":\"12:30\",\"days\":[\"monday\",\"tuesday\",\"wednesday\",\"thursday\",\"friday\"],\"enabled\":true,\"oneTime\":false,\"createdAt\":\"2025-09-07T17:00:00.000Z\",\"nextOccurrence\":\"2025-09-08T12:30:00.000Z\"},{\"id\":\"reminder_20250907_180000_ghi789\",\"message\":\"Weekend planning session\",\"time\":\"10:00\",\"days\":[\"saturday\"],\"enabled\":false,\"oneTime\":false,\"createdAt\":\"2025-09-07T18:00:00.000Z\"}]"
      }
    ]
  }
}
```

## UI Components

- **MessageContainer:** Displays reminder list in chat timeline
- **AdaptiveCardRenderer:** Formats each reminder as a card with:
  - 📋 Reminder message
  - ⏰ Time display with AM/PM
  - 📅 Schedule pattern (weekday chips)
  - 🔔 Enabled/disabled status badge
  - ⏭️ Next occurrence time
  - 🔄 Recurring vs. one-time indicator
- **ToolCallDisplay:** Shows list operation status (minimal for read-only)

## Reminder Card Display Examples

### Active Weekday Reminder
```
🔔 Check emails and respond to urgent items

⏰ 9:00 AM
📅 Mon Tue Wed Thu Fri
⏭️ Next: Tomorrow at 9:00 AM
✅ Enabled
```

### Disabled Weekend Reminder  
```
📋 Weekend planning session

⏰ 10:00 AM  
📅 Sat
❌ Disabled
🔄 Recurring
```

### One-Time Reminder
```
⏰ Take a break

⏰ 3:10 PM
📅 One-time
⏭️ In 15 minutes
✅ Enabled
```

## Filter Examples

### Status-Based Filtering
- **All Active:** "Show my active reminders"
- **All Disabled:** "List disabled reminders" 
- **All Reminders:** "Show all my reminders"

### Natural Language Queries
- **By Schedule:** "What reminders do I have for weekdays?"
- **By Time:** "Show my morning reminders"
- **By Status:** "Which reminders are turned off?"

## Sorting and Organization

### Default Sorting
1. **Enabled Status:** Enabled reminders first
2. **Next Occurrence:** Soonest reminders first
3. **Creation Date:** Newer reminders first for ties

### Grouping Patterns
- **Daily Reminders:** Every day at same time
- **Weekday Reminders:** Monday-Friday pattern
- **Weekend Reminders:** Saturday-Sunday pattern
- **Custom Patterns:** Specific day combinations
- **One-Time:** Non-recurring reminders

## Schedule Pattern Recognition

The system recognizes common patterns for better display:

| Days | Display | Description |
|------|---------|-------------|
| All 7 days | "Daily" | Every day |
| Mon-Fri | "Weekdays" | Business days only |
| Sat-Sun | "Weekends" | Weekend days only |
| Specific days | Day chips | Custom pattern |
| Empty array | "One-time" | Non-recurring |

## Performance Considerations

- **Read-Only:** No database modifications, safe for frequent calls
- **Join Operation:** Days joined in application layer
- **Sorting:** Computed next occurrence for proper ordering
- **Filtering:** Applied after data fetch for simplicity
- **Caching:** No caching - always returns fresh data

## Next Occurrence Calculation

For recurring reminders, the system calculates the next occurrence:

```typescript
const calculateNextOccurrence = (time: string, days: string[]) => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  // Find next matching day
  const nextDay = findNextMatchingDay(days, now);
  
  // Set time
  nextDay.setHours(hours, minutes, 0, 0);
  
  return nextDay;
};
```

## Error Handling

| Error | Cause | Response |
|-------|--------|----------|
| Database error | SQLite query failure | Error message with database details |
| Invalid enabled value | Non-boolean enabled parameter | Type coercion or validation error |
| Empty result set | No reminders match filter | Empty array with count message |

## Common Use Cases

1. **Daily Review:** `{}` - Show all reminders for review
2. **Active Only:** `{"enabled": true}` - See what's currently working
3. **Maintenance:** `{"enabled": false}` - Find disabled reminders to clean up
4. **Schedule Planning:** Review patterns to avoid conflicts

## Integration with Main App

Listed reminders integrate with the notification system:
- **Next Occurrence:** Used by scheduler for timing
- **Enabled Status:** Only enabled reminders fire notifications
- **Message Content:** Displayed in system notifications
- **Pattern Recognition:** Helps users understand their schedule

## UI State Management

- **Auto-Refresh:** List updates when reminders are modified
- **Status Indicators:** Clear visual enabled/disabled state
- **Schedule Preview:** Shows upcoming notifications
- **Edit Actions:** Cards can link to update/delete operations

## Accessibility Features

- **Screen Reader:** Semantic markup for reminder cards
- **Color Coding:** Status indicators with text labels
- **Time Format:** Consistent 12/24-hour display based on locale
- **Keyboard Navigation:** Card focus and interaction support

## Related Components

- `tasky-mcp-agent/src/mcp-server.ts:244-266` - Tool definition and handler
- `tasky-mcp-agent/src/utils/reminder-bridge.ts` - Database query operations
- `src/components/chat/AdaptiveCardRenderer.tsx` - Reminder card display
- `src/components/chat/MessageContainer.tsx` - List integration in chat

## Best Practices

1. **Regular Review:** List reminders periodically to maintain relevance
2. **Status Management:** Disable instead of delete for temporary changes
3. **Pattern Recognition:** Group similar reminders for easier management
4. **Schedule Awareness:** Review to avoid notification overload
5. **Cleanup:** Regularly remove obsolete reminders