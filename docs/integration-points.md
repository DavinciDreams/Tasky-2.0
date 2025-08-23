# Avatar Integration Points - How It Actually Works

## 🔌 Existing Integration Points

Your avatar system is **already connected** to Tasky's core systems! Here's exactly where the magic happens:

## 1. MCP Tools (Already Working!)

### Your Existing Code in `src/ai/mcp-tools.ts`:
```typescript
function emitToolEvent(id: string, phase: string, name: string, args?: any, output?: string): void {
  try {
    (window as any).dispatchEvent(new CustomEvent('tasky:tool', { 
      detail: { 
        id, 
        phase, 
        name, 
        args, 
        output: phase === 'done' ? output : undefined,
        error: phase === 'error' ? output : undefined
      } 
    }));
  } catch {}
}
```

### Avatar Response (Automatic):
```typescript
// In TaskyEventHandler.ts - already listening!
window.addEventListener('tasky:tool', (event: CustomEvent) => {
  const { phase, name, args, output, error } = event.detail;
  
  switch (phase) {
    case 'start':
      this.handleToolStart(name, args);  // Avatar shows 'focused' or 'thinking'
      break;
    case 'done':
      this.handleToolSuccess(name, args, output);  // Avatar celebrates!
      break;
    case 'error':
      this.handleToolError(name, args, error);  // Avatar shows error sequence
      break;
  }
});
```

### Real Example - User Creates Task via Chat:

**User types:** `"Create a task called 'Buy milk'"`

**What happens automatically:**

1. **Tool starts** (`executeMcpTool` calls `emitToolEvent('start')`)
   ```typescript
   emitToolEvent(id, 'start', 'tasky_create_task', { title: 'Buy milk' });
   ```
   **Avatar:** Switches to `focused` emotion (locks position, subtle pulse)

2. **Tool succeeds** (`executeMcpTool` calls `emitToolEvent('done')`)
   ```typescript
   emitToolEvent(id, 'done', 'tasky_create_task', args, taskResult);
   ```
   **Avatar:** Plays `taskCreated` sequence (excited → happy → idle)

3. **User sees:** Avatar focuses, gets excited, jumps with joy, then returns to peaceful floating

## 2. Task Events (Need Simple Addition)

### Add to your task creation/update functions:

```typescript
// In your task management code, add these event dispatches:

// When creating a task
const createTask = (taskData) => {
  const newTask = await yourExistingCreateFunction(taskData);
  
  // 🎯 ADD THIS LINE:
  window.dispatchEvent(new CustomEvent('task:created', { detail: newTask }));
  
  return newTask;
};

// When completing a task  
const updateTask = (taskId, updates) => {
  const updatedTask = await yourExistingUpdateFunction(taskId, updates);
  
  // 🎯 ADD THIS LINE:
  if (updates.status === 'COMPLETED') {
    window.dispatchEvent(new CustomEvent('task:completed', { detail: updatedTask }));
  }
  
  return updatedTask;
};

// When task becomes overdue (in your reminder/scheduler system)
const checkOverdueTasks = () => {
  const overdue = getOverdueTasks();
  
  overdue.forEach(task => {
    // 🎯 ADD THIS LINE:
    window.dispatchEvent(new CustomEvent('task:overdue', { detail: task }));
  });
};
```

## 3. Reminder Events (Need Simple Addition)

### Add to your reminder system:

```typescript
// When reminder triggers
const triggerReminder = (reminder) => {
  // Your existing notification logic
  showNotification(reminder);
  
  // 🎯 ADD THIS LINE:
  window.dispatchEvent(new CustomEvent('reminder:triggered', { detail: reminder }));
};

// When user snoozes reminder
const snoozeReminder = (reminderId, minutes) => {
  // Your existing snooze logic
  rescheduleReminder(reminderId, minutes);
  
  // 🎯 ADD THIS LINE:
  window.dispatchEvent(new CustomEvent('reminder:snoozed', { 
    detail: { id: reminderId, snoozeMinutes: minutes }
  }));
};
```

