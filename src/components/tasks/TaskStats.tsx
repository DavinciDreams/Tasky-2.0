import React, { useMemo } from 'react';
import { TaskyTask, TaskStatus } from '../../types/task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BarChart3 } from 'lucide-react';

interface TaskStatsProps {
  tasks: TaskyTask[];
}

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: 'blue' | 'yellow' | 'green' | 'red' | 'orange' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
    green: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
    red: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    orange: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${colorClasses[color]} transition-all hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
};

export const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      needsReview: tasks.filter(t => t.status === TaskStatus.NEEDS_REVIEW).length,
      overdue: tasks.filter(t => 
        t.schema.dueDate && 
        t.schema.dueDate < now && 
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.ARCHIVED
      ).length,
      dueToday: tasks.filter(t => 
        t.schema.dueDate && 
        t.schema.dueDate >= today && 
        t.schema.dueDate < tomorrow &&
        t.status !== TaskStatus.COMPLETED &&
        t.status !== TaskStatus.ARCHIVED
      ).length
    };
  }, [tasks]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <Card className="task-stats">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Task Overview
          <span className="ml-auto text-sm font-normal text-gray-500">
            {completionRate}% completed
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <StatCard label="Total" value={stats.total} icon="📊" color="blue" />
          <StatCard label="Pending" value={stats.pending} icon="⏳" color="yellow" />
          <StatCard label="In Progress" value={stats.inProgress} icon="🔄" color="blue" />
          <StatCard label="Completed" value={stats.completed} icon="✅" color="green" />
          <StatCard label="Needs Review" value={stats.needsReview} icon="👀" color="purple" />
          <StatCard label="Overdue" value={stats.overdue} icon="🚨" color="red" />
          <StatCard label="Due Today" value={stats.dueToday} icon="📅" color="orange" />
        </div>
      </CardContent>
    </Card>
  );
};
