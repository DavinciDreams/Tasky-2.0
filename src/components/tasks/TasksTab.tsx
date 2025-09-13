import React, { useState } from 'react';
import { TaskyTask, TaskyTaskSchema } from '../../types/task';
import { Settings } from '../../types';
import { TaskForm } from './TaskForm';
import { TaskList } from './TaskList';
import { Button } from '../ui/button';
import { Upload, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Modal } from '../ui/modal';

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
      const created = await (window as any).electronAPI.invoke('task:import', { filePath });
      if (Array.isArray(created)) {
        // Notify app shell to refresh tasks from main storage
        const evt = new Event('tasky:reload-tasks');
        window.dispatchEvent(evt);
        // Optional UX: quick inline feedback
        if (created.length === 0) {
          console.info('No tasks were imported from the selected file.');
        } else {
          console.info(`Imported ${created.length} task(s).`);
        }
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 bg-card border-border shadow-2xl rounded-3xl overflow-hidden">
        <CardContent className="p-6 h-full flex flex-col">
          <div className="tasks-header text-center mb-6">
        <h1 className="text-2xl font-bold text-card-foreground">
          📋 Task Management
        </h1>
        <p className="text-muted-foreground mt-1 text-center">
          Organize and track your tasks efficiently
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl rounded-xl px-4 py-2 flex items-center gap-2"
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
      <Modal
        open={showCreateModal}
        title="Create New Task"
        onClose={() => setShowCreateModal(false)}
        maxWidth={560}
        fullHeight
        tone="background"
        backdropClass="bg-black/60"
      >
        <TaskForm 
          forceExpanded 
          noCard
          onCreateTask={(t) => { onCreateTask(t); setShowCreateModal(false); }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Modal edit form */}
      <Modal
        open={!!editingTask}
        title="Edit Task"
        onClose={() => setEditingTask(null)}
        maxWidth={560}
        fullHeight
        tone="background"
        backdropClass="bg-black/60"
      >
        {editingTask && (
          <TaskForm
            forceExpanded
            noCard
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
        )}
      </Modal>
      
          <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
            <TaskList 
              tasks={filteredTasks}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onEditTask={(t) => setEditingTask(t)}
              timeFormat={settings.timeFormat || '12h'}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
