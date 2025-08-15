import React, { useState } from 'react';
import { Bell, CheckSquare, MessageSquare } from 'lucide-react';
import { TasksTab } from '../tasks/TasksTab';
import { ChatModule } from './ChatModule';
import type { TaskyTask, TaskyTaskSchema } from '../../types/task';
import type { Reminder, Settings as AppSettings } from '../../types';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface ApplicationsTabProps {
  // Reminders
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRemoveReminder: (id: string) => void;
  onEditReminder: (id: string, updates: Partial<Reminder>) => void;
  onToggleReminder: (id: string, enabled: boolean) => void;
  timeFormat: '12h' | '24h';
  // Tasks
  tasks: TaskyTask[];
  onCreateTask: (task: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => void;
  onUpdateTask: (id: string, updates: Partial<TaskyTask>) => void;
  onDeleteTask: (id: string) => void;
  settings: AppSettings;
  remindersContent?: React.ReactNode;
  // Controlled active view (optional). When provided, component becomes controlled.
  activeApp?: 'home' | 'reminders' | 'tasks' | 'chat';
  onActiveAppChange?: (next: 'home' | 'reminders' | 'tasks' | 'chat') => void;
  onSettingChange?: (key: keyof AppSettings, value: any) => void;
}

export const ApplicationsTab: React.FC<ApplicationsTabProps> = ({
  reminders,
  onAddReminder,
  onRemoveReminder,
  onEditReminder,
  onToggleReminder,
  timeFormat,
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  settings,
  remindersContent,
  activeApp: controlledActive,
  onActiveAppChange,
  onSettingChange
}) => {
  const [internalActive, setInternalActive] = useState<'home' | 'reminders' | 'tasks' | 'chat'>(controlledActive || 'home');
  const activeApp = (controlledActive ?? internalActive);
  const setActiveApp = (next: 'home' | 'reminders' | 'tasks' | 'chat') => {
    if (onActiveAppChange) onActiveAppChange(next);
    else setInternalActive(next);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Applications Home or Module View */}
      {activeApp === 'home' ? (
        <div className="flex-1 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
            <button
              onClick={() => setActiveApp('tasks')}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] text-left h-36"
              aria-label="Open Tasks"
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CheckSquare className="text-primary" size={18} />
                  </div>
                  <div className="text-lg font-semibold">Tasks</div>
                </div>
                <div className="text-sm text-muted-foreground">Create and/or import, manage and execute tasks efficiently.</div>
              </div>
            </button>

            <button
              onClick={() => setActiveApp('reminders')}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] text-left h-36"
              aria-label="Open Reminders"
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bell className="text-primary" size={18} />
                  </div>
                  <div className="text-lg font-semibold">Reminders</div>
                </div>
                <div className="text-sm text-muted-foreground">Create daily and one-time reminders with notifications.</div>
              </div>
            </button>

            <button
              onClick={() => setActiveApp('chat')}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] text-left h-36"
              aria-label="Open Chat"
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="text-primary" size={18} />
                  </div>
                  <div className="text-lg font-semibold">Chat</div>
                </div>
                <div className="text-sm text-muted-foreground">Conversational AI with MCP tools.</div>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col p-1">
          {activeApp === 'reminders' && <div className="flex-1 min-h-0 overflow-hidden">{remindersContent}</div>}
          {activeApp === 'tasks' && (
            <TasksTab
              tasks={tasks}
              onCreateTask={onCreateTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              settings={settings}
            />
          )}
          {activeApp === 'chat' && (
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatModule settings={settings} onSettingChange={onSettingChange || (()=>{})} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};


