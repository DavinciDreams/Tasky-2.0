# tasky_delete_reminder

## Description
Permanently deletes a Tasky reminder by ID, removing all associated schedule data and references.

## Purpose
Remove reminders from the system when they are no longer needed. This is a destructive operation that cannot be undone and requires explicit user confirmation.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | ✅ | Reminder ID to delete |

## UI Flow

1. **User Input:** "Delete reminder ABC123" or "Remove my daily email reminder"
2. **AI Processing:** Identifies reminder ID to delete
3. **Tool Call:** `mcpCall` invoked with reminder ID
4. **⚠️ Confirmation Required:** User sees destructive action warning
5. **Confirmation Dialog:** Shows:
   - Reminder details to be deleted (message, schedule)
   - Warning about permanent removal
   - Impact on notification schedule
6. **Execution:** Upon user approval, reminder permanently removed
7. **Result Display:** Confirmation message with deletion summary

## Database Operations

```sql
-- Transaction ensures referential integrity
BEGIN TRANSACTION;

-- Delete associated days first (foreign key constraint)
DELETE FROM reminder_days WHERE reminder_id = ?;

-- Delete the main reminder record
DELETE FROM reminders WHERE id = ?;

COMMIT;
```

## UI Components

- **ConfirmOverlay:** Enhanced confirmation dialog with:
  - ⚠️ Destructive action warning
  - Reminder details preview (message, time, days)
  - Schedule impact summary
  - "This action cannot be undone" message
  - Explicit "Delete Reminder" / "Cancel" buttons
- **ToolCallDisplay:** Shows deletion operation status
- **AdaptiveCardRenderer:** Displays confirmation result
- **MessageContainer:** Integrates deletion result in chat

## MCP Request Example

```bash
curl -X POST http://localhost:7845/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 11,
    "method": "tools/call",
    "params": {
      "name": "tasky_delete_reminder",
      "arguments": {
        "id": "reminder_20250907_164500_abc123"
      }
    }
  }'
```

## Response Format

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Reminder deleted successfully"
      }
    ]
  }
}
```

## Confirmation Flow

### Step 1: Tool Request
```
User: "Delete my email reminder"
AI: Identifies reminder and calls tasky_delete_reminder
```

### Step 2: Confirmation Dialog
```
⚠️ Delete Reminder

Message: Check emails and respond to urgent items
Schedule: Weekdays at 9:00 AM
Next: Tomorrow at 9:00 AM

This action cannot be undone.
All notification schedules will be permanently removed.

[Delete Reminder] [Cancel]
```

### Step 3: Result Display
```
✅ Reminder Deleted

Successfully deleted reminder:
"Check emails and respond to urgent items"

• Removed main reminder record
• Deleted weekday schedule (5 days)
• Cleared from notification system
• No further notifications will fire
```

## Schedule Impact Analysis

The confirmation dialog shows the impact of deletion:

| Schedule Type | Impact Description |
|---------------|-------------------|
| Daily | "No more daily notifications at [time]" |
| Weekdays | "No more weekday notifications at [time]" |
| Weekends | "No more weekend notifications at [time]" |
| Custom days | "No more notifications on [day list] at [time]" |
| One-time | "Scheduled notification cancelled" |

## Cascading Deletions

| Component | Action |
|-----------|---------|
| Reminder Record | Permanently removed from `reminders` table |
| Schedule Days | All days deleted from `reminder_days` table |
| Notification Queue | Pending notifications cancelled |
| Chat History | Tool results preserved in conversation |
| Related Tasks | Task reminders remain separate |

## Error Handling

| Error | Cause | Response |
|-------|--------|----------|
| Missing ID | `id` parameter not provided | `{"content": [{"type": "text", "text": "id is required"}], "isError": true}` |
| Reminder not found | ID doesn't exist | Silent success (idempotent operation) |
| Database error | SQLite operation failure | Transaction rollback with error details |
| Foreign key violation | Constraint issues | Error message with relationship details |

## Security Considerations

- **Confirmation Required:** Always requires explicit user approval
- **No Bulk Delete:** Single reminder deletion only
- **Audit Trail:** Deletion logged in chat history
- **Transaction Safety:** Atomic operation prevents partial deletions
- **User Intent:** AI must clearly identify reminder to delete

## Transaction Details

```sql
-- Atomic deletion transaction
BEGIN IMMEDIATE TRANSACTION;

