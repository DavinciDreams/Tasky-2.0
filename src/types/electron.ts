import { BrowserWindow, Tray } from 'electron';

export interface MainWindow extends BrowserWindow {}

export interface TrayIcon extends Tray {}

export interface ScheduledTask {
  id: string;
  cronPattern: string;
  task: any; // node-cron task type
}

export interface AssistantWindowOptions {
  width: number;
  height: number;
  x: number;
  y: number;
  alwaysOnTop: boolean;
  skipTaskbar: boolean;
  frame: boolean;
  transparent: boolean;
  resizable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  closable: boolean;
  focusable: boolean;
  show: boolean;
  webPreferences: {
    nodeIntegration: boolean;
    contextIsolation: boolean;
    enableRemoteModule: boolean;
    webSecurity: boolean;
  };
}

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  sound?: boolean;
}

export interface CronJobConfig {
  pattern: string;
  callback: () => void;
  options?: {
    scheduled?: boolean;
    timezone?: string;
  };
}
