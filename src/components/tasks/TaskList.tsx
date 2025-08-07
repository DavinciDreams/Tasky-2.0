import React, { useState } from 'react';
import { TaskyTask, TaskStatus } from '../../types/task';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Edit2, 
  Trash2, 
  Play, 
  Pause,
  Eye,
  Archive,
  AlertTriangle 
} from 'lucide-react';

interface TaskListProps {
  tasks: TaskyTask[];
  onUpdateTask: (id: string, updates: Partial<TaskyTask>) => void;
  onDeleteTask: (id: string) => void;
  timeFormat: '12h' | '24h';
}

interface TaskItemProps {
  task: TaskyTask;
  onUpdateTask: (id: string, updates: Partial<TaskyTask>) => void;
  onDeleteTask: (id: string) => void;
  timeFormat: '12h' | '24h';
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdateTask, onDeleteTask, timeFormat }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case TaskStatus.IN_PROGRESS:
        return <Play className="h-5 w-5 text-blue-500" />;
      case TaskStatus.NEEDS_REVIEW:
        return <Eye className="h-5 w-5 text-purple-500" />;
      case TaskStatus.ARCHIVED:
        return <Archive className="h-5 w-5 text-gray-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return 'bg-green-100 text-green-800 border-green-300';
      case TaskStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case TaskStatus.NEEDS_REVIEW:
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case TaskStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
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

  const dueDateInfo = task.schema.dueDate ? formatDueDate(task.schema.dueDate) : null;

  return (
    <Card className={`task-item ${task.status === TaskStatus.COMPLETED ? 'opacity-75' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Status Icon */}
          <button
            onClick={handleToggleComplete}
            className="mt-1 hover:scale-110 transition-transform"
          >
            {getStatusIcon(task.status)}
          </button>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title and Status */}
            <div className="flex items-center gap-2 mb-2">
              <h3 className={`font-medium text-gray-900 dark:text-gray-100 ${
                task.status === TaskStatus.COMPLETED ? 'line-through' : ''
              }`}>
                {task.schema.title}
              </h3>
              
              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>

            {/* Due Date */}
            {dueDateInfo && (
              <div className={`flex items-center gap-1 text-sm mb-2 ${
                dueDateInfo.isOverdue ? 'text-red-600' : 
                dueDateInfo.isToday ? 'text-orange-600' : 'text-gray-600'
              }`}>
                {dueDateInfo.isOverdue && <AlertTriangle className="h-4 w-4" />}
                <Calendar className="h-4 w-4" />
                <span>{dueDateInfo.text}</span>
              </div>
            )}

            {/* Tags */}
            {task.schema.tags && task.schema.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {task.schema.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description (expandable) */}
            {task.schema.description && (
              <div className="mb-2">
                <p className={`text-sm text-gray-600 dark:text-gray-400 ${
                  !isExpanded ? 'line-clamp-2' : ''
                }`}>
                  {task.schema.description}
                </p>
                {task.schema.description.length > 100 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}

            {/* Duration */}
            {task.schema.estimatedDuration && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                <Clock className="h-4 w-4" />
                <span>{task.schema.estimatedDuration} minutes</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-1">
            {/* Status Change Buttons */}
            {task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.COMPLETED && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(TaskStatus.IN_PROGRESS)}
                className="h-8 w-8 p-0"
                title="Start Task"
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            
            {task.status === TaskStatus.IN_PROGRESS && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(TaskStatus.PENDING)}
                className="h-8 w-8 p-0"
                title="Pause Task"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {task.status === TaskStatus.IN_PROGRESS && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(TaskStatus.NEEDS_REVIEW)}
                className="h-8 w-8 p-0"
                title="Mark for Review"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}

            {/* Edit Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
              title="Edit Task"
              onClick={() => {
                // TODO: Implement edit functionality
                console.log('Edit task:', task.schema.id);
              }}
            >
              <Edit2 className="h-4 w-4" />
            </Button>

            {/* Delete Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
              title="Delete Task"
              onClick={() => onDeleteTask(task.schema.id)}
            >
              <Trash2 className="h-4 w-4" />
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
      <Card className="task-list-empty">
        <CardContent className="p-8 text-center">
          <div className="text-gray-400 mb-4">
            <CheckCircle2 className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No tasks found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create your first task to get started with task management.
          </p>
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
