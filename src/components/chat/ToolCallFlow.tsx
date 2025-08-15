import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  ChevronRight,
  FileText,
  ListTodo
} from 'lucide-react';

export type ToolCallState = 'pending' | 'confirming' | 'executing' | 'complete' | 'error' | 'cancelled';

interface ToolCallFlowProps {
  toolName: string;
  state: ToolCallState;
  args?: any;
  result?: any;
  error?: string;
  compact?: boolean;
}

export const ToolCallFlow: React.FC<ToolCallFlowProps> = ({
  toolName,
  state,
  args,
  result,
  error,
  compact = false
}) => {
  const formatToolName = (name: string) => {
    return name
      .replace('tasky_', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getIcon = () => {
    switch (state) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'confirming':
        return <AlertCircle className="h-4 w-4" />;
      case 'executing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'complete':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <ChevronRight className="h-4 w-4" />;
    }
  };

  const getStateColor = () => {
    switch (state) {
      case 'pending':
        return 'text-muted-foreground bg-muted/10 border-muted/30';
      case 'confirming':
        return 'text-accent bg-accent/10 border-accent/30';
      case 'executing':
        return 'text-primary bg-primary/10 border-primary/30';
      case 'complete':
        return 'text-primary bg-primary/10 border-primary/30';
      case 'error':
        return 'text-destructive bg-destructive/10 border-destructive/30';
      case 'cancelled':
        return 'text-muted-foreground bg-muted/10 border-muted/30';
      default:
        return 'text-foreground bg-card border-border/30';
    }
  };

  const getStateText = () => {
    switch (state) {
      case 'pending':
        return 'Preparing...';
      case 'confirming':
        return 'Waiting for confirmation...';
      case 'executing':
        return 'Executing...';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return '';
    }
  };

  const getToolIcon = () => {
    const nameLower = toolName.toLowerCase();
    if (nameLower.includes('task')) {
      return <ListTodo className="h-3 w-3" />;
    }
    if (nameLower.includes('reminder')) {
      return '🔔';
    }
    return <FileText className="h-3 w-3" />;
  };

  if (compact) {
    // Inline compact version for message flow
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs
          border ${getStateColor()} transition-all
        `}
      >
        <span className="flex items-center gap-1">
          {getToolIcon()}
          <span className="font-medium">{formatToolName(toolName)}</span>
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          {getIcon()}
          {getStateText()}
        </span>
      </motion.div>
    );
  }

  // Full version with details
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`
        rounded-xl border p-3 ${getStateColor()} transition-all
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center
          ${state === 'executing' ? 'animate-pulse' : ''}
        `}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{formatToolName(toolName)}</span>
            <span className="text-xs opacity-70">{getStateText()}</span>
          </div>

          {/* Show args preview when confirming */}
          {state === 'confirming' && args && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 p-2 bg-background/30 rounded text-xs space-y-1"
            >
              {Object.entries(args).slice(0, 3).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="text-foreground truncate">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
              {Object.keys(args).length > 3 && (
                <div className="text-muted-foreground">
                  ...and {Object.keys(args).length - 3} more
                </div>
              )}
            </motion.div>
          )}

          {/* Show error message */}
          {state === 'error' && error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-xs text-destructive"
            >
              {error}
            </motion.div>
          )}

          {/* Show result preview when complete */}
          {state === 'complete' && result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 text-xs text-muted-foreground"
            >
              ✓ Action completed successfully
            </motion.div>
          )}
        </div>
      </div>

      {/* Progress indicator for executing state */}
      {state === 'executing' && (
        <motion.div
          className="mt-3 h-1 bg-muted/20 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full bg-primary/50"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 3, ease: 'linear' }}
          />
        </motion.div>
      )}
    </motion.div>
  );
};
