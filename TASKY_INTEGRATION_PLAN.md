# 📋 **Tasky Task Management Integration Plan**

## **Executive Summary**

This plan outlines the integration of a lightweight task management capability into Tasky, transforming it from a simple reminder app into a combined reminders + tasks desktop app. All references to "Looper" are removed in favor of Tasky task-manager terminology. Reminder↔task conversion is explicitly out of scope.

---

## **Phase 1: Core Architecture Adaptation**

### **1.1 Schema Integration**

#### **New Task Schema for Tasky**
```typescript
// src/types/task.ts - New file
export interface TaskyTaskSchema {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
  
  // Simplified from Agent (removed category and priority per requirements)
  tags?: string[];
  affectedFiles?: string[];
  estimatedDuration?: number; // in minutes
  dependencies?: string[]; // Task IDs this task depends on
}

export interface TaskyTask {
  schema: TaskyTaskSchema;
  status: TaskStatus;
  humanApproved: boolean;
  result?: string;
  notes?: string;
  completedAt?: Date;
  
  // Tasky-specific features
  reminderEnabled?: boolean;
  reminderTime?: string;
  notificationSent?: boolean;
  
  metadata?: {
    version: number;
    createdBy: string;
    lastModified: Date;
    archivedAt?: Date;
  };
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  ARCHIVED = 'ARCHIVED'
}
```

#### **Updated Main Types**
```typescript
// src/types/index.ts - Extensions
export interface Settings {
  // ... existing settings
  
  // New task management settings
  enableTasks: boolean;
  taskNotifications: boolean;
  autoArchiveCompleted: boolean;
  taskSortBy: 'dueDate' | 'created' | 'priority' | 'status';
  showTaskStats: boolean;
  taskStoragePath?: string;
}

export interface ElectronAPI {
  // ... existing methods
  
  // Task management methods (no reminder↔task conversion)
  createTask: (task: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => Promise<TaskyTask>;
  updateTask: (id: string, updates: Partial<TaskyTask>) => Promise<TaskyTask>;
  deleteTask: (id: string) => Promise<void>;
  getTasks: (filters?: TaskFilterOptions) => Promise<TaskyTask[]>;
  getTask: (id: string) => Promise<TaskyTask>;
  getTaskStats: () => Promise<TaskStatistics>;
  archiveTask: (id: string) => Promise<void>;
}
```

### **1.2 File Structure**

```
src/
  core/
    task-manager/
      index.ts                # Main module exports
      tasky-engine.ts         # Core task management engine (renamed from LooperEngine)
      task-storage.ts         # Task persistence layer
      task-analytics.ts       # Statistics and insights
      task-scheduler.ts       # Due date handling and notifications
      events.ts               # Event system for tasks
      
  components/
    tasks/
      TasksTab.tsx           # Main tasks interface (parallel to RemindersTab)
      TaskForm.tsx           # Task creation/editing
      TaskItem.tsx           # Individual task display
      TaskList.tsx           # Task list with filtering
      TaskStats.tsx          # Statistics dashboard
      TaskFilters.tsx        # Filtering and sorting
      
  electron/
    task-manager.ts          # Electron main process task handling
    task-notifications.ts    # Task notification system
    
  utils/
    task-helpers.ts          # Utility functions
    task-validation.ts       # Input validation
```

---

## **Phase 2: Core Engine Development**

### **2.1 Tasky Engine (Simplified from LooperEngine)**

