import { vi } from 'vitest';

// Global mock for window.electronAPI used across all renderer components
const electronAPIMock = {
  // Reminder management
  addReminder: vi.fn(),
  removeReminder: vi.fn(),
  updateReminder: vi.fn(),
  getReminders: vi.fn().mockResolvedValue([]),

  // Settings management
  getSetting: vi.fn().mockResolvedValue(null),
  setSetting: vi.fn(),
  setSystemPrompt: vi.fn(),

  // Notification controls
  testNotification: vi.fn(),
  toggleReminders: vi.fn(),
  toggleAssistantDragging: vi.fn(),
  setAssistantLayer: vi.fn(),

  // Assistant controls
  showAssistant: vi.fn(),
  hideAssistant: vi.fn(),
  changeAvatar: vi.fn(),
  setBubbleSide: vi.fn(),
  selectAvatarFile: vi.fn().mockResolvedValue(''),
  getAvatarDataUrl: vi.fn().mockResolvedValue(''),

  // IPC invoke
  invoke: vi.fn().mockResolvedValue(null),

  // Task management
  createTask: vi.fn().mockResolvedValue({}),
  updateTask: vi.fn().mockResolvedValue({}),
  deleteTask: vi.fn().mockResolvedValue(undefined),
  getTasks: vi.fn().mockResolvedValue([]),
  getTask: vi.fn().mockResolvedValue({}),
  getTaskStats: vi.fn().mockResolvedValue({}),
  archiveTask: vi.fn().mockResolvedValue(undefined),
  bulkUpdateTaskStatus: vi.fn().mockResolvedValue([]),
  archiveCompletedTasks: vi.fn().mockResolvedValue([]),
  analyzeTasksOverview: vi.fn().mockResolvedValue({}),
  exportTasks: vi.fn().mockResolvedValue({}),
  importTasks: vi.fn().mockResolvedValue([]),
  executeTask: vi.fn().mockResolvedValue({}),

  // Chat persistence
  createChat: vi.fn().mockResolvedValue('chat-1'),
  listChats: vi.fn().mockResolvedValue([]),
  loadChat: vi.fn().mockResolvedValue([]),
  saveChat: vi.fn().mockResolvedValue({ success: true }),
  deleteChat: vi.fn().mockResolvedValue({ success: true }),
  resetChats: vi.fn().mockResolvedValue({ success: true }),

  // MCP
  mcpToolsList: vi.fn().mockResolvedValue({}),
  mcpToolsCall: vi.fn().mockResolvedValue({}),
  convertReminderToTask: vi.fn().mockResolvedValue({}),
  convertTaskToReminder: vi.fn().mockResolvedValue({}),

  // Window controls
  closeWindow: vi.fn(),
  minimizeWindow: vi.fn(),
  forceQuit: vi.fn(),

  // Event listeners
  onReminderNotification: vi.fn(),
  onAssistantMessage: vi.fn(),
  onSettingsUpdate: vi.fn(),
  removeAllListeners: vi.fn(),
  onTasksUpdated: vi.fn(),
  onRemindersUpdated: vi.fn(),
  onNavigateToChat: vi.fn(),

  // Pomodoro
  pomodoroGetState: vi.fn().mockResolvedValue({}),
  pomodoroStart: vi.fn().mockResolvedValue(true),
  pomodoroPause: vi.fn().mockResolvedValue(true),
  pomodoroResetCurrent: vi.fn().mockResolvedValue(true),
  pomodoroResetAll: vi.fn().mockResolvedValue(true),
  onPomodoroTick: vi.fn(),
  onPomodoroSessionComplete: vi.fn(),
  onPomodoroStarted: vi.fn(),
  onPomodoroPaused: vi.fn(),
  onPomodoroReset: vi.fn(),
  onPomodoroResetAll: vi.fn(),
  pomodoroGetTasks: vi.fn().mockResolvedValue([]),
  pomodoroAddTask: vi.fn().mockResolvedValue({}),
  pomodoroUpdateTask: vi.fn().mockResolvedValue(true),
  pomodoroDeleteTask: vi.fn().mockResolvedValue(true),
  pomodoroSetActiveTask: vi.fn().mockResolvedValue(true),
  pomodoroGetActiveTask: vi.fn().mockResolvedValue(null),
  pomodoroReorderTask: vi.fn().mockResolvedValue(true),
  pomodoroGetNextTask: vi.fn().mockResolvedValue(null),
};

// Assign to window
(globalThis as any).window = globalThis.window || {};
(globalThis.window as any).electronAPI = electronAPIMock;