## 4. Voice Events (Future Integration)

### When you add voice features:

```typescript
// Voice system integration points
const voiceSystem = {
  startListening: () => {
    // Your voice logic
    window.dispatchEvent(new CustomEvent('voice:listening'));
  },
  
  processInput: () => {
    // Your AI processing
    window.dispatchEvent(new CustomEvent('voice:processing'));
  },
  
  speak: (text, audioLevel) => {
    // Your TTS logic
    window.dispatchEvent(new CustomEvent('voice:speaking', { 
      detail: { audioLevel } 
    }));
  },
  
  stopListening: () => {
    window.dispatchEvent(new CustomEvent('voice:idle'));
  }
};
```

## 🎯 What Works RIGHT NOW

### ✅ Already Working (No Code Changes Needed):
- **All MCP tool calls** via chat (create, update, delete, list tasks/reminders)
- **Tool errors** and success states
- **Avatar navigation** on click
- **Hover effects** and interactions
- **App startup** sequence

### Example - Try This Right Now:
1. Open your Tasky app
2. Go to Chat tab  
3. Type: `"Create a task called 'Test the avatar'"`
4. **Watch the avatar:**
   - Focuses when tool starts
   - Gets excited then happy when task is created
   - Returns to idle after celebration

**It works immediately!** 🎉

## 🔧 Easy Additions for Full Integration

### Add 3-5 lines to get complete integration:

**In your task form submission:**
```typescript
const handleSubmit = async (taskData) => {
  const newTask = await createTask(taskData);
  window.dispatchEvent(new CustomEvent('task:created', { detail: newTask })); // ← ADD
};
```

**In your task completion handler:**
```typescript
const handleTaskComplete = async (taskId) => {
  const task = await updateTask(taskId, { status: 'COMPLETED' });
  window.dispatchEvent(new CustomEvent('task:completed', { detail: task })); // ← ADD
};
```

**In your reminder notification system:**
```typescript
const showReminder = (reminder) => {
  showNotification(reminder);
  window.dispatchEvent(new CustomEvent('reminder:triggered', { detail: reminder })); // ← ADD
};
```

## 🎭 Complete Avatar Behavior Map

| Your Code Action | Event Dispatched | Avatar Response |
|------------------|------------------|-----------------|
| **MCP tool starts** | `tasky:tool` (start) | focused/thinking |
| **MCP tool succeeds** | `tasky:tool` (done) | excited → happy |
| **MCP tool fails** | `tasky:tool` (error) | error → confused |
| **Task form submit** | `task:created` | excited → happy |
| **Check task complete** | `task:completed` | happy + confetti |
| **Task overdue check** | `task:overdue` | confused → error |
| **Reminder fires** | `reminder:triggered` | excited → speaking |
| **User snoozes** | `reminder:snoozed` | sleeping |
| **App loads** | `app:startup` | sleeping → wake up |
| **User clicks avatar** | - | attention → navigate |

## 🚀 The Result

With just a few event dispatches added to your existing functions, you get:

✅ **Contextual celebrations** for every accomplishment  
✅ **Visual feedback** for all system operations  
✅ **Emotional connection** that makes productivity fun  
✅ **Intuitive navigation** through avatar interaction  
✅ **Consistent presence** across all app views  

Your Tasky PNG becomes a **living productivity companion** that makes users excited to get things done! 🎉

## 📋 Quick Integration Checklist

- [x] **MCP tools** - Already working via existing `emitToolEvent`!
- [ ] **Task creation** - Add `task:created` event dispatch  
- [ ] **Task completion** - Add `task:completed` event dispatch
- [ ] **Overdue check** - Add `task:overdue` event dispatch
- [ ] **Reminders** - Add `reminder:triggered` event dispatch
- [ ] **Voice (future)** - Add voice events when implementing

**Most features work immediately, full integration is just 3-5 lines of code!** 🎯