```typescript
// src/core/task-manager/tasky-engine.ts
export class TaskyEngine {
  private tasks: TaskyTask[] = [];
  private eventBus = new TypedEventBus();
  private storage: TaskStorage;

  constructor(storagePath?: string) {
    this.storage = new TaskStorage(storagePath);
  }

  // Simplified OODA Loop for Task Management
  async observe(): Promise<TaskObservation> {
    const tasks = await this.loadTasks();
    const now = new Date();
    
    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      completedTasks: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      overdueTasks: this.getOverdueTasks(tasks, now).length,
      todaysDueTasks: this.getTodaysDueTasks(tasks, now).length,
      nextDueTask: this.getNextDueTask(tasks, now)
    };
  }

  async orient(observation: TaskObservation): Promise<TaskStrategy> {
    return {
      focusTask: observation.nextDueTask,
      suggestedActions: this.generateSuggestions(observation),
      urgentAlerts: this.getUrgentAlerts(observation)
    };
  }

  async decide(strategy: TaskStrategy): Promise<TaskAction[]> {
    const actions: TaskAction[] = [];
    
    if (strategy.focusTask) {
      actions.push({
        type: 'focus',
        taskId: strategy.focusTask.schema.id,
        message: 'This task needs attention'
      });
    }
    
    return actions;
  }

  async act(actions: TaskAction[]): Promise<void> {
    for (const action of actions) {
      await this.executeAction(action);
    }
  }

  // Core task operations
  async createTask(input: Omit<TaskyTaskSchema, 'id' | 'createdAt'>): Promise<TaskyTask> {
    const task: TaskyTask = {
      schema: {
        ...input,
        id: this.generateTaskId(input.title),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      status: TaskStatus.PENDING,
      humanApproved: false,
      metadata: {
        version: 1,
        createdBy: 'tasky-user',
        lastModified: new Date()
      }
    };

    await this.storage.saveTask(task);
    this.eventBus.emit('task:created', { task });
    
    return task;
  }

  async updateTask(id: string, updates: Partial<TaskyTask>): Promise<TaskyTask> {
    const task = await this.storage.getTask(id);
    if (!task) throw new Error(`Task ${id} not found`);

    const updatedTask: TaskyTask = {
      ...task,
      ...updates,
      schema: {
        ...task.schema,
        ...updates.schema,
        updatedAt: new Date()
      },
      metadata: {
        ...task.metadata,
        lastModified: new Date(),
        version: (task.metadata?.version || 1) + 1
      }
    };

    await this.storage.saveTask(updatedTask);
    this.eventBus.emit('task:updated', { task: updatedTask, previousStatus: task.status });
    
    return updatedTask;
  }

  // Task analysis and insights
  async getTaskAnalytics(): Promise<TaskAnalytics> {
    const tasks = await this.loadTasks();
    return {
      productivity: this.calculateProductivity(tasks),
      completionRate: this.calculateCompletionRate(tasks),
      averageCompletionTime: this.calculateAverageCompletionTime(tasks),
      taskDistribution: this.getTaskDistribution(tasks),
      trends: this.analyzeTrends(tasks)
    };
  }
}
```

### **2.2 Task Storage System**

```typescript
// src/core/task-manager/task-storage.ts
export class TaskStorage {
  private tasksFilePath: string;

  constructor(storagePath?: string) {
    this.tasksFilePath = storagePath || path.join(app.getPath('userData'), 'tasks.json');
  }

  async saveTask(task: TaskyTask): Promise<void> {
    const tasks = await this.loadAllTasks();
    const existingIndex = tasks.findIndex(t => t.schema.id === task.schema.id);
    
    if (existingIndex >= 0) {
      tasks[existingIndex] = task;
    } else {
      tasks.push(task);
    }
    
    await this.saveAllTasks(tasks);
  }

  async loadAllTasks(): Promise<TaskyTask[]> {
    if (!fs.existsSync(this.tasksFilePath)) {
      await this.initializeTaskFile();
      return [];
    }
    
    const content = await fs.readFile(this.tasksFilePath, 'utf-8');
    const data = JSON.parse(content);
    return data.tasks || [];
  }

  async getTask(id: string): Promise<TaskyTask | null> {
    const tasks = await this.loadAllTasks();
    return tasks.find(t => t.schema.id === id) || null;
  }

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.loadAllTasks();
    const filteredTasks = tasks.filter(t => t.schema.id !== id);
    await this.saveAllTasks(filteredTasks);
  }

  private async initializeTaskFile(): Promise<void> {
    const initialData = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      tasks: []
    };
    
    await fs.mkdir(path.dirname(this.tasksFilePath), { recursive: true });
    await fs.writeFile(this.tasksFilePath, JSON.stringify(initialData, null, 2));
  }
}
```

---

## **Phase 3: UI Components Development**

### **3.1 Main Tasks Tab**

```typescript
// src/components/tasks/TasksTab.tsx
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
        if (!showCompleted && task.status === TaskStatus.COMPLETED) return false;
        if (filter.status && !filter.status.includes(task.status)) return false;
        if (filter.search && !task.schema.title.toLowerCase().includes(filter.search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'dueDate':
            return (a.schema.dueDate?.getTime() || 0) - (b.schema.dueDate?.getTime() || 0);
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
    <div className="tasks-tab">
      <TaskStats tasks={tasks} />
      <TaskFilters 
        filter={filter} 
        onFilterChange={setFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        showCompleted={showCompleted}
        onShowCompletedChange={setShowCompleted}
      />
      <TaskForm onCreateTask={onCreateTask} />
      <TaskList 
        tasks={filteredTasks}
        onUpdateTask={onUpdateTask}
        onDeleteTask={onDeleteTask}
        timeFormat={settings.timeFormat}
      />
    </div>
  );
};
```

