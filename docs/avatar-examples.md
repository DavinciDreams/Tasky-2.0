# Tasky GSAP Avatar - Real-World Examples

## 🎯 How It Works in Practice

The avatar responds automatically to every action in Tasky, creating a living, breathing companion that makes task management delightful.

## 📋 Task Management Examples

### Example 1: Creating a Task
```typescript
// User creates a task via chat: "Create a task called 'Buy groceries'"
// MCP tool gets called automatically

// 1. Tool starts → Avatar shows "focused" 
window.dispatchEvent(new CustomEvent('tasky:tool', {
  detail: { phase: 'start', name: 'tasky_create_task', args: { title: 'Buy groceries' } }
}));
// Avatar: Locks in position with subtle pulse (thinking about the task)

// 2. Tool succeeds → Avatar celebration sequence
window.dispatchEvent(new CustomEvent('tasky:tool', {
  detail: { 
    phase: 'done', 
    name: 'tasky_create_task', 
    args: { title: 'Buy groceries' },
    output: '{"id": "task-123", "title": "Buy groceries"}'
  }
}));
// Avatar: excited (rapid bounce) → happy (jump + spin) → idle (gentle float)
// Duration: 3 seconds total
```

**What you see:** Avatar gets excited, bounces rapidly, then jumps and spins with joy, finally settling into gentle floating.

### Example 2: Completing a Task
```typescript
// User checks off a task or says "Mark buy groceries as complete"

window.dispatchEvent(new CustomEvent('task:completed', {
  detail: { 
    id: 'task-123',
    title: 'Buy groceries',
    completedAt: new Date()
  }
}));

// Avatar: happy emotion + celebration preset with confetti
// - Jumps up 30px
// - Spins 360 degrees  
// - 20 colorful confetti pieces explode outward
// - Duration: 4 seconds
```

**What you see:** Avatar jumps for joy, spins around, and colorful confetti particles burst out in all directions!

### Example 3: Task Becomes Overdue
```typescript
// System checks due dates and finds overdue task

window.dispatchEvent(new CustomEvent('task:overdue', {
  detail: { 
    id: 'task-456',
    title: 'Submit report',
    dueDate: new Date('2024-01-10'),
    overdueDays: 2
  }
}));

// Avatar sequence: confused → error → idle
// 1. confused: Wobbles left/right, shrinks to 90%
// 2. error: Shakes horizontally, red tint flash
// 3. idle: Returns to gentle floating
```

**What you see:** Avatar looks confused (wobbling), then shows concern (shaking with red tint), then calms down.

## ⏰ Reminder Examples

### Example 4: Reminder Triggers
```typescript
// 3:00 PM - Reminder goes off: "Take a break"

window.dispatchEvent(new CustomEvent('reminder:triggered', {
  detail: { 
    id: 'reminder-789',
    message: 'Take a break',
    time: '15:00'
  }
}));

// Avatar sequence: excited → speaking → idle
// 1. excited: Rapid bouncing (1.5 seconds)
// 2. speaking: Audio-reactive bouncing (3 seconds)  
// 3. idle: Gentle floating
```

**What you see:** Avatar gets excited to tell you something, then bounces as if speaking the reminder message.

### Example 5: Snoozing a Reminder
```typescript
// User clicks "Snooze 5 minutes" on reminder

window.dispatchEvent(new CustomEvent('reminder:snoozed', {
  detail: { 
    id: 'reminder-789',
    snoozeMinutes: 5
  }
}));

// Avatar: sleeping emotion
// - Slow breathing (scale 0.95 ↔ 1.0 over 3 seconds)
// - Gentle sway (rotate -2° ↔ 2° over 4 seconds)
// - Fades to 80% opacity
// - Floating "Z" particles appear
```

**What you see:** Avatar yawns, dims slightly, breathes slowly, and little "Z" letters float up and away.

## 🎙️ Voice Interaction Examples

### Example 6: Voice Listening
```typescript
// User activates voice input (future feature)

window.dispatchEvent(new CustomEvent('voice:listening'));

// Avatar: listening emotion
// - Pulses (scale 1.0 ↔ 1.05 every 0.5s)
// - Blue glow appears and pulses
// - Tilts slightly (-5 degrees)
// - Continuous until voice stops
```

**What you see:** Avatar leans in attentively with a blue glow, pulsing gently to show it's listening.

### Example 7: Voice Processing & Response
```typescript
// User says: "How many tasks do I have?"

// 1. Processing
window.dispatchEvent(new CustomEvent('voice:processing'));
// Avatar: thinking emotion with rotating dots

// 2. AI responds
window.dispatchEvent(new CustomEvent('voice:speaking', {
  detail: { audioLevel: 0.3 } // Varies 0-1 based on audio
}));

// Avatar: speaking emotion
// - Bounces up/down (y: 0 ↔ -8px every 0.3s)
// - Scale changes based on audioLevel (scaleY: 1 + level * 0.2)
// - Slight rotation wiggle (-3° ↔ 3°)
```

**What you see:** Avatar thinks (rotating with dots), then bounces rhythmically as if speaking, scaling with voice volume.

