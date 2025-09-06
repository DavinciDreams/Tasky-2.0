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
  // Persist system prompt
  setSystemPrompt: (text: string) => ipcRenderer.send('set-setting', 'llmSystemPrompt', text),
  
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

  // Chat transcript persistence
  createChat: (title?: string) => ipcRenderer.invoke('chat:create', title),
  listChats: (limit?: number) => ipcRenderer.invoke('chat:list', limit),
  loadChat: (chatId: string) => ipcRenderer.invoke('chat:load', chatId),
  saveChat: (chatId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => ipcRenderer.invoke('chat:save', chatId, messages),
  deleteChat: (chatId: string) => ipcRenderer.invoke('chat:delete', chatId),
  resetChats: () => ipcRenderer.invoke('chat:reset'),
  
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
  // Push update listeners
  onTasksUpdated: (callback: () => void) => ipcRenderer.on('tasky:tasks-updated', callback as any),
  onRemindersUpdated: (callback: () => void) => ipcRenderer.on('tasky:reminders-updated', callback as any),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // Pomodoro timer methods
  pomodoroGetState: () => ipcRenderer.invoke('pomodoro:get-state'),
  pomodoroStart: () => ipcRenderer.invoke('pomodoro:start'),
  pomodoroPause: () => ipcRenderer.invoke('pomodoro:pause'),
  pomodoroResetCurrent: () => ipcRenderer.invoke('pomodoro:reset-current'),
  pomodoroResetAll: () => ipcRenderer.invoke('pomodoro:reset-all'),


  // Pomodoro event listeners
  onPomodoroTick: (callback) => ipcRenderer.on('pomodoro:tick', callback),
  onPomodoroSessionComplete: (callback) => ipcRenderer.on('pomodoro:session-complete', callback),
  onPomodoroStarted: (callback) => ipcRenderer.on('pomodoro:started', callback),
  onPomodoroPaused: (callback) => ipcRenderer.on('pomodoro:paused', callback),
  onPomodoroReset: (callback) => ipcRenderer.on('pomodoro:reset', callback),
  onPomodoroResetAll: (callback) => ipcRenderer.on('pomodoro:reset-all', callback),


  // Pomodoro task methods
  pomodoroGetTasks: () => ipcRenderer.invoke('pomodoro:get-tasks'),
  pomodoroAddTask: (taskData) => ipcRenderer.invoke('pomodoro:add-task', taskData),
  pomodoroUpdateTask: (id, updates) => ipcRenderer.invoke('pomodoro:update-task', id, updates),
  pomodoroDeleteTask: (id) => ipcRenderer.invoke('pomodoro:delete-task', id),
  pomodoroSetActiveTask: (id) => ipcRenderer.invoke('pomodoro:set-active-task', id),
  pomodoroGetActiveTask: () => ipcRenderer.invoke('pomodoro:get-active-task'),
  pomodoroReorderTask: (taskId, direction) => ipcRenderer.invoke('pomodoro:reorder-task', taskId, direction),
  pomodoroGetNextTask: () => ipcRenderer.invoke('pomodoro:get-next-task'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);