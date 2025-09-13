/**
 * Storage (electron-store backed)
 *
 * Persists reminders and UI/settings using electron-store with safe defaults.
 * Exposes CRUD helpers for reminders and settings, plus simple import/export
 * and migration helpers. Used by main process to apply and persist user prefs.
 */
const Store = require('electron-store');
import { Settings, Reminder } from '../types';
import { PomodoroTask } from '../types/pomodoro';
import { ReminderSqliteStorage } from '../core/storage/ReminderSqliteStorage';
import * as path from 'path';
import * as fs from 'fs';

interface PomodoroState {
  isRunning: boolean;
  sessionType: 'work' | 'shortBreak' | 'longBreak';
  sessionCount: number;
  cycleCount: number;
  startTime?: number; // timestamp when timer started
  pausedTime?: number; // remaining time when paused (in seconds)
}

interface StoreSchema {
  reminders: Reminder[];
  settings: Settings;
  pomodoroState: PomodoroState;
  pomodoroTasks: PomodoroTask[];
}

export class Storage {
  private store: any;
  private reminderDb?: ReminderSqliteStorage;

  constructor() {
    // Initialize electron-store with minimal schema to avoid validation issues
    this.store = new Store({
      name: 'tasky-config-v2', // New name to avoid cached schema issues
      defaults: {
        reminders: [],
        settings: {
          enableNotifications: true,
          enableSound: true,
          enableAssistant: true,
          autoStart: false,
          notificationType: 'custom',
          selectedAvatar: 'Tasky',
          darkMode: false,
          enableAnimation: true,
          timeFormat: '24h',
          timezone: '',
          enableDragging: true,
          assistantLayer: 'above',
          bubbleSide: 'left',
          customAvatarPath: '',
          customAvatars: [],
          notificationColor: '#7f7f7c',
          notificationFont: 'system',
          notificationTextColor: '#ffffff',
          enableTasks: true,
          taskNotifications: true,
          autoArchiveCompleted: false,
          taskSortBy: 'dueDate',
          showTaskStats: true
        },
            pomodoroState: {
      isRunning: false,
      sessionType: 'work',
      sessionCount: 0,
      cycleCount: 0
    },
        pomodoroTasks: []
      }
    });
    // If TASKY_DB_PATH is set, use SQLite for reminders
    const envDbPath = process.env.TASKY_DB_PATH;
    if (envDbPath && typeof envDbPath === 'string' && envDbPath.trim().length > 0) {
      const resolvedDb = path.isAbsolute(envDbPath) ? envDbPath : path.join(process.cwd(), envDbPath);
      this.reminderDb = new ReminderSqliteStorage(resolvedDb);
    } else {
      // Fallback: if a default DB exists at data/tasky.db, use it automatically
      try {
        const defaultDbPath = path.join(process.cwd(), 'data', 'tasky.db');
        if (fs.existsSync(defaultDbPath)) {
          this.reminderDb = new ReminderSqliteStorage(defaultDbPath);
        }
      } catch {
        // keep electron-store fallback
      }
    }
  }

  // Reminder methods
  getReminders(): Reminder[] {
    try {
      
      if (this.reminderDb) {
        const reminders = this.reminderDb.getReminders();
        return reminders;
      }
      const reminders = this.store.get('reminders', []);
      return reminders;
    } catch (error) {
      
      return [];
    }
  }

