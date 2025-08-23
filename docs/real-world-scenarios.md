# Real-World Tasky Avatar Scenarios

## 🏠 Home Screen Experience

### Scenario 1: App Launch
**What happens:**
```typescript
// When user opens Tasky app
useEffect(() => {
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('app:startup'));
  }, 500);
}, []);
```

**User sees:**
1. Avatar starts in `sleeping` state (dim, slow breathing)
2. After 500ms, wake-up animation plays (scale up, brighten)
3. Avatar transitions to `idle` (gentle floating + breathing)
4. Welcome message appears: "Click me to navigate through apps!"

### Scenario 2: Navigation by Avatar Click
**User action:** Clicks the avatar on home screen

**Code executed:**
```typescript
const handleAvatarClick = () => {
  // 1. Play attention animation
  eventHandlerRef.current?.triggerAttention();
  
  // 2. Navigate after animation
  setTimeout(() => {
    const apps = ['home', 'tasks', 'reminders', 'chat'];
    const currentIndex = apps.indexOf(activeApp);
    const nextIndex = (currentIndex + 1) % apps.length;
    setActiveApp(apps[nextIndex]);
  }, 800);
};
```

**User sees:**
1. Avatar scales up to 115% with elastic bounce
2. Avatar wiggles left-right playfully  
3. Avatar returns to normal size with elastic effect
4. After 800ms, app switches to Tasks view
5. Small floating avatar appears in top-right corner

## 📋 Tasks View Experience

### Scenario 3: Creating Tasks via UI
**User action:** Fills out task form and clicks "Create Task"

**Behind the scenes:**
```typescript
const onCreateTask = (taskData) => {
  // Your existing task creation logic
  const newTask = await createTask(taskData);
  
  // This triggers the avatar celebration
  window.dispatchEvent(new CustomEvent('task:created', {
    detail: newTask
  }));
};
```

**Avatar response:**
1. **Excited state** (1 second): Rapid bouncing, scale pulsing
2. **Happy state** (2 seconds): Jump 20px up, 360° spin, heart particles
3. **Idle state**: Returns to gentle floating

### Scenario 4: Checking Off Completed Task
**User action:** Clicks checkbox next to "Buy groceries"

**Code flow:**
```typescript
const onUpdateTask = (taskId, updates) => {
  if (updates.status === 'COMPLETED') {
    // Update task in database
    await updateTask(taskId, updates);
    
    // Trigger celebration
    window.dispatchEvent(new CustomEvent('task:completed', {
      detail: { id: taskId, ...updates }
    }));
  }
};
```

**Avatar celebration:**
1. **Happy emotion** with jump and spin
2. **Confetti explosion**: 20 colorful particles burst outward
3. **Celebration lasts 4 seconds**
4. **Returns to idle** with satisfied floating

### Scenario 5: Task Becomes Overdue
**System check:** Daily cron job checks due dates

**Automatic trigger:**
```typescript
// In your task checking system
const checkOverdueTasks = () => {
  const overdueTasks = tasks.filter(task => 
    task.dueDate < new Date() && task.status !== 'COMPLETED'
  );
  
  overdueTasks.forEach(task => {
    window.dispatchEvent(new CustomEvent('task:overdue', {
      detail: task
    }));
  });
};
```

**Avatar shows concern:**
1. **Confused state** (2s): Wobbles left-right, shrinks to 90%
2. **Error state** (2s): Shakes horizontally, red tint flash  
3. **Returns to idle**: But user knows something needs attention

## 💬 Chat View Experience

### Scenario 6: Using MCP Tools via Chat
**User types:** "Create a task called 'Prepare presentation' due tomorrow"

**MCP tool execution:**
```typescript
// Your existing mcpCall function gets invoked
// Events are automatically dispatched:

// 1. Tool starts
window.dispatchEvent(new CustomEvent('tasky:tool', {
  detail: { 
    phase: 'start', 
    name: 'tasky_create_task', 
    args: { title: 'Prepare presentation', dueDate: tomorrow }
  }
}));

// 2. Tool succeeds  
window.dispatchEvent(new CustomEvent('tasky:tool', {
  detail: { 
    phase: 'done', 
    name: 'tasky_create_task',
    output: JSON.stringify(newTask)
  }
}));
```

**Avatar sequence:**
1. **Focused state**: Locks position, subtle pulse (user sees avatar "concentrating")
2. **Excited → Happy**: Rapid bounce → jump + spin (task created successfully!)
3. **Duration**: 3 seconds total celebration
4. **Returns to idle**: Ready for next command

### Scenario 7: MCP Tool Error
**User types:** "List all my tasks" (but MCP server is down)

