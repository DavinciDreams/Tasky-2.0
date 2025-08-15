# Chat Message Flow & State Management

## Overview
The chat UI now features a sophisticated message flow system that properly orders and displays messages, tool calls, and their various states in a chronological and visually intuitive manner.

## Component Architecture

### 1. MessageContainer
The central orchestrator that manages the display order of all message types:
- Regular user/assistant messages
- Tool confirmations
- Tool execution states
- Adaptive cards (results)
- Loading skeletons

### 2. Message Types & Display Order

```typescript
type MessageItem = {
  id: string;
  type: 'message' | 'skeleton' | 'tool-confirm' | 'tool-event' | 'tool-result' | 'adaptive-card';
  content?: ChatMessage;
  toolEvent?: ToolEvent;
  adaptiveCard?: any;
  timestamp: number;
}
```

## Visual Flow States

### 1. User Message Flow
```
User types → [Send] → Message appears → Typing indicator shows
```

### 2. Assistant Response Flow
```
Typing indicator → Streaming text (live updates) → Complete message
```

### 3. Tool Call Flow

#### State Progression:
```
pending → confirming → executing → complete/error
```

#### Visual Indicators:

**Pending State:**
- Color: `text-muted-foreground bg-muted/10`
- Icon: Clock
- Text: "Preparing..."

**Confirming State:**
- Color: `text-accent bg-accent/10`
- Icon: AlertCircle
- Text: "Waiting for confirmation..."
- Shows argument preview

**Executing State:**
- Color: `text-primary bg-primary/10`
- Icon: Loader2 (spinning)
- Text: "Executing..."
- Progress bar animation

**Complete State:**
- Color: `text-primary bg-primary/10`
- Icon: CheckCircle
- Text: "Complete"
- Shows result preview

**Error State:**
- Color: `text-destructive bg-destructive/10`
- Icon: XCircle
- Text: "Failed"
- Shows error message

## Display Components

### MessageSkeleton
Shows loading states with two variants:
1. **Typing Indicator**: Three animated dots
2. **Content Skeleton**: Animated placeholder lines

### ToolCallFlow
Displays tool execution with two modes:
1. **Compact**: Inline pill for message flow
2. **Full**: Detailed card with arguments and results

### AdaptiveCardRenderer
Rich rendering for tool results:
- **List Reminders**: Interactive reminder cards with enable/disable
- **List Tasks**: Task cards with status badges and tags
- **Fallback**: JSON display for unknown types

## Animations & Transitions

### Entry Animations
- Messages: `opacity: 0, y: 6` → `opacity: 1, y: 0`
- Tool events: `opacity: 0, x: -10` → `opacity: 1, x: 0`
- Cards: `opacity: 0, y: 10` → `opacity: 1, y: 0`

### Exit Animations
- Messages: → `opacity: 0, y: -6`
- Tool events: → `opacity: 0, x: 10`
- Cards: → `opacity: 0, y: -10`

### State Transitions
- Duration: 0.2s for tool states, 0.15s for messages
- Easing: Default spring physics
- Layout animations with Framer Motion

## Chronological Ordering

The MessageContainer maintains chronological order by:
1. Assigning timestamps to all items
2. Sorting by timestamp
3. Merging tool events with messages
4. Preventing duplicate displays
5. Managing streaming state

## User Experience Improvements

### 1. **Clear Visual Hierarchy**
- User messages: Right-aligned with primary accent
- Assistant messages: Left-aligned with card background
- Tool calls: Distinct cards with status colors

### 2. **Progressive Disclosure**
- Compact view initially
- Expand on interaction
- Show relevant details per state

### 3. **Real-time Feedback**
- Immediate visual response
- Loading indicators
- Progress animations
- Status updates

### 4. **Smooth Transitions**
- No jarring updates
- Graceful state changes
- Animated entrances/exits

## Theme Integration

All components use consistent theme colors:
- **Background**: `#333334`
- **Cards**: `#464647`
- **Primary**: `#FAFAFA`
- **Muted**: `#404040`
- **Accent**: `#525252`
- **Destructive**: `#9E1B32`

## Empty State

When no messages exist:
```
💬
Start a conversation with Tasky
Ask me about tasks, reminders, or anything else!
```

## Scroll Behavior

- Auto-scroll when near bottom
- "Jump to latest" button when scrolled up
- Smooth scrolling animations
- Maintains position during updates

## Performance Optimizations

1. **Memoized Sorting**: Items sorted only when dependencies change
2. **Throttled Updates**: Streaming updates throttled to 60ms
3. **Lazy Rendering**: Only visible items rendered
4. **Efficient Re-renders**: Using React keys and memoization

## Testing Considerations

The new flow system is tested for:
- Correct ordering of messages
- State transitions
- Animation smoothness
- Error handling
- Edge cases (empty state, rapid updates)

## Future Enhancements

1. **Message Grouping**: Group consecutive messages from same sender
2. **Timestamps**: Show relative timestamps
3. **Read Receipts**: Show when messages are read
4. **Typing Indicators**: Show which tool is being prepared
5. **Batch Operations**: Handle multiple tool calls efficiently