## 🔧 Tool & Error Examples

### Example 8: Tool Execution
```typescript
// User runs a task with AI agent: "Execute the 'Deploy website' task"

// 1. Tool starts
window.dispatchEvent(new CustomEvent('tasky:tool', {
  detail: { 
    phase: 'start', 
    name: 'tasky_execute_task',
    args: { id: 'task-deploy', agent: 'claude' }
  }
}));
// Avatar: thinking emotion (processing the execution)

// 2. Task executing sequence
// focused (1s) → thinking (3s) → happy (2s) → idle
```

**What you see:** Avatar focuses, then thinks deeply with rotating dots, then celebrates when execution starts.

### Example 9: Error Handling
```typescript
// Tool fails due to network error

window.dispatchEvent(new CustomEvent('tasky:tool', {
  detail: { 
    phase: 'error', 
    name: 'tasky_create_task',
    args: { title: 'New task' },
    error: 'Network connection failed'
  }
}));

// Avatar sequence: error → confused → idle
// 1. error: Shake + red tint preset
// 2. confused: Wobble animation  
// 3. idle: Return to normal
```

**What you see:** Avatar shakes with alarm (red tint), then looks confused, then returns to normal.

## 🎮 Interactive Examples

### Example 10: User Clicks Avatar
```typescript
// User clicks the avatar in ApplicationsTab

const handleAvatarClick = () => {
  // 1. Trigger attention animation
  eventHandler.triggerAttention();
  // Avatar: Scale up → wiggle → elastic return
  
  // 2. Navigate to next app after animation
  setTimeout(() => {
    // Cycles: home → tasks → reminders → chat → home
    setActiveApp(nextApp);
  }, 800);
};
```

**What you see:** Avatar gets bigger, wiggles playfully, then bounces back while the app switches views.

### Example 11: Hover Effects
```css
/* Automatic hover animation via CSS */
.tasky-avatar-container:hover {
  filter: drop-shadow(0 6px 20px rgba(102, 126, 234, 0.5));
}

.tasky-avatar-container:hover img {
  transform: scale(1.05) translateZ(0);
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
```

**What you see:** When you hover over avatar, it glows brighter and grows slightly with a smooth elastic animation.

## 🔄 Real User Journey Example

### Complete Workflow: Morning Task Planning
```typescript
// 1. App starts
window.dispatchEvent(new CustomEvent('app:startup'));
// Avatar: sleeping → wake up sequence → idle
// User sees avatar "wake up" as app loads

// 2. User creates morning tasks via chat
"Create tasks: Review emails, Team standup, Finish proposal"
// Avatar: focused → excited → happy (for each task created)

// 3. User completes "Review emails"  
// Avatar: Celebration with confetti!

// 4. Reminder pops up: "Team standup in 5 minutes"
// Avatar: excited → speaking (announcing the reminder)

// 5. User asks via voice: "What's left on my todo list?"
// Avatar: listening → thinking → speaking (with audio-reactive bouncing)

// 6. User completes all tasks
// Avatar: Multiple celebration sequences throughout the day!
```

## 🎨 Emotion Mapping Reference

| User Action | Avatar Response | Visual Effect |
|-------------|----------------|---------------|
| **Create task** | excited → happy | Rapid bounce → Jump + spin |
| **Complete task** | happy + confetti | Jump + 360° spin + particles |
| **Delete task** | confused | Wobble + shrink |
| **Task overdue** | confused → error | Wobble → Shake + red tint |
| **Start voice** | listening | Pulse + blue glow + tilt |
| **AI thinking** | thinking | Rotate + floating dots |
| **AI speaking** | speaking | Audio-reactive bounce |
| **Reminder alert** | excited → speaking | Bounce → Announce |
| **Tool error** | error → confused | Shake + red → Wobble |
| **App idle** | idle | Gentle float + breathing |
| **User hover** | - | Glow + slight scale up |
| **User click** | attention | Scale + wiggle + elastic |

## 🚀 Performance & Accessibility

### Smooth Performance
- **60fps animations** via GPU-accelerated transforms
- **Automatic cleanup** prevents memory leaks
- **Optimized particles** with automatic removal

### Accessibility Support
```css
/* Respects user preferences */
@media (prefers-reduced-motion: reduce) {
  .tasky-avatar-container * {
    animation: none !important;
    transition: none !important;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .thinking-dot {
    background: #000000 !important;
    border: 1px solid #ffffff;
  }
}
```

### Responsive Design
- **Large avatar (96px)** on home screen
- **Small floating avatar (48px)** on other screens  
- **Mobile optimized** with reduced effects

## 🎯 The Result

Your Tasky PNG becomes a **living companion** that:
- ✅ **Celebrates your wins** with confetti and joy
- ✅ **Shows empathy** when things go wrong  
- ✅ **Guides your attention** with subtle animations
- ✅ **Responds contextually** to every action
- ✅ **Makes productivity fun** and engaging

The avatar transforms a simple task manager into an **emotionally intelligent assistant** that makes you want to get things done! 🎉
