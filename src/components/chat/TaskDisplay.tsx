import React from 'react';
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from '@/components/ai-elements';
import { Clock, Calendar, Tag, CheckCircle, Clock as ClockIcon, FolderOpen, Link, Bell, BellOff, User, FileText } from 'lucide-react';

interface TaskDisplayProps {
  tasks: any[];
}

interface ReminderDisplayProps {
  reminders: any[];
}

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
        const dependencies = task?.schema?.dependencies || task?.dependencies;
        const assignedAgent = task?.schema?.assignedAgent || task?.assignedAgent;
        const executionPath = task?.schema?.executionPath || task?.executionPath;
        const reminderEnabled = task?.reminderEnabled || task?.schema?.reminderEnabled;
        const reminderTime = task?.reminderTime || task?.schema?.reminderTime;
        const result = task?.result;
        const completedAt = task?.completedAt;
        const createdAt = task?.schema?.createdAt || task?.createdAt;
        const updatedAt = task?.schema?.updatedAt || task?.updatedAt;

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
              
              {/* Timing Information */}
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
              
              {createdAt && (
                <TaskItem>
                  <Clock className="h-3 w-3" />
                  <span>Created: {new Date(createdAt).toLocaleString()}</span>
                </TaskItem>
              )}
              
              {updatedAt && (
                <TaskItem>
                  <Clock className="h-3 w-3" />
                  <span>Updated: {new Date(updatedAt).toLocaleString()}</span>
                </TaskItem>
              )}
              
              {completedAt && (
                <TaskItem>
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Completed: {new Date(completedAt).toLocaleString()}</span>
                </TaskItem>
              )}
              
              {/* Assignment and Execution */}
              {assignedAgent && (
                <TaskItem>
                  <User className="h-3 w-3" />
                  <span>Assigned Agent: {assignedAgent}</span>
                </TaskItem>
              )}
              
              {executionPath && (
                <TaskItem>
                  <FolderOpen className="h-3 w-3" />
                  <span>Execution Path: {executionPath}</span>
                </TaskItem>
              )}
              
              {/* Dependencies and Relations */}
              {Array.isArray(dependencies) && dependencies.length > 0 && (
                <TaskItem>
                  <Link className="h-3 w-3" />
                  <span>Dependencies: {dependencies.join(', ')}</span>
                </TaskItem>
              )}
              
              {/* Tags and Files */}
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
              
              {/* Reminders */}
              {typeof reminderEnabled === 'boolean' && (
                <TaskItem>
                  {reminderEnabled ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
                  <span>
                    Reminders: {reminderEnabled ? 'Enabled' : 'Disabled'}
                    {reminderEnabled && reminderTime && ` (${reminderTime})`}
                  </span>
                </TaskItem>
              )}
              
              {/* Result */}
              {result && (
                <TaskItem>
                  <FileText className="h-3 w-3" />
                  <span>Result: {result}</span>
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
  const [timeFormat, setTimeFormat] = React.useState<'12h' | '24h'>('12h');

  React.useEffect(() => {
    let mounted = true;
    try {
      (async () => {
        try {
          const tf = await (window as any)?.electronAPI?.getSetting?.('timeFormat');
          if (!mounted) return;
          const mapped = ((): '12h' | '24h' => {
            if (tf === '24' || tf === '24h' || tf === true) return '24h';
            if (tf === '12' || tf === '12h' || tf === false) return '12h';
            const s = String(tf || '').toLowerCase();
            return s.includes('24') ? '24h' : '12h';
          })();
          setTimeFormat(mapped);
        } catch {}
      })();
    } catch {}
    const handler = (_: any, payload: any) => {
      try {
        if (!payload) return;
        if (payload.key === 'timeFormat') {
          const v = payload.value;
          const mapped = ((): '12h' | '24h' => {
            if (v === '24' || v === '24h' || v === true) return '24h';
            if (v === '12' || v === '12h' || v === false) return '12h';
            const s = String(v || '').toLowerCase();
            return s.includes('24') ? '24h' : '12h';
          })();
          setTimeFormat(mapped);
        }
      } catch {}
    };
    try { (window as any)?.electronAPI?.onSettingsUpdate?.(handler); } catch {}
    return () => { mounted = false; };
  }, []);
  if (!Array.isArray(reminders) || reminders.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded-lg">
        No reminders found
      </div>
    );
  }

  // Simple formatter for HH:mm -> 12h when needed
  const formatTime = (time: string) => {
    try {
      const use24 = timeFormat === '24h';
      if (use24) return time;
      const m = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return time;
      let h = parseInt(m[1], 10);
      const min = m[2];
      const suffix = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${min} ${suffix}`;
    } catch {
      return time;
    }
  };

  return (
    <div className="space-y-2 w-full">
      {reminders.map((reminder, idx) => {
        const isEnabled = reminder.enabled;
        const message = reminder.message || 'Reminder';
  const time = formatTime(reminder.time);
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
