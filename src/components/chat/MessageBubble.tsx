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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        ease: [0.25, 0.46, 0.45, 0.94],
        type: "spring",
        stiffness: 100
      }}
      className={`max-w-full ${isUser ? 'ml-auto' : ''} flex animate-message-slide-in`}
    >
      <div
        className={`
          ${isUser 
            ? 'message-bubble-user' 
            : 'message-bubble-assistant'
          }
          rounded-2xl px-4 py-3 w-full whitespace-pre-wrap break-words
          backdrop-filter backdrop-blur-lg
        `}
      >
        {message.content}
      </div>
    </motion.div>
  );
};
