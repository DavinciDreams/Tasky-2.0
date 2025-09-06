import React from 'react';
import { motion } from 'framer-motion';

interface ThinkingIndicatorProps {
  isUser?: boolean;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ 
  isUser = false
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
          border rounded-2xl px-4 py-3 shadow-sm min-w-[100px]
        `}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <motion.div
            className="w-1.5 h-1.5 bg-current rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
          />
          <motion.div
            className="w-1.5 h-1.5 bg-current rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
          />
          <motion.div
            className="w-1.5 h-1.5 bg-current rounded-full"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.8 }}
          />
          <span className="text-sm ml-1">thinking...</span>
        </div>
      </div>
    </motion.div>
  );
};

// Keep old export name for compatibility
export const MessageSkeleton = ThinkingIndicator;
