import React from 'react';
import { TaskyTask, TaskStatus } from '../../types/task';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { TaskForm } from './TaskForm';
import { Badge } from '../ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  Edit2, 
  Trash2, 
  Play, 
  Archive,
  FileText,
  FolderOpen,
  User
} from 'lucide-react';

interface TaskListProps {
  tasks: TaskyTask[];
  onUpdateTask: (id: string, updates: Partial<TaskyTask>) => void;
  onDeleteTask: (id: string) => void;
  onEditTask?: (task: TaskyTask) => void;
  timeFormat: '12h' | '24h';
}

interface TaskItemProps {
  task: TaskyTask;
  onUpdateTask: (id: string, updates: Partial<TaskyTask>) => void;
  onDeleteTask: (id: string) => void;
  timeFormat: '12h' | '24h';
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdateTask, onDeleteTask, timeFormat }) => {

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case TaskStatus.IN_PROGRESS:
        return <Circle className="h-5 w-5 text-blue-500" />;
      case TaskStatus.NEEDS_REVIEW:
        return <Circle className="h-5 w-5 text-purple-500" />;
      case TaskStatus.ARCHIVED:
        return <Archive className="h-5 w-5 text-gray-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'bg-green-500/15 text-green-400 border-green-500/30';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case TaskStatus.NEEDS_REVIEW:
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case TaskStatus.ARCHIVED:
        return 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30';
      default:
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
    }
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    const isOverdue = date < now && task.status !== TaskStatus.COMPLETED;

    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString();
    }

    const timeStr = timeFormat === '12h' 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    return {
      text: `${dateStr} at ${timeStr}`,
      isOverdue,
      isToday,
      isTomorrow
    };
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    const updates: Partial<TaskyTask> = {
      status: newStatus,
      ...(newStatus === TaskStatus.COMPLETED && { completedAt: new Date() })
    };
    onUpdateTask(task.schema.id, updates);
  };

  const handleToggleComplete = () => {
    const newStatus = task.status === TaskStatus.COMPLETED 
      ? TaskStatus.PENDING 
      : TaskStatus.COMPLETED;
    handleStatusChange(newStatus);
  };

  // Placeholder for future due date rendering logic

  return (
    <Card className={`task-item bg-card text-card-foreground border border-border/30 rounded-2xl shadow-xl hover:shadow-2xl transition-all ${task.status === TaskStatus.COMPLETED ? 'opacity-80' : ''}`}>
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          {/* Completion Toggle */}
          <div className="mt-1">
            <Checkbox
              checked={task.status === TaskStatus.COMPLETED}
              onCheckedChange={(checked) => {
                const newStatus = checked ? TaskStatus.COMPLETED : TaskStatus.PENDING;
                const updates: Partial<TaskyTask> = {
                  status: newStatus,
                  ...(newStatus === TaskStatus.COMPLETED ? { completedAt: new Date() } : {})
                };
                onUpdateTask(task.schema.id, updates);
              }}
              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
            />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 w-full">
            {/* Title and Status */}
            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <h3 className={`font-semibold text-card-foreground ${
                task.status === TaskStatus.COMPLETED ? 'line-through' : ''
              }`}>
                {task.schema.title}
              </h3>
              
              <Badge className={`text-xs border ${getStatusColor(task.status)} rounded-lg px-2 py-0.5`}> 
                {task.status.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>

            {/* Dev task details */}
            {(task.schema.assignedAgent || task.schema.executionPath) && (
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                {task.schema.assignedAgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/30 bg-secondary/30"><User className="h-3 w-3" />{task.schema.assignedAgent}</span>
                )}
                {task.schema.executionPath && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/30 bg-secondary/30"><FolderOpen className="h-3 w-3" />{task.schema.executionPath}</span>
                )}
              </div>
            )}

            {/* Description removed per request */}

            {/* Affected files */}
            {task.schema.affectedFiles && task.schema.affectedFiles.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                  <span>Affected files</span>
                </div>
                <div className="rounded-xl border border-border/30 bg-background/60 p-3">
                  <ul className="space-y-1 font-mono text-xs sm:text-sm text-foreground/90">
                    {task.schema.affectedFiles.map(f => (
                      <li key={f} className="truncate">{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row flex-wrap items-center gap-3 mt-2 sm:mt-0">
            {/* Removed: Start and Pause buttons per request */}
            {/* Removed: Mark for Review button per request */}

            {/* Edit Button */}
            <Button
              size="icon"
              variant="outline"
              className="rounded-xl"
              title="Edit Task"
              aria-label="Edit task"
              onClick={() => {
                // Delegate to parent to open the main modal
                const ev = new CustomEvent('tasky:edit', { detail: task });
                window.dispatchEvent(ev);
              }}
            >
              <Edit2 className="h-5 w-5" />
            </Button>

            {/* Execute Button */
            }
            <Button
              size="icon"
              variant="outline"
              className="rounded-xl"
              title="Execute Task"
              aria-label="Execute task"
              onClick={() => {
                const provider = (task.schema.assignedAgent || '').toLowerCase() === 'claude' ? 'claude' : 'gemini';
                window.electronAPI?.executeTask?.(task.schema.id, { agent: provider }).catch(console.error);
              }}
            >
              <Play className="h-5 w-5" />
            </Button>

            {/* Delete Button */}
            <Button
              size="icon"
              variant="outline"
              className="rounded-xl text-red-600 hover:text-red-800 hover:bg-red-50"
              title="Delete Task"
              aria-label="Delete task"
              onClick={() => onDeleteTask(task.schema.id)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const TaskList: React.FC<TaskListProps> = ({ tasks, onUpdateTask, onDeleteTask, timeFormat }) => {
  if (tasks.length === 0) {
    return (
      <Card className="task-list-empty bg-card text-card-foreground border border-border/30 rounded-2xl shadow-xl">
        <CardContent className="p-10 text-center">
          <div className="text-muted-foreground mb-4">
            <CheckCircle2 className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
          <p className="text-muted-foreground">Create your first task to get started with task management.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="task-list space-y-3">
      {tasks.map(task => (
        <TaskItem
          key={task.schema.id}
          task={task}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          timeFormat={timeFormat}
        />
      ))}
    </div>
  );
};