-- Validate reminder exists (optional)
SELECT COUNT(*) FROM reminders WHERE id = ?;

-- Delete days first to satisfy foreign key constraints  
DELETE FROM reminder_days WHERE reminder_id = ?;

-- Delete main reminder record
DELETE FROM reminders WHERE id = ?;

-- Commit all changes atomically
COMMIT;
```

## Common Usage Patterns

### Direct ID Deletion
- "Delete reminder ABC123"
- "Remove reminder with ID XYZ789"

### Natural Language Deletion
- "Delete my morning email reminder" (AI resolves to ID)
- "Remove the weekend planning reminder"  
- "Cancel my daily standup notification"

### Schedule-Based Requests
- "Delete all my 9 AM reminders" → Requires individual confirmations
- "Remove weekend reminders" → User must specify which ones

## Recovery Options

⚠️ **Important:** Reminder deletion is permanent. No built-in recovery options exist.

**Prevention Measures:**
- Always show reminder details in confirmation
- Require explicit user approval
- Consider disabling instead of deleting
- Display schedule impact clearly
- Backup database before bulk operations

**Alternative to Deletion:**
- **Disable Reminder:** `tasky_update_reminder` with `enabled: false`
- **Temporary Pause:** Keep reminder but stop notifications

## Performance Impact

- **Fast Operation:** Single transaction with minimal queries
- **Index Usage:** Benefits from primary key lookup
- **Minimal I/O:** Only affected records modified
- **Lock Duration:** Brief exclusive lock during transaction
- **Notification Cleanup:** Scheduler automatically handles removed reminders

## Integration with Notification System

Deleted reminders immediately affect the notification scheduler:
- **Queue Removal:** Pending notifications cancelled
- **Schedule Update:** Next occurrence calculations updated
- **Memory Cleanup:** Reminder data purged from active memory
- **Log Update:** Deletion logged for debugging

## Natural Language Processing

The AI handles various deletion requests:

### Specific Identification
- "Delete reminder ID ABC123" → Direct ID match
- "Remove my 9 AM email reminder" → Time + content match
- "Cancel the weekday standup notification" → Schedule + content match

### Ambiguous Requests
- "Delete my morning reminders" → AI asks for clarification
- "Remove all my reminders" → AI requires individual confirmation
- "Cancel notifications" → AI clarifies scope

## Related Operations

### Alternatives to Deletion
- **Disable:** `tasky_update_reminder` with `enabled: false`
- **Modify:** `tasky_update_reminder` to change schedule/content
- **Temporary:** Disable during vacations, re-enable later

### Bulk Operations  
- **List First:** Use `tasky_list_reminders` to review candidates
- **Individual Deletion:** Each deletion requires separate confirmation
- **Batch Scripts:** External tools for administrative bulk operations

## Implementation Details

- **Tool Handler:** `tasky-mcp-agent/src/mcp-server.ts:297-319`
- **Database Logic:** `tasky-mcp-agent/src/utils/reminder-bridge.ts` 
- **UI Confirmation:** `src/components/chat/ConfirmOverlay.tsx`
- **Result Display:** `src/components/chat/AdaptiveCardRenderer.tsx`

## Best Practices

1. **Confirm Before Delete:** Always show reminder details and schedule
2. **Consider Alternatives:** Disable vs. delete for temporary needs
3. **Document Reason:** Add context to chat about why deleting
4. **Schedule Awareness:** Understand impact on notification patterns
5. **Backup Important:** Consider backup before bulk deletions

## Related Components

- `tasky-mcp-agent/src/mcp-server.ts:297-319` - Tool definition and handler
- `tasky-mcp-agent/src/utils/reminder-bridge.ts` - Database deletion logic  
- `src/components/chat/ConfirmOverlay.tsx` - Destructive action confirmation
- `src/ai/mcp-tools.ts:102-111` - Confirmation logic for destructive operations