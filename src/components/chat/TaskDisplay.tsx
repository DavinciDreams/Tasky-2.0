import React from 'react';
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from '@/components/ai-elements';
import { Clock, Calendar, Tag, CheckCircle, Clock as ClockIcon, AlertCircle } from 'lucide-react';

interface TaskDisplayProps {
  tasks: any[];
}

interface ReminderDisplayProps {
  reminders: any[];
}

const getTaskStatusIcon = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'IN_PROGRESS':
      return <ClockIcon className="h-4 w-4 text-yellow-500" />;
    case 'PENDING':
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getTaskStatus = (status: string): 'pending' | 'in_progress' | 'completed' | 'error' => {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return 'completed';
    case 'IN_PROGRESS':
      return 'in_progress';
    case 'PENDING':
      return 'pending';
    default:
      return 'pending';
  }
};

export const TaskDisplay: React.FC<TaskDisplayProps> = ({ tasks }) => {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
        No tasks found
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      {tasks.map((task, idx) => {
        const taskTitle = task?.schema?.title || task?.title || 'Untitled Task';
        const taskStatus = task?.status || 'PENDING';
        const taskDescription = task?.schema?.description || task?.description;
        const taskDueDate = task?.schema?.dueDate || task?.dueDate;
        const taskTags = task?.schema?.tags || task?.tags;
        const taskFiles = task?.schema?.affectedFiles || task?.affectedFiles;
        const estimatedDuration = task?.schema?.estimatedDuration || task?.estimatedDuration;

        return (
          <Task key={idx} defaultOpen={false}>
            <TaskTrigger 
              title={taskTitle}
              status={getTaskStatus(taskStatus)}
            />
            <TaskContent>
              {taskDescription && (
                <TaskItem>
                  <span>{taskDescription}</span>
                </TaskItem>
              )}
              
              {taskDueDate && (
                <TaskItem>
                  <Calendar className="h-3 w-3" />
                  <span>Due: {new Date(taskDueDate).toLocaleDateString()}</span>
                </TaskItem>
              )}
              
              {estimatedDuration && (
                <TaskItem>
                  <ClockIcon className="h-3 w-3" />
                  <span>Estimated: {estimatedDuration} minutes</span>
                </TaskItem>
              )}
              
              {Array.isArray(taskTags) && taskTags.length > 0 && (
                <TaskItem>
                  <Tag className="h-3 w-3" />
                  <span>Tags: {taskTags.join(', ')}</span>
                </TaskItem>
              )}
              
              {Array.isArray(taskFiles) && taskFiles.length > 0 && (
                <TaskItem>
                  Files: {taskFiles.map((file, fileIdx) => (
                    <TaskItemFile key={fileIdx}>
                      {file}
                    </TaskItemFile>
                  ))}
                </TaskItem>
              )}
            </TaskContent>
          </Task>
        );
      })}
    </div>
  );
};

export const ReminderDisplay: React.FC<ReminderDisplayProps> = ({ reminders }) => {
  if (!Array.isArray(reminders) || reminders.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
        No reminders found
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      {reminders.map((reminder, idx) => {
        const isEnabled = reminder.enabled;
        const message = reminder.message || 'Reminder';
        const time = reminder.time;
        const days = reminder.days || [];

        return (
          <Task key={idx} defaultOpen={false}>
            <TaskTrigger 
              title={message}
              status={isEnabled ? 'completed' : 'pending'}
            />
            <TaskContent>
              <TaskItem>
                <Clock className="h-3 w-3" />
                <span>Time: {time}</span>
              </TaskItem>
              
              {Array.isArray(days) && days.length > 0 && (
                <TaskItem>
                  <Calendar className="h-3 w-3" />
                  <span>Days: {days.join(', ')}</span>
                </TaskItem>
              )}
              
              <TaskItem>
                <span className={isEnabled ? 'text-green-600' : 'text-muted-foreground'}>
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </TaskItem>
            </TaskContent>
          </Task>
        );
      })}
    </div>
  );
};