**Error handling:**
```typescript
// When MCP call fails
window.dispatchEvent(new CustomEvent('tasky:tool', {
  detail: { 
    phase: 'error', 
    name: 'tasky_list_tasks',
    error: 'MCP server connection failed'
  }
}));
```

**Avatar error sequence:**
1. **Error state** (2s): Shakes side-to-side, red tint flash
2. **Confused state** (2s): Wobbles uncertainly, slight shrink
3. **Returns to idle**: User understands something went wrong

## ⏰ Reminders Experience

### Scenario 8: Reminder Notification
**System trigger:** 3:00 PM reminder "Team standup meeting"

**Notification system:**
```typescript
// Your reminder system triggers this
const triggerReminder = (reminder) => {
  // Show system notification
  showNotification(reminder);
  
  // Animate avatar
  window.dispatchEvent(new CustomEvent('reminder:triggered', {
    detail: reminder
  }));
};
```

**Avatar announcement:**
1. **Excited state** (1.5s): Rapid bouncing to get attention
2. **Speaking state** (3s): Audio-reactive bouncing as if announcing
3. **Returns to idle**: Mission accomplished

### Scenario 9: Snoozing Reminder
**User action:** Clicks "Snooze 15 minutes" on reminder popup

**Snooze handling:**
```typescript
const snoozeReminder = (reminderId, minutes) => {
  // Reschedule reminder
  rescheduleReminder(reminderId, minutes);
  
  // Show avatar going to sleep
  window.dispatchEvent(new CustomEvent('reminder:snoozed', {
    detail: { id: reminderId, snoozeMinutes: minutes }
  }));
};
```

**Avatar sleepy time:**
1. **Sleeping state**: Slow breathing, gentle sway
2. **Dims to 80% opacity**: Looks drowsy
3. **Floating "Z" particles**: 3 Z's float up and fade away
4. **Stays sleeping**: Until reminder triggers again

## 🎙️ Voice Integration (Future)

### Scenario 10: Voice Command
**User says:** "Hey Tasky, what's on my schedule today?"

**Voice flow:**
```typescript
// Voice activation detected
window.dispatchEvent(new CustomEvent('voice:listening'));
// Avatar: listening state (pulse + glow + tilt)

// AI processing request  
window.dispatchEvent(new CustomEvent('voice:processing'));
// Avatar: thinking state (rotate + dots)

// AI responds with audio
window.dispatchEvent(new CustomEvent('voice:speaking', {
  detail: { audioLevel: 0.4 } // Varies with voice volume
}));
// Avatar: speaking state (audio-reactive bouncing)
```

**User experience:**
1. **Listening**: Avatar leans in with blue glow, showing attention
2. **Processing**: Avatar rotates with floating thought dots  
3. **Speaking**: Avatar bounces rhythmically, scaling with voice volume
4. **Natural flow**: Feels like talking to a real assistant

## 🎯 Floating Avatar (Non-Home Views)

### Scenario 11: Small Avatar in Tasks View
**Location:** Top-right corner (48px size)
**Behavior:** Same animations, smaller scale
**Purpose:** Maintains connection while not interfering with work

**User clicks floating avatar:**
```typescript
// Same navigation function
handleAvatarClick(); 
// Cycles through: tasks → reminders → chat → home
```

**Subtle presence:**
- Gentle idle floating
- Reacts to all same events  
- Smaller celebrations (proportional)
- Always clickable for navigation

## 🎨 Visual Feedback Summary

| User Action | Avatar Response | Purpose |
|-------------|----------------|---------|
| **App opens** | Sleep → Wake up | Welcome user warmly |
| **Create task** | Focus → Excited → Happy | Celebrate productivity |
| **Complete task** | Happy + Confetti | Major celebration! |
| **Task overdue** | Confused → Error | Show concern |
| **Use chat/MCP** | Focus → Success/Error | Show processing status |
| **Reminder pops** | Excited → Speaking | Get attention, announce |
| **Snooze reminder** | Sleeping + Z's | Show rest state |
| **Click avatar** | Attention wiggle | Playful interaction |
| **Hover avatar** | Glow + slight scale | Invite interaction |
| **Voice active** | Listen → Think → Speak | Natural conversation |
| **System idle** | Gentle floating | Peaceful presence |

## 🚀 The Magic

The avatar transforms Tasky from a simple task manager into a **living, breathing companion** that:

✅ **Celebrates your wins** - Makes completing tasks feel rewarding  
✅ **Shows empathy** - Reacts appropriately to problems  
✅ **Guides attention** - Helps you notice important things  
✅ **Provides feedback** - Shows what's happening behind the scenes  
✅ **Creates delight** - Makes productivity fun and engaging  
✅ **Maintains presence** - Always there but never intrusive  

Your simple PNG becomes an **emotional interface** that makes users want to be productive! 🎉
