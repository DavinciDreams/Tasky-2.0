const Store = require('electron-store');
import { Settings, Reminder } from '../types';

interface StoreSchema {
  reminders: Reminder[];
  settings: Settings;
}

export class Storage {
  private store: any;

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
  }

  // Reminder methods
  getReminders(): Reminder[] {
    try {
      const reminders = this.store.get('reminders', []);
      console.log('Got reminders:', reminders);
      return reminders;
    } catch (error) {
      console.error('Failed to get reminders:', error);
      return [];
    }
  }

  addReminder(reminder: Reminder): boolean {
    try {
      const reminders = this.getReminders();
      reminders.push(reminder);
      this.store.set('reminders', reminders);
      console.log('Added reminder:', reminder);
      return true;
    } catch (error) {
      console.error('Failed to add reminder:', error);
      return false;
    }
  }

  updateReminder(id: string, updates: Partial<Reminder>): boolean {
    try {
      const reminders = this.getReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index === -1) {
        console.error('Reminder not found:', id);
        return false;
      }

      reminders[index] = { ...reminders[index], ...updates };
      this.store.set('reminders', reminders);
      console.log('Updated reminder:', reminders[index]);
      return true;
    } catch (error) {
      console.error('Failed to update reminder:', error);
      return false;
    }
  }

  deleteReminder(id: string): boolean {
    try {
      const reminders = this.getReminders();
      const filteredReminders = reminders.filter(r => r.id !== id);
      
      if (filteredReminders.length === reminders.length) {
        console.error('Reminder not found:', id);
        return false;
      }

      this.store.set('reminders', filteredReminders);
      console.log('Deleted reminder:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete reminder:', error);
      return false;
    }
  }

  // Add alias for compatibility with main.ts
  removeReminder(id: string): boolean {
    return this.deleteReminder(id);
  }

  getReminderById(id: string): Reminder | null {
    try {
      const reminders = this.getReminders();
      const reminder = reminders.find(r => r.id === id);
      console.log('Got reminder by ID:', reminder);
      return reminder || null;
    } catch (error) {
      console.error('Failed to get reminder by ID:', error);
      return null;
    }
  }

  getActiveReminders(): Reminder[] {
    try {
      const reminders = this.getReminders();
      const activeReminders = reminders.filter(r => r.enabled);
      console.log('Got active reminders:', activeReminders);
      return activeReminders;
    } catch (error) {
      console.error('Failed to get active reminders:', error);
      return [];
    }
  }

  // Settings methods
  getSetting<K extends keyof Settings>(key: K): Settings[K] | undefined {
    try {
      const value = this.store.get(`settings.${key}` as any);
      console.log(`Got setting ${key}:`, value);
      return value;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return undefined;
    }
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): boolean {
    try {
      this.store.set(`settings.${key}` as any, value);
      console.log(`Set setting ${key}:`, value);
      return true;
    } catch (error) {
      console.error(`Failed to set setting ${key}:`, error);
      return false;
    }
  }

  getAllSettings(): Settings {
    try {
      const settings = this.store.get('settings');
      console.log('Got all settings:', settings);
      return settings;
    } catch (error) {
      console.error('Failed to get all settings:', error);
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
      console.log('Updated settings:', updatedSettings);
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      return false;
    }
  }

  // Cache management
  clearCache(): boolean {
    try {
      this.store.clear();
      console.log('Cache cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  getCacheSize(): number {
    try {
      return JSON.stringify(this.store.store).length;
    } catch (error) {
      console.error('Failed to get cache size:', error);
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
      console.error('Failed to export data:', error);
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
      
      console.log('Data imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Migration helper
  migrate(): boolean {
    try {
      const version = this.store.get('version', '1.0.0');
      
      // Add migration logic here if needed
      console.log(`Storage migrated from version ${version}`);
      
      this.store.set('version', '2.0.0');
      return true;
    } catch (error) {
      console.error('Failed to migrate storage:', error);
      return false;
    }
  }
}
