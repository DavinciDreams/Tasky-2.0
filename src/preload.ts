/**
 * Preload script for the main renderer window
 *
 * Exposes a narrow, typed IPC bridge to the renderer via `window.electronAPI`.
 * Keeps `contextIsolation: true` and `nodeIntegration: false` for safety.
 */
// Use require form to avoid TS "electron.d.ts is not a module" issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { contextBridge, ipcRenderer } = require('electron');
import { ElectronAPI } from './types';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Reminder management
  addReminder: (reminder) => ipcRenderer.send('add-reminder', reminder),
  removeReminder: (id) => ipcRenderer.send('remove-reminder', id),
  updateReminder: (id, reminder) => ipcRenderer.send('update-reminder', id, reminder),
  getReminders: () => ipcRenderer.invoke('get-reminders'),
  
  // Settings management
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.send('set-setting', key, value),
  
  // Notification controls
  testNotification: () => ipcRenderer.send('test-notification'),
  toggleReminders: (enabled) => ipcRenderer.send('toggle-reminders', enabled),
  toggleAssistantDragging: (enabled) => ipcRenderer.send('toggle-assistant-dragging', enabled),
  setAssistantLayer: (layer) => ipcRenderer.send('set-assistant-layer', layer),
  
  // Assistant controls
  showAssistant: (message) => ipcRenderer.send('show-assistant', message),
  hideAssistant: () => ipcRenderer.send('hide-assistant'),
  changeAvatar: (avatar) => ipcRenderer.send('change-avatar', avatar),
  setBubbleSide: (side) => ipcRenderer.send('set-bubble-side', side),
  selectAvatarFile: () => ipcRenderer.invoke('select-avatar-file'),
  getAvatarDataUrl: (filePath) => ipcRenderer.invoke('get-avatar-data-url', filePath),
  
  // IPC invoke method for general purpose calls
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  
  // Task management methods
  createTask: (task) => ipcRenderer.invoke('task:create', task),
  updateTask: (id, updates) => ipcRenderer.invoke('task:update', id, updates),
  deleteTask: (id) => ipcRenderer.invoke('task:delete', id),
  getTasks: (filters) => ipcRenderer.invoke('task:list', filters),
  getTask: (id) => ipcRenderer.invoke('task:get', id),
  getTaskStats: () => ipcRenderer.invoke('task:stats'),
  archiveTask: (id) => ipcRenderer.invoke('task:archive', id),
  bulkUpdateTaskStatus: (taskIds, status) => ipcRenderer.invoke('task:bulk-update-status', taskIds, status),
  archiveCompletedTasks: () => ipcRenderer.invoke('task:archive-completed'),
  analyzeTasksOverview: () => ipcRenderer.invoke('task:analyze'),
  exportTasks: () => ipcRenderer.invoke('task:export'),
  importTasks: (importData) => ipcRenderer.invoke('task:import', importData),
  executeTask: (id, options) => ipcRenderer.invoke('task:execute', id, options),
  
  // Task-reminder integration
  // Not implemented in main process yet; provide stubs to satisfy typing
  convertReminderToTask: (_reminderId) => Promise.reject('convertReminderToTask not implemented'),
  convertTaskToReminder: (_taskId) => Promise.reject('convertTaskToReminder not implemented'),
  
  // Window controls
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  forceQuit: () => ipcRenderer.send('force-quit'),
  
  // Listen for events from main process
  onReminderNotification: (callback) => ipcRenderer.on('reminder-notification', callback),
  onAssistantMessage: (callback) => ipcRenderer.on('assistant-message', callback),
  onSettingsUpdate: (callback) => ipcRenderer.on('settings-update', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);