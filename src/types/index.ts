export interface Reminder {
  id: string;
  message: string;
  time: string;
  days: string[];
  enabled: boolean;
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
}

export interface ReminderFormProps {
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditReminder: (id: string, reminder: Partial<Reminder>) => void;
  editingReminder: Reminder | null;
  onCancelEdit: () => void;
  timeFormat: '12h' | '24h';
}

export interface ReminderItemProps {
  reminder: Reminder;
  onRemove: () => void;
  onEdit: () => void;
  onToggle: (enabled: boolean) => void;
  timeFormat: '12h' | '24h';
}

export interface SettingsTabProps {
  settings: Settings;
  onSettingChange: (key: keyof Settings, value: any) => void;
  onTestNotification: () => void;
}

export interface AvatarTabProps {
  selectedAvatar: string;
  onAvatarChange: (avatar: string) => void;
}

export interface RemindersTabProps {
  reminders: Reminder[];
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onRemoveReminder: (id: string) => void;
  onEditReminder: (id: string, reminder: Partial<Reminder>) => void;
  onToggleReminder: (id: string, enabled: boolean) => void;
  timeFormat: '12h' | '24h';
}

// Global window interface extension
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
