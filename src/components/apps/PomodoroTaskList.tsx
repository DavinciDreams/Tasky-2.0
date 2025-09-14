import React, { useState, useEffect } from 'react';
import { Plus, Play, Edit2, Trash2, CheckCircle, Circle, Target, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Modal } from '../ui/modal';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { PomodoroTask } from '../../types/pomodoro';

interface PomodoroTaskListProps {
  onTaskSelect?: (task: PomodoroTask) => void;
  activeTask?: PomodoroTask | null;
}

export const PomodoroTaskList: React.FC<PomodoroTaskListProps> = ({
  onTaskSelect,
  activeTask
}) => {
  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingTask, setEditingTask] = useState<PomodoroTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<PomodoroTask | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    estimatedPomodoros: 1,
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 30,
    order: 0
  });

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const taskList = await window.electronAPI?.pomodoroGetTasks();
      if (taskList) {
        setTasks(taskList);
      }
    } catch (error) {
      console.warn('Failed to load pomodoro tasks:', error);
    }
  };

  const handleAddTask = async () => {
    try {
      if (!formData.name.trim()) return;

      const newTask = await window.electronAPI?.pomodoroAddTask({
        name: formData.name.trim(),
        estimatedPomodoros: Math.max(1, formData.estimatedPomodoros),
        workDuration: Math.max(1, formData.workDuration),
        shortBreakDuration: Math.max(1, formData.shortBreakDuration),
        longBreakDuration: Math.max(1, formData.longBreakDuration),
        order: Math.max(0, formData.order)
      });

      if (newTask) {
        await loadTasks();
        setShowAddModal(false);
        resetForm();
      }
    } catch (error) {
      console.warn('Failed to add pomodoro task:', error);
    }
  };

  const handleEditTask = async () => {
    try {
      if (!editingTask || !formData.name.trim()) return;

      const success = await window.electronAPI?.pomodoroUpdateTask(editingTask.id, {
        name: formData.name.trim(),
        estimatedPomodoros: Math.max(1, formData.estimatedPomodoros),
        workDuration: Math.max(1, formData.workDuration),
        shortBreakDuration: Math.max(1, formData.shortBreakDuration),
        longBreakDuration: Math.max(1, formData.longBreakDuration),
        order: Math.max(0, formData.order)
      });

      if (success) {
        await loadTasks();
        setShowEditModal(false);
        setEditingTask(null);
        resetForm();
      }
    } catch (error) {
      console.warn('Failed to update pomodoro task:', error);
    }
  };

  const handleDeleteTask = (task: PomodoroTask) => {
    setDeletingTask(task);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTask = async () => {
    if (!deletingTask) return;
    
    try {
      const success = await window.electronAPI?.pomodoroDeleteTask(deletingTask.id);
      if (success) {
        await loadTasks();
        setShowDeleteConfirm(false);
        setDeletingTask(null);
      }
    } catch (error) {
      console.warn('Failed to delete pomodoro task:', error);
    }
  };

  const handleSetActiveTask = async (task: PomodoroTask) => {
    try {
      const success = await window.electronAPI?.pomodoroSetActiveTask(task.id);
      if (success) {
        await loadTasks();
        onTaskSelect?.(task);
      }
    } catch (error) {
      console.warn('Failed to set active pomodoro task:', error);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const success = await window.electronAPI?.pomodoroUpdateTask(taskId, {
        isCompleted: true,
        isActive: false
      });
      if (success) {
        await loadTasks();
      }
    } catch (error) {
      console.warn('Failed to complete pomodoro task:', error);
    }
  };

  const handleReorderTask = async (taskId: string, direction: 'up' | 'down') => {
    try {
      const success = await window.electronAPI?.pomodoroReorderTask(taskId, direction);
      if (success) {
        await loadTasks();
      }
    } catch (error) {
      console.warn('Failed to reorder pomodoro task:', error);
    }
  };

  const openEditModal = (task: PomodoroTask) => {
    setEditingTask(task);
    setFormData({
      name: task.name,
      estimatedPomodoros: task.estimatedPomodoros,
      workDuration: task.workDuration || 25,
      shortBreakDuration: task.shortBreakDuration || 5,
      longBreakDuration: task.longBreakDuration || 30,
      order: task.order || 0
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    // Set default order to be after the last task
    const nextOrder = activeTasks.length > 0 ? Math.max(...activeTasks.map(t => t.order)) + 1 : 0;
    
    setFormData({
      name: '',
      estimatedPomodoros: 1,
      workDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 30,
      order: nextOrder
    });
  };

  const activeTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Today's Tasks</h3>
        <Button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="px-3 py-2 text-sm text-button-foreground"
          style={{
            backgroundColor: `hsl(var(--button))`,
            color: `hsl(var(--button-foreground))`
          }}
        >
          <Plus size={16} className="mr-2" />
          Add Task
        </Button>
      </div>

      {/* Active Task Indicator */}
      {activeTask && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <div className="flex-1">
                <div className="font-medium text-primary text-sm">{activeTask.name}</div>
                <div className="text-xs text-muted-foreground">
                  {activeTask.completedPomodoros}/{activeTask.estimatedPomodoros} sessions
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Tasks */}
      <div className="space-y-2">
        {activeTasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <Target className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No tasks for today</p>
              <p className="text-sm text-muted-foreground mt-1">Add a task to get started with the Pomodoro Technique</p>
            </CardContent>
          </Card>
        ) : (
          activeTasks.map((task) => (
            <Card key={task.id} className={`transition-all hover:shadow-md ${task.isActive ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    {/* Order indicator */}
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        {task.order + 1}
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => handleSetActiveTask(task)}
                      variant={task.isActive ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 rounded-full p-0"
                      title="Select for Pomodoro"
                    >
                      <Play size={14} />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{task.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs text-muted-foreground">
                        {task.completedPomodoros}/{task.estimatedPomodoros}
                      </div>
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(task.estimatedPomodoros, 8) }, (_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < task.completedPomodoros ? 'bg-success' : 'bg-muted-foreground/30'
                            }`}
                          />
                        ))}
                        {task.estimatedPomodoros > 8 && (
                          <span className="text-xs text-muted-foreground ml-1">...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Reorder buttons - more compact */}
                    <div className="flex flex-col gap-0">
                      <Button
                        onClick={() => handleReorderTask(task.id, 'up')}
                        variant="ghost"
                        size="sm"
                        className="w-5 h-3 p-0 text-muted-foreground hover:text-foreground"
                        title="Move Up"
                        disabled={activeTasks.indexOf(task) === 0}
                      >
                        <ChevronUp size={10} />
                      </Button>
                      <Button
                        onClick={() => handleReorderTask(task.id, 'down')}
                        variant="ghost"
                        size="sm"
                        className="w-5 h-3 p-0 text-muted-foreground hover:text-foreground"
                        title="Move Down"
                        disabled={activeTasks.indexOf(task) === activeTasks.length - 1}
                      >
                        <ChevronDown size={10} />
                      </Button>
                    </div>

                    {/* Action buttons - cleaner layout */}
                    <div className="flex items-center gap-1">
                      <Button
                        onClick={() => openEditModal(task)}
                        variant="ghost"
                        size="sm"
                        className="w-7 h-7 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit Task"
                      >
                        <Edit2 size={12} />
                      </Button>
                      <Button
                        onClick={() => handleCompleteTask(task.id)}
                        variant="ghost"
                        size="sm"
                        className="w-7 h-7 p-0 text-success hover:text-success/80 hover:bg-success/10"
                        title="Mark Complete"
                      >
                        <CheckCircle size={12} />
                      </Button>
                      <Button
                        onClick={() => handleDeleteTask(task)}
                        variant="ghost"
                        size="sm"
                        className="w-7 h-7 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        title="Delete Task"
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Completed Today</h4>
          {completedTasks.map((task) => (
            <Card key={task.id} className="opacity-60">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate line-through">{task.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {task.completedPomodoros} pomodoros completed
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDeleteTask(task)}
                    variant="ghost"
                    size="sm"
                    className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                    title="Delete Task"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Task" fullHeight={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="task-name">Task Name *</Label>
            <Input
              id="task-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="What do you want to work on?"
              className="mt-1"
            />
          </div>



          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="estimated-pomodoros">Estimated Pomodoros *</Label>
              <Input
                id="estimated-pomodoros"
                type="number"
                min="1"
                max="20"
                value={formData.estimatedPomodoros}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  estimatedPomodoros: Math.max(1, parseInt(e.target.value) || 1)
                }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of work sessions needed
              </p>
            </div>

            <div>
              <Label htmlFor="task-order">Priority/Order *</Label>
              <Input
                id="task-order"
                type="number"
                min="0"
                max="100"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  order: Math.max(0, parseInt(e.target.value) || 0)
                }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers = higher priority
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="work-duration">Work Duration (min) *</Label>
              <Input
                id="work-duration"
                type="number"
                min="1"
                max="120"
                value={formData.workDuration}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  workDuration: Math.max(1, parseInt(e.target.value) || 25)
                }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="short-break-duration">Short Break (min) *</Label>
              <Input
                id="short-break-duration"
                type="number"
                min="1"
                max="60"
                value={formData.shortBreakDuration}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  shortBreakDuration: Math.max(1, parseInt(e.target.value) || 5)
                }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="long-break-duration">Long Break (min) *</Label>
              <Input
                id="long-break-duration"
                type="number"
                min="1"
                max="120"
                value={formData.longBreakDuration}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  longBreakDuration: Math.max(1, parseInt(e.target.value) || 30)
                }))}
                className="mt-1"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Configure timing for this specific task. Long break occurs after every 4 work sessions.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setShowAddModal(false)}
              variant="outline"
              className="text-button-foreground"
              style={{
                borderColor: `hsl(var(--button))`,
                color: `hsl(var(--button-foreground))`
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddTask}
              disabled={!formData.name.trim()}
              className="text-button-foreground"
              style={{
                backgroundColor: `hsl(var(--button))`,
                color: `hsl(var(--button-foreground))`
              }}
            >
              Add Task
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Task Modal */}
      <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Task" fullHeight={true}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-task-name">Task Name *</Label>
            <Input
              id="edit-task-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="What do you want to work on?"
              className="mt-1"
            />
          </div>



          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-estimated-pomodoros">Estimated Pomodoros *</Label>
              <Input
                id="edit-estimated-pomodoros"
                type="number"
                min="1"
                max="20"
                value={formData.estimatedPomodoros}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  estimatedPomodoros: Math.max(1, parseInt(e.target.value) || 1)
                }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of work sessions needed
              </p>
            </div>

            <div>
              <Label htmlFor="edit-task-order">Priority/Order *</Label>
              <Input
                id="edit-task-order"
                type="number"
                min="0"
                max="100"
                value={formData.order}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  order: Math.max(0, parseInt(e.target.value) || 0)
                }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers = higher priority
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="edit-work-duration">Work Duration (min) *</Label>
              <Input
                id="edit-work-duration"
                type="number"
                min="1"
                max="120"
                value={formData.workDuration}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  workDuration: Math.max(1, parseInt(e.target.value) || 25)
                }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-short-break-duration">Short Break (min) *</Label>
              <Input
                id="edit-short-break-duration"
                type="number"
                min="1"
                max="60"
                value={formData.shortBreakDuration}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  shortBreakDuration: Math.max(1, parseInt(e.target.value) || 5)
                }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-long-break-duration">Long Break (min) *</Label>
              <Input
                id="edit-long-break-duration"
                type="number"
                min="1"
                max="120"
                value={formData.longBreakDuration}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  longBreakDuration: Math.max(1, parseInt(e.target.value) || 30)
                }))}
                className="mt-1"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Configure timing for this specific task. Long break occurs after every 4 work sessions.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setShowEditModal(false)}
              variant="outline"
              className="text-button-foreground"
              style={{
                borderColor: `hsl(var(--button))`,
                color: `hsl(var(--button-foreground))`
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditTask}
              disabled={!formData.name.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl py-3 font-semibold"
              style={{
                backgroundColor: `hsl(var(--primary))`,
                color: `hsl(var(--primary-foreground))`
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Task" fullHeight={true}>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{deletingTask?.name}"? This action cannot be undone.
          </p>
          
          {deletingTask && deletingTask.completedPomodoros > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This task has {deletingTask.completedPomodoros} completed pomodoros that will be lost.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setShowDeleteConfirm(false)}
              variant="outline"
              className="text-button-foreground"
              style={{
                borderColor: `hsl(var(--button))`,
                color: `hsl(var(--button-foreground))`
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteTask}
              variant="destructive"
            >
              Delete Task
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
