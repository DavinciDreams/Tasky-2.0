import React, { useRef, useEffect, useState } from 'react';
import { Send, Square, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { McpToolsHelper } from './McpToolsHelper';

interface ChatComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  disabled?: boolean;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  input,
  setInput,
  onSend,
  onStop,
  busy,
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mcpButtonRef = useRef<HTMLButtonElement>(null);
  const [showMcpTools, setShowMcpTools] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    const lineHeight = 24;
    
    // Calculate max height based on available space in the app window
    // Ensure textarea doesn't grow beyond what's visible in the app
    const windowHeight = window.innerHeight;
    const composerRect = el.closest('.relative')?.getBoundingClientRect();
    const availableHeight = composerRect ? windowHeight - composerRect.top - 100 : 120; // 100px buffer for UI elements
    const maxHeight = Math.min(lineHeight * 5, availableHeight); // Max 5 lines or available space
    
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!busy && input.trim()) {
        onSend();
      }
    }
  };

  // Handle MCP tool template insertion
  const handleInsertTemplate = (template: string) => {
    const currentInput = input;
    const newInput = currentInput ? `${currentInput}\n\n${template}` : template;
    setInput(newInput);
    
    // Focus textarea after insertion
    setTimeout(() => {
      textareaRef.current?.focus();
      // Auto-resize after insertion
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        const lineHeight = 24;
        const maxHeight = lineHeight * 5;
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, maxHeight) + 'px';
      }
    }, 100);
  };

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Reset height when input is cleared
  useEffect(() => {
    if (!input && textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }
  }, [input]);

  return (
    <div className="relative w-full">
      <form
        className={`
          relative flex items-end gap-2 p-2 
          backdrop-blur-sm rounded-3xl 
          border shadow-sm 
          transition-all duration-300
          ${isFocused 
            ? 'border-border/80' 
            : 'border-border/50 hover:border-border/70'
          }
        `}
        style={{
          background: 'linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.95) 100%)',
          width: '100%'
        }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy && input.trim()) {
            onSend();
          }
        }}
      >
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Ask Tasky or run tools…"
          rows={1}
          disabled={disabled || busy}
          className="
            flex-1 
            bg-transparent
            text-foreground 
            placeholder:text-muted-foreground/60
            text-sm leading-6
            resize-none 
            outline-none
            border-none
            py-3 px-2
            overflow-y-auto
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb:hover]:bg-muted-foreground/30
            [&::-webkit-scrollbar-thumb:active]:bg-muted-foreground/40
          "
          style={{ 
            minHeight: 48,
            maxHeight: 120,
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--muted-foreground) / 0.2) transparent',
          } as React.CSSProperties}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-1 mb-1 mr-1">
          {/* MCP Tools Button */}
          <motion.button
            ref={mcpButtonRef}
            type="button"
            onClick={() => setShowMcpTools(!showMcpTools)}
            className={`
              relative flex items-center justify-center
              w-8 h-8 rounded-2xl
              transition-all duration-200
              ${showMcpTools
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted/70'
              }
              focus:outline-none focus:ring-2 focus:ring-primary/50
            `}
            title="MCP Tools Helper"
          >
            <Wrench className="w-4 h-4" />
            <span className="sr-only">MCP Tools</span>
          </motion.button>

          <AnimatePresence mode="wait">
            {!busy ? (
              <motion.button
                key="send"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                type="submit"
                disabled={!input.trim() || disabled}
                className={`
                  relative flex items-center justify-center
                  w-8 h-8 rounded-2xl
                  transition-all duration-200
                  ${input.trim() 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg' 
                    : 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                  focus:outline-none focus:ring-2 focus:ring-primary/50
                `}
              >
                <Send className="w-4 h-4" />
                <span className="sr-only">Send</span>
              </motion.button>
            ) : (
              <motion.button
                key="stop"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                type="button"
                onClick={onStop}
                className="
                  relative flex items-center justify-center
                  w-8 h-8 rounded-2xl
                  bg-destructive text-destructive-foreground
                  hover:bg-destructive/90
                  shadow-md hover:shadow-lg
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-destructive/50
                "
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                {/* Pulsing indicator */}
                <span className="absolute inset-0 rounded-2xl animate-ping bg-destructive/30" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>

      {/* Status indicator when busy */}
      {busy && (
        <div className="flex items-center justify-end px-4 mt-2">
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-1.5 text-xs text-accent"
          >
            <div className="flex gap-0.5">
              <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-1 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>Tasky is thinking</span>
          </motion.div>
        </div>
      )}

      {/* MCP Tools Helper */}
      <McpToolsHelper
        isOpen={showMcpTools}
        onClose={() => setShowMcpTools(false)}
        onInsertTemplate={handleInsertTemplate}
        triggerRef={mcpButtonRef}
      />
    </div>
  );
};