import React, { useState, useMemo } from 'react';
import { TaskyTask, TaskyTaskSchema, TaskStatus } from '../../types/task';
import { Settings } from '../../types';
import { TaskStats } from './TaskStats';
import { TaskFilters } from './TaskFilters';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';

export interface TaskFilterOptions {
  status?: TaskStatus[];
  search?: string;
  tags?: string[];
  overdue?: boolean;
  dueToday?: boolean;
}

interface TasksTabProps {
  tasks: TaskyTask[];
  onCreateTask: (task: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => void;
  onUpdateTask: (id: string, updates: Partial<TaskyTask>) => void;
  onDeleteTask: (id: string) => void;
  settings: Settings;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  tasks,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  settings
}) => {
  const [filter, setFilter] = useState<TaskFilterOptions>({});
  const [showCompleted, setShowCompleted] = useState(false);
  const [sortBy, setSortBy] = useState<'dueDate' | 'created' | 'status'>('dueDate');

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(task => {
        // Filter out completed tasks if not showing them
        if (!showCompleted && task.status === TaskStatus.COMPLETED) return false;
        
        // Status filter
        if (filter.status && filter.status.length > 0 && !filter.status.includes(task.status)) return false;
        
        // Search filter
        if (filter.search) {
          const searchLower = filter.search.toLowerCase();
          const matchesTitle = task.schema.title.toLowerCase().includes(searchLower);
          const matchesDescription = task.schema.description?.toLowerCase().includes(searchLower);
          if (!matchesTitle && !matchesDescription) return false;
        }
        
        // Tags filter
        if (filter.tags && filter.tags.length > 0) {
          const taskTags = task.schema.tags || [];
          if (!filter.tags.some(tag => taskTags.includes(tag))) return false;
        }
        
        // Overdue filter
        if (filter.overdue) {
          const now = new Date();
          const isOverdue = task.schema.dueDate && 
                           task.schema.dueDate < now && 
                           task.status !== TaskStatus.COMPLETED;
          if (!isOverdue) return false;
        }
        
        // Due today filter
        if (filter.dueToday) {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
          const isDueToday = task.schema.dueDate && 
                            task.schema.dueDate >= today && 
                            task.schema.dueDate < tomorrow;
          if (!isDueToday) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'dueDate':
            const aDate = a.schema.dueDate?.getTime() || Infinity;
            const bDate = b.schema.dueDate?.getTime() || Infinity;
            return aDate - bDate;
          case 'created':
            return b.schema.createdAt.getTime() - a.schema.createdAt.getTime();
          case 'status':
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });
  }, [tasks, filter, showCompleted, sortBy]);

  return (
    <div className="tasks-tab p-6 space-y-6">
      <div className="tasks-header">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          📋 Task Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Organize and track your tasks efficiently
        </p>
      </div>

      <TaskStats tasks={tasks} />
      
      <TaskFilters 
        filter={filter} 
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showCompleted={showCompleted}
        onShowCompletedChange={setShowCompleted}
        availableTags={Array.from(new Set(tasks.flatMap(t => t.schema.tags || [])))}
      />
      
      <TaskForm onCreateTask={onCreateTask} />
      
      <TaskList 
        tasks={filteredTasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        timeFormat={settings.timeFormat || '12h'}
      />
    </div>
  );
};
