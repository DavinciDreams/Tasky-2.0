import React from 'react';
import { Check, Circle, Clock, X } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// Task component for displaying task workflows
interface TaskProps extends React.ComponentProps<typeof Collapsible> {
  className?: string;
}

interface TaskTriggerProps extends React.ComponentProps<typeof CollapsibleTrigger> {
  title: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'error';
}

interface TaskContentProps extends React.ComponentProps<typeof CollapsibleContent> {}

interface TaskItemProps extends React.HTMLAttributes<HTMLDivElement> {}

interface TaskItemFileProps extends React.HTMLAttributes<HTMLDivElement> {}

const getStatusIcon = (status: TaskTriggerProps['status']) => {
  switch (status) {
    case 'pending':
      return <Circle className="h-4 w-4 text-muted-foreground" />;
    case 'in_progress':
      return <Clock className="h-4 w-4 text-yellow-500 animate-pulse" />;
    case 'completed':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'error':
      return <X className="h-4 w-4 text-red-500" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: TaskTriggerProps['status']) => {
  switch (status) {
    case 'pending':
      return 'border-muted-foreground/20 bg-muted/10';
    case 'in_progress':
      return 'border-warning/20 bg-warning/10';
    case 'completed':
      return 'border-success/20 bg-success/10';
    case 'error':
      return 'border-destructive/20 bg-destructive/10';
    default:
      return 'border-border bg-card';
  }
};

export const Task: React.FC<TaskProps> = ({ className, children, ...props }) => {
  return (
    <Collapsible className={cn('rounded-lg border', className)} {...props}>
      {children}
    </Collapsible>
  );
};

export const TaskTrigger: React.FC<TaskTriggerProps> = ({ 
  title, 
  status = 'pending', 
  className, 
  children,
  ...props 
}) => {
  return (
    <CollapsibleTrigger
      className={cn(
        'flex w-full items-center justify-between gap-2 p-3 text-left transition-colors',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        getStatusColor(status),
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {getStatusIcon(status)}
        <span className="font-medium text-sm truncate">{title}</span>
      </div>
      {children}
    </CollapsibleTrigger>
  );
};

export const TaskContent: React.FC<TaskContentProps> = ({ className, children, ...props }) => {
  return (
    <CollapsibleContent
      className={cn('border-t bg-muted/5 px-3 py-2', className)}
      {...props}
    >
      {children}
    </CollapsibleContent>
  );
};

export const TaskItem: React.FC<TaskItemProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn('flex items-center gap-2 py-1 text-sm text-muted-foreground', className)}
      {...props}
    >
      <div className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0" />
      {children}
    </div>
  );
};

export const TaskItemFile: React.FC<TaskItemFileProps> = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs',
        'bg-accent/10 text-accent-foreground border border-accent/20',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
