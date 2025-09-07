import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { MessageSkeleton } from './MessageSkeleton';
import { AdaptiveCardRenderer } from './AdaptiveCardRenderer';
import { ToolCallDisplay } from './ToolCallDisplay';
import type { ChatMessage, ToolEvent } from './types';

interface MessageItem {
  id: string;
  type: 'message' | 'skeleton' | 'tool-confirm' | 'tool-event' | 'tool-result' | 'adaptive-card';
  content?: ChatMessage;
  toolEvent?: ToolEvent;
  adaptiveCard?: any;
  timestamp: number;
}

interface MessageContainerProps {
  messages: ChatMessage[];
  toolEvents: ToolEvent[];
  pendingConfirm: { id: string; name: string; args: any } | null;
  isStreaming: boolean;
  streamingContent?: string;
}

export const MessageContainer: React.FC<MessageContainerProps> = ({
  messages,
  toolEvents,
  pendingConfirm,
  isStreaming,
  streamingContent
}) => {
  // Combine and order all items chronologically
  const items = useMemo(() => {
    const allItems: MessageItem[] = [];
    let itemId = 0;

    // Add regular messages and adaptive cards
    messages.forEach((message, index) => {
      // Check if it's an adaptive card
      try {
        const parsed = JSON.parse(message.content);
        if (parsed && parsed.__taskyCard) {
          allItems.push({
            id: `card-${itemId++}`,
            type: 'adaptive-card',
            adaptiveCard: parsed.__taskyCard,
            timestamp: Date.now() - (messages.length - index) * 1000 // Approximate timestamp
          });
          return;
        }
      } catch {}

      // Regular message
      allItems.push({
        id: `msg-${itemId++}`,
        type: 'message',
        content: message,
        timestamp: Date.now() - (messages.length - index) * 1000
      });
    });

    // Add current pending confirmation inline
    if (pendingConfirm) {
      const confirmEvent: ToolEvent = {
        id: pendingConfirm.id,
        phase: 'start',
        name: pendingConfirm.name,
        args: pendingConfirm.args,
        timestamp: Date.now()
      };
      
      allItems.push({
        id: `confirm-${pendingConfirm.id}`,
        type: 'tool-confirm',
        toolEvent: confirmEvent,
        timestamp: Date.now()
      });
    }

    // Add tool events that aren't already shown as cards
    const cardIds = new Set(
      allItems
        .filter(item => item.type === 'adaptive-card')
        .map(item => item.adaptiveCard?.id)
        .filter(Boolean)
    );

    toolEvents.forEach(event => {
      // Skip if this event is already shown as an adaptive card
      if (cardIds.has(event.id)) return;

      // Only show active tool events (not completed ones that have cards)
      if (event.phase === 'start' || event.phase === 'error') {
        allItems.push({
          id: `tool-${event.id}`,
          type: 'tool-event',
          toolEvent: event,
          timestamp: event.timestamp || Date.now()
        });
      }
    });

    // Sort by timestamp
    allItems.sort((a, b) => a.timestamp - b.timestamp);

    // Add streaming skeleton at the end if needed (only if no tool events are active)
    if (isStreaming && !toolEvents.some(e => e.phase === 'start')) {
      allItems.push({
        id: 'streaming',
        type: 'skeleton',
        timestamp: Date.now()
      });
    }

    return allItems;
  }, [messages, toolEvents, pendingConfirm, isStreaming]);

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          switch (item.type) {
            case 'message':
              if (!item.content) return null;
              
              // Check if this is the last assistant message and we're streaming
              const isLastAssistant = 
                item.content.role === 'assistant' &&
                items[items.length - 1]?.id === item.id &&
                isStreaming;

              // If streaming, show the streaming content instead
              if (isLastAssistant && streamingContent) {
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <MessageBubble
                      message={{ ...item.content, content: streamingContent }}
                      index={0}
                    />
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  <MessageBubble message={item.content} index={0} />
                </motion.div>
              );

            case 'skeleton':
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <MessageSkeleton />
                </motion.div>
              );

            case 'tool-confirm':
              if (!item.toolEvent) return null;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <ToolCallDisplay
                    toolEvent={item.toolEvent}
                  />
                </motion.div>
              );

            case 'tool-event':
              if (!item.toolEvent) return null;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <ToolCallDisplay
                    toolEvent={item.toolEvent}
                  />
                </motion.div>
              );

            case 'adaptive-card':
              if (!item.adaptiveCard) return null;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <AdaptiveCardRenderer card={item.adaptiveCard} />
                </motion.div>
              );

            default:
              return null;
          }
        })}
      </AnimatePresence>

      {/* Empty state */}
      {items.length === 0 && !isStreaming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        >
          <div className="text-sm">Start a conversation with Tasky</div>
          <div className="text-xs mt-2 opacity-70">
            Ask me about tasks, reminders, or anything else!
          </div>
        </motion.div>
      )}
    </div>
  );
};
