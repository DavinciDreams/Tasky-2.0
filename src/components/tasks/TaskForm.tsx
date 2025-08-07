import React, { useState } from 'react';
import { TaskyTaskSchema } from '../../types/task';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Plus, Calendar, Clock, Tag } from 'lucide-react';

interface TaskFormProps {
  onCreateTask: (task: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ onCreateTask }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    tags: '',
    estimatedDuration: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;

    // Parse due date and time
    let dueDate: Date | undefined;
    if (formData.dueDate) {
      dueDate = new Date(formData.dueDate);
      if (formData.dueTime) {
        const [hours, minutes] = formData.dueTime.split(':').map(Number);
        dueDate.setHours(hours, minutes);
      }
    }

    // Parse tags
    const tags = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Parse estimated duration
    const estimatedDuration = formData.estimatedDuration 
      ? parseInt(formData.estimatedDuration, 10) 
      : undefined;

    const taskData: Omit<TaskyTaskSchema, 'id' | 'createdAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      dueDate,
      tags: tags.length > 0 ? tags : undefined,
      estimatedDuration,
      updatedAt: new Date()
    };

    onCreateTask(taskData);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      dueTime: '',
      tags: '',
      estimatedDuration: ''
    });
    setIsExpanded(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isExpanded) {
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
    <Card className="task-form-expanded">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title - Required */}
          <div>
            <Label htmlFor="task-title" className="text-sm font-medium">
              Task Title *
            </Label>
            <Input
              id="task-title"
              type="text"
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* Description - Optional */}
          <div>
            <Label htmlFor="task-description" className="text-sm font-medium">
              Description
            </Label>
            <textarea
              id="task-description"
              placeholder="Add more details about this task..."
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Due Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task-due-date" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Due Date
              </Label>
              <Input
                id="task-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('dueDate', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="task-due-time" className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Due Time
              </Label>
              <Input
                id="task-due-time"
                type="time"
                value={formData.dueTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('dueTime', e.target.value)}
                className="mt-1"
                disabled={!formData.dueDate}
              />
            </div>
          </div>

          {/* Tags and Duration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task-tags" className="text-sm font-medium flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Tags
              </Label>
              <Input
                id="task-tags"
                type="text"
                placeholder="work, urgent, project-x (comma separated)"
                value={formData.tags}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('tags', e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="task-duration" className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Estimated Duration (minutes)
              </Label>
              <Input
                id="task-duration"
                type="number"
                placeholder="30"
                value={formData.estimatedDuration}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('estimatedDuration', e.target.value)}
                className="mt-1"
                min="1"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
