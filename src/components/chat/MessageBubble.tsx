import React from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card text-foreground border border-border/30'
          }
          rounded-2xl px-4 py-3 w-full break-words
        `}
      >
        {isUser ? (
          // User messages: render as plain text with whitespace preservation
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          // Assistant messages: render as markdown
          <div className="prose prose-sm max-w-none prose-invert-0
            prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed
            prose-strong:text-foreground prose-em:text-foreground
            prose-ul:text-foreground prose-ol:text-foreground prose-ul:my-2 prose-ol:my-2
            prose-li:text-foreground prose-li:my-1 prose-li:marker:text-muted-foreground
            prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:border-border
            prose-blockquote:text-muted-foreground prose-blockquote:border-border prose-blockquote:border-l-4
            prose-a:text-primary hover:prose-a:text-primary/80 prose-a:no-underline hover:prose-a:underline
            prose-hr:border-border
            [&>*:first-child]:mt-0 [&>*:last-child]:mb-0
            [&>ul]:pl-4 [&>ol]:pl-4 [&_ul]:list-disc [&_ol]:list-decimal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
};
