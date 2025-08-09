import React, { useState } from 'react';
import { TaskyTask, TaskyTaskSchema } from '../../types/task';
import { Settings } from '../../types';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';
import { Button } from '../ui/button';
import { Upload, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

// Simplified UI: filters removed

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskyTask | null>(null);
  // Listen for delegated edit events from TaskList buttons
  React.useEffect(() => {
    const handler = (e: any) => setEditingTask(e.detail);
    window.addEventListener('tasky:edit', handler as any);
    return () => window.removeEventListener('tasky:edit', handler as any);
  }, []);
  const filteredTasks = tasks;

  const handleImport = async () => {
    try {
      const filePath = await (window as any).electronAPI.invoke('select-import-file');
      if (!filePath) return;
      // Delegate parsing to main to avoid duplication
      const parsed = await (window as any).electronAPI.invoke('task:import', { filePath });
      if (Array.isArray(parsed)) {
        // If main returns created tasks, trigger a refresh externally
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  return (
    <div className="tasks-tab p-6 space-y-6">
      <div className="tasks-header text-center">
        <h1 className="text-2xl font-bold text-card-foreground">
          📋 Task Management
        </h1>
        <p className="text-muted-foreground mt-1 text-center">
          Organize and track your tasks efficiently
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-elegant rounded-xl px-4 py-2 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="font-semibold">New Task</span>
          </Button>
          <Button 
            variant="outline"
            onClick={handleImport}
            className="border-border/40 hover:bg-secondary/20 rounded-xl px-4 py-2 flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span className="font-semibold">Import</span>
          </Button>
        </div>
      </div>

      {/* Removed Task Overview and Filters per request */}
      
      {/* Modal create form */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-background flex items-stretch justify-stretch p-0">
          <div className="w-full h-full">
            <Card className="rounded-none shadow-none h-full flex flex-col bg-background text-foreground border-0">
              <CardHeader className="pb-2 flex items-center justify-between border-b border-border/20 bg-background">
                <CardTitle className="text-lg font-semibold text-foreground">Create New Task</CardTitle>
                <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
              </CardHeader>
              <CardContent className="pt-4 pb-4 overflow-y-auto flex-1 bg-background">
                <TaskForm 
                  forceExpanded 
                  onCreateTask={(t) => { onCreateTask(t); setShowCreateModal(false); }}
                  onCancel={() => setShowCreateModal(false)}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal edit form */}
      {editingTask && (
        <div className="fixed inset-0 z-50 bg-background flex items-stretch justify-stretch p-0">
          <div className="w-full h-full">
            <Card className="rounded-none shadow-none h-full flex flex-col bg-card text-card-foreground border-0">
              <CardHeader className="pb-2 flex items-center justify-between border-b border-border/20 bg-background">
                <CardTitle className="text-lg font-semibold">Edit Task</CardTitle>
                <button onClick={() => setEditingTask(null)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
              </CardHeader>
              <CardContent className="pt-4 pb-4 overflow-y-auto flex-1 bg-background">
                <TaskForm
                  forceExpanded
                  initial={editingTask.schema as any}
                  submitLabel="Save Changes"
                  onSubmitOverride={(updates) => {
                    const flatUpdates: any = {
                      title: updates.title,
                      description: updates.description,
                      assignedAgent: updates.assignedAgent,
                      executionPath: updates.executionPath,
                      affectedFiles: updates.affectedFiles,
                    };
                    onUpdateTask(editingTask.schema.id, flatUpdates);
                    setEditingTask(null);
                  }}
                  onCancel={() => setEditingTask(null)}
                  // onCreateTask is required by type but unused when onSubmitOverride is provided
                  onCreateTask={() => {}}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      <TaskList 
        tasks={filteredTasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        onEditTask={(t) => setEditingTask(t)}
        timeFormat={settings.timeFormat || '12h'}
      />
    </div>
  );
};
