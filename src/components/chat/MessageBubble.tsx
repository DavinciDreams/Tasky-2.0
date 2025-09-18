import React from 'react';
import { motion } from 'framer-motion';
import { Response } from '@/components/ai-elements';
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
  className={`chat-message-container max-w-[78%] md:max-w-[64%] ${isUser ? 'ml-auto mr-3' : 'ml-3'} flex animate-message-slide-in`}
    >
      <div
        className={`
          ${isUser 
            ? 'bg-primary text-primary-foreground border border-primary/40' 
            : 'bg-card text-foreground border border-border'
          }
          rounded-2xl px-3.5 py-2.5 w-full break-words chat-message-content shadow-sm
        `}
      >
        {isUser ? (
          // User messages: render as plain text with whitespace preservation
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          // Assistant messages: render as markdown using Response component
          <Response>{message.content}</Response>
        )}
      </div>
    </motion.div>
  );
};
