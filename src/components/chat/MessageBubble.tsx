import React from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from './types';

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, index }) => {
  const isUser = message.role === 'user';
  
  // Try to detect if this is an adaptive card snapshot
  const isAdaptiveCard = (() => {
    try {
      const parsed = JSON.parse(message.content);
      return parsed && parsed.__taskyCard;
    } catch {
      return false;
    }
  })();

  // Don't render adaptive cards here - they'll be handled by AdaptiveCardRenderer
  if (isAdaptiveCard) {
    return null;
  }

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`max-w-full ${isUser ? 'ml-auto' : ''} flex`}
    >
      <div
        className={`
          ${isUser 
            ? 'bg-primary/10 border-primary/30 text-foreground' 
            : 'bg-card border-border/30 text-foreground'
          }
          border rounded-2xl px-4 py-3 shadow-sm w-full whitespace-pre-wrap break-words
          transition-all hover:shadow-md
        `}
      >
        {message.content}
      </div>
    </motion.div>
  );
};
