import React from 'react';
import { ChevronDown, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// Tool component for displaying MCP tool calls
interface ToolProps extends React.ComponentProps<typeof Collapsible> {
  className?: string;
}

type ToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error';

interface ToolHeaderProps {
  type: string;
  state: ToolState;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

interface ToolContentProps extends React.ComponentProps<typeof CollapsibleContent> {}

interface ToolInputProps extends React.HTMLAttributes<HTMLDivElement> {
  input: any;
}

interface ToolOutputProps extends React.HTMLAttributes<HTMLDivElement> {
  output?: React.ReactNode;
  errorText?: string;
}

const getStateIcon = (state: ToolState) => {
  switch (state) {
    case 'input-streaming':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'input-available':
      return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    case 'output-available':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'output-error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStateBadge = (state: ToolState) => {
  switch (state) {
    case 'input-streaming':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
          Pending
        </span>
      );
    case 'input-available':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          Running
        </span>
      );
    case 'output-available':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Completed
        </span>
      );
    case 'output-error':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
          Error
        </span>
      );
    default:
      return null;
  }
};

const formatToolName = (type: string) => {
  return type
    .replace(/^tool-/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

export const Tool: React.FC<ToolProps> = ({ className, children, ...props }) => {
  const shouldDefaultOpen = React.useMemo(() => {
    // Auto-open completed tools and errors by default
    return React.Children.toArray(children).some((child) => {
      if (React.isValidElement(child) && child.type === ToolHeader) {
        const state = (child.props as ToolHeaderProps).state;
        return state === 'output-available' || state === 'output-error';
      }
      return false;
    });
  }, [children]);

  return (
    <Collapsible 
      className={cn('rounded-lg border bg-card', className)} 
      defaultOpen={shouldDefaultOpen}
      {...props}
    >
      {children}
    </Collapsible>
  );
};

export const ToolHeader: React.FC<ToolHeaderProps> = ({ 
  type, 
  state, 
  className, 
  children,
  onClick,
  ...props 
}) => {
  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full items-center justify-between gap-2 p-3 text-left transition-colors',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        className
      )}
      onClick={onClick}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {getStateIcon(state)}
        <span className="font-mono text-sm text-muted-foreground">{formatToolName(type)}</span>
        {getStateBadge(state)}
      </div>
      <ChevronDown className="h-4 w-4 transition-transform duration-200" />
      {children}
    </CollapsibleTrigger>
  );
};

export const ToolContent: React.FC<ToolContentProps> = ({ className, children, ...props }) => {
  return (
    <CollapsibleContent
      className={cn('border-t bg-muted/5', className)}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
};

export const ToolInput: React.FC<ToolInputProps> = ({ input, className, ...props }) => {
  const formatInput = (input: any) => {
    if (typeof input === 'object') {
      return JSON.stringify(input, null, 2);
    }
    return String(input);
  };

  return (
    <div className={cn('px-3 py-2 border-b border-border/50', className)} {...props}>
      <div className="text-xs font-medium text-muted-foreground mb-1">Input</div>
      <pre className="text-xs bg-muted/50 p-2 rounded font-mono overflow-x-auto">
        {formatInput(input)}
      </pre>
    </div>
  );
};

export const ToolOutput: React.FC<ToolOutputProps> = ({ 
  output, 
  errorText, 
  className, 
  ...props 
}) => {
  if (errorText) {
    return (
      <div className={cn('px-3 py-2', className)} {...props}>
        <div className="text-xs font-medium text-red-600 mb-1">Error</div>
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
          {errorText}
        </div>
      </div>
    );
  }

  if (!output) {
    return null;
  }

  return (
    <div className={cn('px-3 py-2', className)} {...props}>
      <div className="text-xs font-medium text-muted-foreground mb-1">Output</div>
      <div className="text-sm">
        {typeof output === 'string' ? (
          <pre className="bg-muted/50 p-2 rounded font-mono text-xs overflow-x-auto whitespace-pre-wrap">
            {output}
          </pre>
        ) : (
          output
        )}
      </div>
    </div>
  );
};
