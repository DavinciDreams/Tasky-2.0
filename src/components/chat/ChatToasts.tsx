import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from '../ui/button';
import type { Toast } from './types';

interface ChatToastsProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

export const ChatToasts: React.FC<ChatToastsProps> = ({ toasts, onDismiss }) => {
  const getIcon = (type?: Toast['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-accent" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStyles = (type?: Toast['type']) => {
    switch (type) {
      case 'success':
        return 'bg-primary/10 border-primary/30 text-foreground';
      case 'error':
        return 'bg-destructive/10 border-destructive/30 text-foreground';
      case 'warning':
        return 'bg-accent/10 border-accent/30 text-foreground';
      default:
        return 'bg-card border-border/30 text-foreground';
    }
  };

  return (
    <div className="fixed right-3 bottom-16 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 8, x: 100 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.2 }}
            className={`
              ${getStyles(toast.type)}
              border rounded-xl shadow-2xl 
              px-3 py-2 text-sm 
              flex items-center gap-2
              max-w-sm
              pointer-events-auto
            `}
          >
            {getIcon(toast.type)}
            <span className="flex-1">{toast.message}</span>
            <Button
              size="sm"
              variant="ghost"
              className="
                ml-2 rounded-lg px-2 py-0.5 text-xs 
                hover:bg-muted/50 text-muted-foreground
                h-auto
              "
              onClick={() => onDismiss(toast.id)}
            >
              Close
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
