export interface Reminder {
  id: string;
  message: string;
  time: string;
  days: string[];
  enabled: boolean;
  oneTime?: boolean;
  triggeredAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Settings {
  enableNotifications: boolean;
  enableSound: boolean;
  enableAssistant: boolean;
  autoStart: boolean;
  notificationType: string;
  selectedAvatar: string;
  darkMode: boolean;
  enableAnimation: boolean;
  timeFormat: '12h' | '24h';
  timezone?: string;
  enableDragging: boolean;
  assistantLayer: 'above' | 'below';
  bubbleSide: 'left' | 'right';
  customAvatarPath: string;
  customAvatars: CustomAvatar[];
  notificationColor: string;
  notificationFont: string;
  notificationTextColor: string;
  // Task management settings
  enableTasks: boolean;
  taskNotifications: boolean;
  autoArchiveCompleted: boolean;
  taskSortBy: 'dueDate' | 'created' | 'status';
  showTaskStats: boolean;
  taskStoragePath?: string;
  // LLM provider settings
  llmProvider?: string;
  llmApiKey?: string;
  llmModel?: string;
  llmBaseUrl?: string;
  // Prompt engineering
  llmSystemPrompt?: string;
  llmUseCustomPrompt?: boolean;
}

export interface CustomAvatar {
  name: string;
  label: string;
  description: string;
  type: 'custom';
  filePath: string;
}

export interface DefaultAvatar {
  name: string;
  label: string;
  description: string;
  type: 'default';
}

export type Avatar = DefaultAvatar | CustomAvatar;

export interface ElectronAPI {
  // Reminder management
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeReminder: (id: string) => void;
  updateReminder: (id: string, reminder: Partial<Reminder>) => void;
  getReminders: () => Promise<Reminder[]>;
  
  // Settings management
  getSetting: (key: keyof Settings) => Promise<any>;
  setSetting: (key: keyof Settings, value: any) => void;
  setSystemPrompt?: (text: string) => void;
  
  // Notification controls
  testNotification: () => void;
  toggleReminders: (enabled: boolean) => void;
  toggleAssistantDragging: (enabled: boolean) => void;
  setAssistantLayer: (layer: 'above' | 'below') => void;
  
  // Assistant controls
  showAssistant: (message: string) => void;
  hideAssistant: () => void;
  changeAvatar: (avatar: string) => void;
  setBubbleSide: (side: 'left' | 'right') => void;
  selectAvatarFile: () => Promise<string>;
  getAvatarDataUrl: (filePath: string) => Promise<string>;
  
  // IPC invoke method for general purpose calls
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // Task management methods
  createTask: (task: any) => Promise<any>;
  updateTask: (id: string, updates: any) => Promise<any>;
  deleteTask: (id: string) => Promise<void>;
  getTasks: (filters?: any) => Promise<any[]>;
  getTask: (id: string) => Promise<any>;
  getTaskStats: () => Promise<any>;
  archiveTask: (id: string) => Promise<void>;
  bulkUpdateTaskStatus: (taskIds: string[], status: string) => Promise<any[]>;
  archiveCompletedTasks: () => Promise<any[]>;
  analyzeTasksOverview: () => Promise<any>;
  exportTasks: () => Promise<any>;
  importTasks: (importData: any) => Promise<any[]>;
  executeTask: (id: string, options?: { agent?: 'claude' | 'gemini' }) => Promise<any>;
  // Chat transcript persistence
  createChat: (title?: string) => Promise<string>;
  listChats: (limit?: number) => Promise<Array<{ id: string; title: string | null; createdAt: string; updatedAt: string }>>;
  loadChat: (chatId: string) => Promise<Array<{ id: string; chatId: string; role: 'user' | 'assistant'; content: string; createdAt: string }>>;
  saveChat: (chatId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => Promise<{ success: boolean }>;
  deleteChat: (chatId: string) => Promise<{ success: boolean }>;
  resetChats: () => Promise<{ success: boolean }>;
  
  // Task-reminder integration
  convertReminderToTask: (reminderId: string) => Promise<any>;
  convertTaskToReminder: (taskId: string) => Promise<any>;
  
  // Window controls
  closeWindow: () => void;
  minimizeWindow: () => void;
  forceQuit: () => void;
  
  // Event listeners
  onReminderNotification: (callback: (event: any, ...args: any[]) => void) => void;
  onAssistantMessage: (callback: (event: any, ...args: any[]) => void) => void;
  onSettingsUpdate: (callback: (event: any, ...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
  // Push updates
  onTasksUpdated?: (callback: () => void) => void;
  onRemindersUpdated?: (callback: () => void) => void;
}

// Component prop types are declared alongside components and not exported globally

// Global window interface extension
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
