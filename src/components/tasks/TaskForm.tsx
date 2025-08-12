import React, { useState } from 'react';
import { TaskyTaskSchema } from '../../types/task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, FileText, FolderOpen, User, Terminal, Upload } from 'lucide-react';
import { Select } from '../ui/select';

interface TaskFormProps {
  onCreateTask: (task: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => void;
  // Optional edit support
  initial?: Partial<TaskyTaskSchema>;
  submitLabel?: string;
  onSubmitOverride?: (task: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => void;
  forceExpanded?: boolean;
  onCancel?: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onCreateTask, initial, submitLabel, onSubmitOverride, forceExpanded, onCancel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: (initial?.title as string) || '',
    description: (initial?.description as string) || '',
    assignedAgent: (initial?.assignedAgent as string) || '',
    affectedFiles: Array.isArray(initial?.affectedFiles) ? (initial!.affectedFiles as string[]).join('\n') : '',
    executionPath: (initial?.executionPath as string) || ''
  });

  const agents = ['gemini', 'claude'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;

    // Parse affected files (newline or comma-separated)
    const affectedFiles = formData.affectedFiles
      .split(/\r?\n|,/)
      .map(s => s.trim())
      .filter(Boolean);

    // Validate assignedAgent
    const normalizedAgent = formData.assignedAgent && ['gemini', 'claude'].includes(formData.assignedAgent as any)
      ? (formData.assignedAgent as 'gemini' | 'claude')
      : undefined;

    const taskData: Omit<TaskyTaskSchema, 'id' | 'createdAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      affectedFiles: affectedFiles.length > 0 ? affectedFiles : undefined,
      assignedAgent: normalizedAgent,
      executionPath: formData.executionPath.trim() || undefined,
      updatedAt: new Date()
    };

    if (onSubmitOverride) {
      onSubmitOverride(taskData);
    } else {
      onCreateTask(taskData);
    }
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      assignedAgent: '',
      affectedFiles: '',
      executionPath: ''
    });
    setIsExpanded(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!forceExpanded && !isExpanded) {
    return (
      <Card className="task-form-collapsed">
        <CardContent className="p-4">
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center gap-2"
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            Add New Task
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="task-form-expanded rounded-2xl bg-card text-card-foreground border border-border/30 shadow-xl">
      <CardContent className="pt-4 px-6 pb-6">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-5xl mx-auto w-full">
          {/* Title - Required */}
          <div>
            <Label htmlFor="task-title" className="text-sm font-medium text-card-foreground">
              Task Title *
            </Label>
            <Input
              id="task-title"
              type="text"
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
              className="mt-1 bg-card text-card-foreground border-border/30 rounded-2xl"
              required
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="task-description" className="text-sm font-medium text-card-foreground">
              Description
            </Label>
            <textarea
              id="task-description"
              placeholder="Add more details about this task..."
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              className="mt-1 w-full bg-card text-card-foreground border border-border/30 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors resize-none shadow"
              rows={4}
            />
          </div>

          {/* Assigned Agent */}
          <div className="grid md:grid-cols-2 gap-3 items-center">
            <Label htmlFor="task-agent" className="text-sm font-medium flex items-center gap-1 text-card-foreground">
              <User className="h-4 w-4" />
              Assigned Agent
            </Label>
            <div>
              <Select
                value={formData.assignedAgent}
                onValueChange={(val: string) => handleInputChange('assignedAgent', val)}
                className="mt-1 w-full"
              >
                <option value="">Select an agent...</option>
                {agents.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Execution Path */}
          <div>
            <Label htmlFor="task-exec-path" className="text-sm font-medium flex items-center gap-1 text-card-foreground">
              <FolderOpen className="h-4 w-4" />
              Execution Path
            </Label>
            <div className="space-y-2">
              <Input
                id="task-exec-path"
                type="text"
                placeholder="src/middleware"
                value={formData.executionPath}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('executionPath', e.target.value)}
                className="mt-1 w-full rounded-2xl"
              />
              <div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={async () => {
                  const dir = await window.electronAPI.invoke('select-directory');
                  if (dir) setFormData(prev => ({ ...prev, executionPath: dir }));
                }}>
                  <Upload className="h-4 w-4 mr-2" /> Browse folder
                </Button>
              </div>
            </div>
          </div>

          {/* Affected Files */}
          <div>
            <Label htmlFor="task-affected-files" className="text-sm font-medium flex items-center gap-1 text-card-foreground">
              <FileText className="h-4 w-4" />
              Affected Files (one per line or comma-separated)
            </Label>
            <div className="space-y-2">
              <textarea
                id="task-affected-files"
                placeholder="src/middleware/auth.middleware.ts\nsrc/guards/jwt.guard.ts"
                value={formData.affectedFiles}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('affectedFiles', e.target.value)}
                className="mt-1 w-full bg-card text-card-foreground border border-border/30 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-colors resize-none shadow"
                rows={4}
              />
              <div>
                <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={async () => {
                  const files: string[] = await window.electronAPI.invoke('select-files');
                  if (files && files.length) {
                    const merged = [formData.affectedFiles, ...files].filter(Boolean).join('\n');
                    setFormData(prev => ({ ...prev, affectedFiles: merged }));
                  }
                }}>
                  <Upload className="h-4 w-4 mr-2" /> Add files from picker
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1 rounded-2xl shadow-xl">
              <Plus className="h-4 w-4 mr-2" />
              {submitLabel || 'Create Task'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="rounded-2xl"
              onClick={() => {
                if (onCancel) onCancel(); else setIsExpanded(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