### **3.2 Task Statistics Component**

```typescript
// src/components/tasks/TaskStats.tsx
interface TaskStatsProps {
  tasks: TaskyTask[];
}

export const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
      overdue: tasks.filter(t => 
        t.schema.dueDate && 
        t.schema.dueDate < now && 
        t.status !== TaskStatus.COMPLETED
      ).length,
      dueToday: tasks.filter(t => 
        t.schema.dueDate && 
        t.schema.dueDate >= today && 
        t.schema.dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
      ).length
    };
  }, [tasks]);

  return (
    <Card className="task-stats">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Task Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Total" value={stats.total} icon="📊" color="blue" />
          <StatCard label="Pending" value={stats.pending} icon="⏳" color="yellow" />
          <StatCard label="In Progress" value={stats.inProgress} icon="🔄" color="blue" />
          <StatCard label="Completed" value={stats.completed} icon="✅" color="green" />
          <StatCard label="Overdue" value={stats.overdue} icon="🚨" color="red" />
          <StatCard label="Due Today" value={stats.dueToday} icon="📅" color="orange" />
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## **Phase 4: Electron Integration**

### **4.1 Main Process Integration**

```typescript
// src/electron/task-manager.ts
import { ipcMain, app } from 'electron';
import { TaskyEngine } from '../core/task-manager';

export class ElectronTaskManager {
  private engine: TaskyEngine;

  constructor() {
    this.engine = new TaskyEngine(path.join(app.getPath('userData'), 'tasks.json'));
    this.setupIpcHandlers();
  }

  private setupIpcHandlers(): void {
    // Task CRUD operations
    ipcMain.handle('task:create', async (event, taskInput) => {
      return await this.engine.createTask(taskInput);
    });

    ipcMain.handle('task:update', async (event, id, updates) => {
      return await this.engine.updateTask(id, updates);
    });

    ipcMain.handle('task:delete', async (event, id) => {
      return await this.engine.deleteTask(id);
    });

    ipcMain.handle('task:get', async (event, id) => {
      return await this.engine.getTask(id);
    });

    ipcMain.handle('task:list', async (event, filters) => {
      return await this.engine.getTasks(filters);
    });

    ipcMain.handle('task:stats', async (event) => {
      return await this.engine.getTaskAnalytics();
    });

    // No reminder↔task conversion
  }

  // Conversion intentionally omitted per scope
}
```

### **4.2 Task Notifications**

```typescript
// src/electron/task-notifications.ts
export class TaskNotificationManager {
  private notifications: Map<string, NodeJS.Timeout> = new Map();

  scheduleTaskDueNotification(task: TaskyTask): void {
    if (!task.schema.dueDate || !task.reminderEnabled) return;

    const notificationTime = new Date(task.schema.dueDate.getTime() - 15 * 60 * 1000); // 15 mins before
    const now = new Date();

    if (notificationTime <= now) return;

    const timeout = setTimeout(() => {
      this.sendTaskDueNotification(task);
    }, notificationTime.getTime() - now.getTime());

    this.notifications.set(task.schema.id, timeout);
  }

  private sendTaskDueNotification(task: TaskyTask): void {
    new Notification('📋 Tasky Task Due', {
      body: `Task "${task.schema.title}" is due soon!`,
      icon: path.join(__dirname, '../assets/icon.ico')
    });
  }

