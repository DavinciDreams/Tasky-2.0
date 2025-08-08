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
  const filteredTasks = tasks;

  const handleImport = async () => {
    try {
      const filePath = await (window as any).electronAPI.invoke('select-import-file');
      if (!filePath) return;
      const ext = (filePath.split('.').pop() || '').toLowerCase();
      const dataUrl = await (window as any).electronAPI.invoke('read-import-file', filePath);
      if (!dataUrl) return;
      const content = atob(dataUrl.split(',')[1] || '');
      let records: any[] = [];
      if (ext === 'json') {
        records = JSON.parse(content);
      } else if (ext === 'csv') {
        const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean);
        const headers = headerLine.split(',').map(h => h.trim());
        records = lines.map(line => {
          const cols = line.split(',');
          const obj: any = {};
          headers.forEach((h, i) => (obj[h] = cols[i]?.trim()));
          if (obj.affectedFiles) obj.affectedFiles = obj.affectedFiles.split('|').map((s: string) => s.trim()).filter(Boolean);
          return obj;
        });
      } else if (ext === 'yaml' || ext === 'yml') {
        const parsed = await (window as any).electronAPI.invoke('parse-yaml', content);
        records = Array.isArray(parsed) ? parsed : [];
      } else if (ext === 'xml') {
        const parsed = await (window as any).electronAPI.invoke('parse-xml', content);
        records = (parsed?.tasks?.task) || [];
      }
      for (const rec of records) {
        const taskInput: any = {
          title: rec.title,
          description: rec.description,
          assignedAgent: rec.assignedAgent,
          executionPath: rec.executionPath,
          affectedFiles: rec.affectedFiles
        };
        if (taskInput.title) {
          onCreateTask(taskInput);
        }
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
  };

  return (
    <div className="tasks-tab p-6 space-y-6">
      <div className="tasks-header">
        <h1 className="text-2xl font-bold text-card-foreground">
          📋 Task Management
        </h1>
        <p className="text-muted-foreground mt-1">
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
      
      <TaskList 
        tasks={filteredTasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        timeFormat={settings.timeFormat || '12h'}
      />
    </div>
  );
};
