import React from 'react';
import { motion } from 'framer-motion';

interface MessageSkeletonProps {
  isUser?: boolean;
  isTyping?: boolean;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ 
  isUser = false,
  isTyping = false 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`max-w-full ${isUser ? 'ml-auto' : ''} flex`}
    >
      <div
        className={`
          ${isUser 
            ? 'bg-primary/10 border-primary/30' 
            : 'bg-card border-border/30'
          }
          border rounded-2xl px-4 py-3 shadow-sm w-full
          ${isTyping ? 'min-w-[80px]' : 'min-w-[200px]'}
        `}
      >
        {isTyping ? (
          // Typing indicator with animated dots
          <div className="flex items-center gap-1">
            <motion.div
              className="w-2 h-2 bg-muted-foreground/50 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
            />
            <motion.div
              className="w-2 h-2 bg-muted-foreground/50 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
            />
            <motion.div
              className="w-2 h-2 bg-muted-foreground/50 rounded-full"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
            />
          </div>
        ) : (
          // Content skeleton
          <div className="space-y-2">
            <motion.div
              className="h-3 bg-muted/30 rounded"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="h-3 bg-muted/30 rounded w-3/4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            />
            <motion.div
              className="h-3 bg-muted/30 rounded w-1/2"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};