  cancelNotification(taskId: string): void {
    const timeout = this.notifications.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.notifications.delete(taskId);
    }
  }
}
```

---

## **Phase 5: Integration with Existing Tasky Features**

### **5.1 Updated App.tsx Structure**

```typescript
// src/renderer/App.tsx - Updated main app
export default function App() {
  const [activeTab, setActiveTab] = useState<'reminders' | 'tasks' | 'settings' | 'avatar'>('reminders');
  const [tasks, setTasks] = useState<TaskyTask[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  // Task management functions
  const handleCreateTask = async (taskInput: Omit<TaskyTaskSchema, 'id' | 'createdAt'>) => {
    const newTask = await window.electronAPI.createTask(taskInput);
    setTasks(prev => [...prev, newTask]);
  };

  const handleUpdateTask = async (id: string, updates: Partial<TaskyTask>) => {
    const updatedTask = await window.electronAPI.updateTask(id, updates);
    setTasks(prev => prev.map(t => t.schema.id === id ? updatedTask : t));
  };

  const handleDeleteTask = async (id: string) => {
    await window.electronAPI.deleteTask(id);
    setTasks(prev => prev.filter(t => t.schema.id !== id));
  };

  return (
    <div className="app">
      <nav className="tab-navigation">
        <Button 
          variant={activeTab === 'reminders' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('reminders')}
        >
          <Bell className="h-4 w-4 mr-2" />
          Reminders
        </Button>
        <Button 
          variant={activeTab === 'tasks' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare className="h-4 w-4 mr-2" />
          Tasks
        </Button>
        <Button 
          variant={activeTab === 'settings' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
        <Button 
          variant={activeTab === 'avatar' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('avatar')}
        >
          <Smile className="h-4 w-4 mr-2" />
          Avatar
        </Button>
      </nav>

      <main className="tab-content">
        {activeTab === 'reminders' && (
          <RemindersTab
            reminders={reminders}
            onAddReminder={handleAddReminder}
            onRemoveReminder={handleRemoveReminder}
            onEditReminder={handleEditReminder}
            onToggleReminder={handleToggleReminder}
            timeFormat={settings.timeFormat}
          />
        )}
        
        {activeTab === 'tasks' && (
          <TasksTab
            tasks={tasks}
            onCreateTask={handleCreateTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            settings={settings}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onSettingChange={handleSettingChange}
            onTestNotification={handleTestNotification}
          />
        )}
        
        {activeTab === 'avatar' && (
          <AvatarTab
            selectedAvatar={settings.selectedAvatar}
            onAvatarChange={handleAvatarChange}
          />
        )}
      </main>
    </div>
  );
}
```

---

## **Phase 6: Security, Validation, and Settings**

- Add IPC input validation (basic shape checks) for reminders and tasks.
- Assistant window hardening (recommended): use contextIsolation + preload, disable nodeIntegration, enable webSecurity.
- Replace hardcoded scheduler timezone with a user setting.
- Surface task settings (`enableTasks`, `taskNotifications`, `autoArchiveCompleted`, `taskSortBy`, `showTaskStats`) in the Settings tab and persist via `Storage`.

---

## **Phase 7: Implementation Timeline**

### **Week 1-2: Foundation**
- ✅ Create new type definitions
- ✅ Set up basic TaskyEngine class
- ✅ Implement TaskStorage system
- ✅ Create basic UI components structure

### **Week 3-4: Core Features**
- ✅ Implement CRUD operations for tasks
- ✅ Build TasksTab component
- ✅ Build TaskStats component
- ✅ Build TaskFilters component
- ✅ Build TaskForm component
- ✅ Build TaskList component
- ✅ Create task notification system
- ✅ Integrate with Electron main process
- ✅ Add IPC handlers for all task operations
- ✅ Update preload.ts with task management methods
- ✅ Configure TypeScript compilation for task manager

### **Week 5-6: Advanced Features**
- ✅ Implement task analytics and statistics
- ✅ Build task filtering and sorting
- ❌ Reminder↔task conversion utilities (removed)
- ✅ Add task due date notifications

### **Week 7-8: Integration & Polish**
- ✅ Integrate with existing Tasky settings
- ✅ Update main App.tsx with new tab structure
- ✅ Implement data migration tools
- ✅ Add comprehensive testing
- ✅ Performance optimization and bug fixes

---

## **Phase 8: Out of Scope and Removed Items**

### **Removed/Not Implemented**
1. Reminder↔task conversion
2. CLI/Agent-specific features and terminology
3. Complex OODA execution beyond light analytics

---

## **Benefits of This Integration**

1. **Enhanced Productivity**: Transform Tasky from simple reminders to comprehensive task management
2. **Seamless Migration**: Convert existing reminders to tasks and vice versa
3. **Unified Interface**: Single app for both reminders and task management
4. **Smart Analytics**: Insights into productivity patterns and task completion
5. **Flexible Organization**: Tags, due dates, and status tracking
6. **Notification Integration**: Leverage existing notification system for task alerts

This integration plan provides a clear roadmap for incorporating the Agent's powerful task management capabilities into Tasky while maintaining the application's user-friendly design philosophy and removing all CLI/Looper-specific terminology.
