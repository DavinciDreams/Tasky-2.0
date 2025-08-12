/**
 * Storage (electron-store backed)
 *
 * Persists reminders and UI/settings using electron-store with safe defaults.
 * Exposes CRUD helpers for reminders and settings, plus simple import/export
 * and migration helpers. Used by main process to apply and persist user prefs.
 */
const Store = require('electron-store');
import { Settings, Reminder } from '../types';
import { ReminderSqliteStorage } from '../core/storage/ReminderSqliteStorage';
import * as path from 'path';
import * as fs from 'fs';

interface StoreSchema {
  reminders: Reminder[];
  settings: Settings;
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
        }
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
        showTaskStats: true
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