  addReminder(reminder: Reminder): boolean {
    try {
      if (this.reminderDb) return this.reminderDb.addReminder(reminder);
      const reminders = this.getReminders();
      reminders.push(reminder);
      this.store.set('reminders', reminders);
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  updateReminder(id: string, updates: Partial<Reminder>): boolean {
    try {
      if (this.reminderDb) return this.reminderDb.updateReminder(id, updates);
      const reminders = this.getReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index === -1) {
        
        return false;
      }

      reminders[index] = { ...reminders[index], ...updates };
      this.store.set('reminders', reminders);
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  deleteReminder(id: string): boolean {
    try {
      if (this.reminderDb) return this.reminderDb.deleteReminder(id);
      const reminders = this.getReminders();
      const filteredReminders = reminders.filter(r => r.id !== id);
      
      if (filteredReminders.length === reminders.length) {
        
        return false;
      }

      this.store.set('reminders', filteredReminders);
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  // Add alias for compatibility with main.ts
  removeReminder(id: string): boolean {
    return this.deleteReminder(id);
  }

  getReminderById(id: string): Reminder | null {
    try {
      if (this.reminderDb) return this.reminderDb.getReminderById(id);
      const reminders = this.getReminders();
      const reminder = reminders.find(r => r.id === id);
      
      return reminder || null;
    } catch (error) {
      
      return null;
    }
  }

  getActiveReminders(): Reminder[] {
    try {
      if (this.reminderDb) return this.reminderDb.getActiveReminders();
      const reminders = this.getReminders();
      const activeReminders = reminders.filter(r => r.enabled);
      return activeReminders;
    } catch (error) {
      
      return [];
    }
  }

  getRemindersLastUpdated(): number {
    try {
      if (this.reminderDb) return this.reminderDb.getLastUpdated();
      // For electron-store, we don't have timestamps, so return current time
      return Date.now();
    } catch (error) {
      
      return Date.now();
    }
  }

  // Settings methods
  getSetting<K extends keyof Settings>(key: K): Settings[K] | undefined {
    try {
      const value = this.store.get(`settings.${key}` as any);
      return value;
    } catch (error) {
      
      return undefined;
    }
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): boolean {
    try {
      this.store.set(`settings.${key}` as any, value);
      return true;
    } catch (error) {
      
      return false;
    }
  }

  getAllSettings(): Settings {
    try {
      const settings = this.store.get('settings') || {};
      // Normalize legacy values and fill defaults
      let changed = false;
      // timeFormat: coerce '24'/'12' to '24h'/'12h'
      if (settings.timeFormat === '24') { settings.timeFormat = '24h'; changed = true; }
      if (settings.timeFormat === '12') { settings.timeFormat = '12h'; changed = true; }
      // timezone default to system if missing/empty
      if (!settings.timezone || typeof settings.timezone !== 'string' || settings.timezone.length === 0) {
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (tz) { settings.timezone = tz; changed = true; }
        } catch {}
      }
      if (changed) {
        this.store.set('settings', settings);
      }
      
      return settings;
    } catch (error) {
      
      // Return default settings
      return {
        enableNotifications: true,
        enableSound: true,
        enableAssistant: true,
        autoStart: false,
        notificationType: 'custom',
        selectedAvatar: 'Tasky',
        darkMode: false,
        enableAnimation: true,
        timeFormat: '24h',
        timezone: ((): string => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; } })(),
        enableDragging: true,
        assistantLayer: 'above',
        bubbleSide: 'left',
        customAvatarPath: '',
        customAvatars: [],
        notificationColor: '#7f7f7c',
        notificationFont: 'system',
        notificationTextColor: '#ffffff',
        enableTasks: true,
        taskNotifications: true,
        autoArchiveCompleted: false,
        taskSortBy: 'dueDate',
        showTaskStats: true,
        // Default theme settings - Dark theme to match UI
        themeMode: 'custom',
        customTheme: {
          background: '#1F1F23',  // Dark background matching the image
          foreground: '#FFFFFF',  // White text for good contrast
          border: '#2F2F35',      // Slightly lighter dark border
          button: '#5B57D9',      // Purple/indigo button color from image
          accent: '#5B57D9',      // Same purple for accents/progress
          success: '#10B981',     // Green for success/completed
          warning: '#F59E0B',     // Orange for warning/pending
          checkbox: '#5B57D9',    // Purple for checkboxes
          weekday: '#EC4899',     // Pink for weekday highlights
          pomodoro: '#EF4444'     // Red for Pomodoro timer
        }
      };
    }
  }

  updateSettings(newSettings: Partial<Settings>): boolean {
    try {
      const currentSettings = this.getAllSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };
      this.store.set('settings', updatedSettings);
      return true;
    } catch (error) {
      
      return false;
    }
  }

  // Cache management
  clearCache(): boolean {
    try {
      this.store.clear();
      return true;
    } catch (error) {
      
      return false;
    }
  }

  getCacheSize(): number {
    try {
      return JSON.stringify(this.store.store).length;
    } catch (error) {
      
      return 0;
    }
  }

  // Backup and restore
  exportData(): string | null {
    try {
      const data = {
        reminders: this.getReminders(),
        settings: this.getAllSettings()
      };
      return JSON.stringify(data, null, 2);
    } catch (error) {
      
      return null;
    }
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.reminders && Array.isArray(data.reminders)) {
        this.store.set('reminders', data.reminders);
      }
      
      if (data.settings && typeof data.settings === 'object') {
      this.store.set('settings', data.settings);
      }
      
      
      return true;
    } catch (error) {
      
      return false;
    }
  }

  // Pomodoro state methods
  getPomodoroState(): PomodoroState {
    try {
      const state = this.store.get('pomodoroState');
      return state || {
        isRunning: false,
        sessionType: 'work',
        sessionCount: 0,
        cycleCount: 0
      };
    } catch (error) {
      return {
        isRunning: false,
        sessionType: 'work',
        sessionCount: 0,
        cycleCount: 0
      };
    }
  }

  setPomodoroState(state: Partial<PomodoroState>): boolean {
    try {
      const currentState = this.getPomodoroState();
      const updatedState = { ...currentState, ...state };
      this.store.set('pomodoroState', updatedState);
      return true;
    } catch (error) {
      return false;
    }
  }

  resetPomodoroState(): boolean {
    try {
      const defaultState: PomodoroState = {
        isRunning: false,
        sessionType: 'work',
        sessionCount: 0,
        cycleCount: 0
      };
      this.store.set('pomodoroState', defaultState);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Pomodoro task methods
  getPomodoroTasks(): PomodoroTask[] {
    try {
      const tasks = this.store.get('pomodoroTasks', []);
      const migratedTasks = tasks.map((task: any, index: number) => ({
        ...task,
        workDuration: task.workDuration || 25,
        shortBreakDuration: task.shortBreakDuration || 5,
        longBreakDuration: task.longBreakDuration || 30,
        order: task.order !== undefined ? task.order : index, // Migrate existing tasks
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined
      }));
      
      // Sort by order (ascending - lower numbers first)
      return migratedTasks.sort((a: PomodoroTask, b: PomodoroTask) => a.order - b.order);
    } catch (error) {
      return [];
    }
  }

  addPomodoroTask(taskData: { name: string; estimatedPomodoros: number; workDuration: number; shortBreakDuration: number; longBreakDuration: number; order?: number }): PomodoroTask | null {
    try {
      const tasks = this.getPomodoroTasks();
      // Use provided order or get the highest order number and add 1
      const defaultOrder = tasks.length > 0 ? Math.max(...tasks.map(t => t.order)) + 1 : 0;
      
      const newTask: PomodoroTask = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: taskData.name,
        estimatedPomodoros: taskData.estimatedPomodoros,
        workDuration: taskData.workDuration,
        shortBreakDuration: taskData.shortBreakDuration,
        longBreakDuration: taskData.longBreakDuration,
        order: taskData.order !== undefined ? taskData.order : defaultOrder,
        completedPomodoros: 0,
        isActive: false,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      tasks.push(newTask);
      this.store.set('pomodoroTasks', tasks);
      return newTask;
    } catch (error) {
      return null;
    }
  }

  updatePomodoroTask(id: string, updates: Partial<PomodoroTask>): boolean {
    try {
      const tasks = this.getPomodoroTasks();
      const taskIndex = tasks.findIndex(task => task.id === id);
      
      if (taskIndex === -1) {
        return false;
      }

      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updates,
        updatedAt: new Date(),
        completedAt: updates.isCompleted ? new Date() : tasks[taskIndex].completedAt
      };

      this.store.set('pomodoroTasks', tasks);
      return true;
    } catch (error) {
      return false;
    }
  }

  deletePomodoroTask(id: string): boolean {
    try {
      const tasks = this.getPomodoroTasks();
      const filteredTasks = tasks.filter(task => task.id !== id);
      
      if (filteredTasks.length === tasks.length) {
        return false;
      }

      this.store.set('pomodoroTasks', filteredTasks);
      return true;
    } catch (error) {
      return false;
    }
  }

  getActivePomodoroTask(): PomodoroTask | null {
    try {
      const tasks = this.getPomodoroTasks();
      return tasks.find(task => task.isActive && !task.isCompleted) || null;
    } catch (error) {
      return null;
    }
  }

  setActivePomodoroTask(id: string | null): boolean {
    try {
      const tasks = this.getPomodoroTasks();
      
      // Deactivate all tasks first
      tasks.forEach(task => {
        task.isActive = false;
        task.updatedAt = new Date();
      });

      // If id is null, just deactivate all tasks
      if (id === null) {
        this.store.set('pomodoroTasks', tasks);
        return true;
      }

      // Activate the selected task
      const taskIndex = tasks.findIndex(task => task.id === id);
      if (taskIndex === -1) {
        return false;
      }

      tasks[taskIndex].isActive = true;
      tasks[taskIndex].updatedAt = new Date();

      this.store.set('pomodoroTasks', tasks);
      return true;
    } catch (error) {
      return false;
    }
  }

  incrementPomodoroTaskProgress(id: string): boolean {
    try {
      const tasks = this.getPomodoroTasks();
      const taskIndex = tasks.findIndex(task => task.id === id);
      
      if (taskIndex === -1) {
        return false;
      }

      tasks[taskIndex].completedPomodoros += 1;
      tasks[taskIndex].updatedAt = new Date();

      // Mark as completed if we've reached the estimate
      if (tasks[taskIndex].completedPomodoros >= tasks[taskIndex].estimatedPomodoros) {
        tasks[taskIndex].isCompleted = true;
        tasks[taskIndex].isActive = false;
        tasks[taskIndex].completedAt = new Date();
      }

      this.store.set('pomodoroTasks', tasks);
      return true;
    } catch (error) {
      return false;
    }
  }

  reorderPomodoroTask(taskId: string, direction: 'up' | 'down'): boolean {
    try {
      const tasks = this.getPomodoroTasks();
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      
      if (taskIndex === -1) {
        return false;
      }

      const currentTask = tasks[taskIndex];
      
      if (direction === 'up' && taskIndex > 0) {
        // Swap with previous task
        const prevTask = tasks[taskIndex - 1];
        const tempOrder = currentTask.order;
        currentTask.order = prevTask.order;
        prevTask.order = tempOrder;
        currentTask.updatedAt = new Date();
        prevTask.updatedAt = new Date();
      } else if (direction === 'down' && taskIndex < tasks.length - 1) {
        // Swap with next task
        const nextTask = tasks[taskIndex + 1];
        const tempOrder = currentTask.order;
        currentTask.order = nextTask.order;
        nextTask.order = tempOrder;
        currentTask.updatedAt = new Date();
        nextTask.updatedAt = new Date();
      } else {
        return false; // Can't move further in that direction
      }

      this.store.set('pomodoroTasks', tasks);
      return true;
    } catch (error) {
      return false;
    }
  }

  getNextPomodoroTask(): PomodoroTask | null {
    try {
      const tasks = this.getPomodoroTasks();
      // Find the first incomplete task in order
      return tasks.find(task => !task.isCompleted) || null;
    } catch (error) {
      return null;
    }
  }

  // Migration helper
  migrate(): boolean {
    try {
      const version = this.store.get('version', '1.0.0');
      
      // Add migration logic here if needed
      
      
      this.store.set('version', '2.0.0');
      return true;
    } catch (error) {
      
      return false;
    }
  }
}

// Export the PomodoroState type for use in other files
export type { PomodoroState };
