/**
 * NotificationUtility - Centralized notification system for Tasky
 * 
 * Provides notifications for task and reminder creation events,
 * supporting both native system notifications and Tasky assistant bubbles.
 */

import { Notification, app } from 'electron';
import * as path from 'path';
import logger from '../lib/logger';

export interface NotificationOptions {
  title: string;
  body: string;
  type: 'task-created' | 'reminder-created' | 'info' | 'success' | 'warning';
  silent?: boolean;
  clickable?: boolean;
}

export class NotificationUtility {
  private notificationsEnabled: boolean = true;
  private soundEnabled: boolean = true;
  private assistant: any = null;

  constructor() {
    // Try to get global assistant reference
    try {
      this.assistant = (global as any).assistant;
    } catch (error) {
      logger.debug('Assistant not available for notifications');
    }
  }

  /**
   * Set the assistant reference for bubble notifications
   */
  setAssistant(assistant: any): void {
    this.assistant = assistant;
  }

  /**
   * Toggle notifications globally
   */
  toggleNotifications(enabled: boolean): void {
    this.notificationsEnabled = enabled;
  }

  /**
   * Toggle sound globally
   */
  toggleSound(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Show a notification for task creation
   */
  showTaskCreatedNotification(taskTitle: string, taskDescription?: string): void {
    if (!this.notificationsEnabled) return;

    const options: NotificationOptions = {
      title: '📋 New Task Created',
      body: taskDescription 
        ? `${taskTitle}\n\n${taskDescription}`
        : taskTitle,
      type: 'task-created',
      clickable: true
    };

    this.showNotification(options);
  }

  /**
   * Show a notification for reminder creation
   */
  showReminderCreatedNotification(message: string, time: string, days: string[]): void {
    if (!this.notificationsEnabled) return;

    const daysText = days.length === 7 ? 'every day' : days.join(', ');
    const options: NotificationOptions = {
      title: '🔔 New Reminder Set',
      body: `${message}\n\n⏰ ${time} on ${daysText}`,
      type: 'reminder-created',
      clickable: true
    };

    this.showNotification(options);
  }

  /**
   * Show a general notification
   */
  showNotification(options: NotificationOptions): void {
    if (!this.notificationsEnabled) return;

    try {
      // Try native system notification first
      if (Notification.isSupported()) {
        this.showNativeNotification(options);
      } else {
        this.showFallbackNotification(options);
      }

      // Also show Tasky assistant bubble if available
      this.showAssistantBubble(options);
    } catch (error) {
      logger.warn('Error showing notification:', error);
      this.showFallbackNotification(options);
    }
  }

  /**
   * Show native system notification
   */
  private showNativeNotification(options: NotificationOptions): void {
    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        urgency: 'normal',
        timeoutType: 'default',
        silent: !this.soundEnabled,
        icon: path.join(__dirname, '../assets/app-icon.png')
      });

      notification.show();

      if (options.clickable) {
        notification.on('click', () => {
          // Show main window when notification is clicked
          try {
            const mainWindow = (global as any).mainWindow;
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          } catch (error) {
            logger.debug('Could not show main window:', error);
          }
        });
      }
    } catch (error) {
      logger.warn('Native notification failed, using fallback:', error);
      this.showFallbackNotification(options);
    }
  }

  /**
   * Show Tasky assistant bubble notification
   */
  private showAssistantBubble(options: NotificationOptions): void {
    try {
      if (this.assistant && typeof this.assistant.speak === 'function') {
        // Create a concise message for the bubble
        let bubbleMessage = '';
        
        switch (options.type) {
          case 'task-created':
            bubbleMessage = `New task: ${options.title.replace('📋 New Task Created', '').trim()}`;
            break;
          case 'reminder-created':
            bubbleMessage = `Reminder set: ${options.body.split('\n')[0]}`;
            break;
          default:
            bubbleMessage = options.body;
        }

        this.assistant.speak(bubbleMessage);
      }
    } catch (error) {
      logger.debug('Assistant bubble notification failed:', error);
    }
  }

  /**
   * Show fallback notification (console or other methods)
   */
  private showFallbackNotification(options: NotificationOptions): void {
    try {
      // Try Windows toast notification
      if (process.platform === 'win32') {
        this.showWindowsToastNotification(options);
      } else {
        // Console fallback for other platforms
        console.log(`[${options.type.toUpperCase()}] ${options.title}: ${options.body}`);
      }
    } catch (error) {
      // Final fallback to console
      console.log(`[${options.type.toUpperCase()}] ${options.title}: ${options.body}`);
    }
  }

  /**
   * Show Windows toast notification using PowerShell
   */
  private showWindowsToastNotification(options: NotificationOptions): void {
    try {
      const { spawn } = require('child_process');
      const powershell = spawn('powershell.exe', [
        '-Command',
        `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; [Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null; $template = @'<toast><visual><binding template="ToastGeneric"><text>${options.title}</text><text>${options.body}</text></binding></visual></toast>'@; $xml = New-Object Windows.Data.Xml.Dom.XmlDocument; $xml.LoadXml($template); $toast = New-Object Windows.UI.Notifications.ToastNotification $xml; [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Tasky").Show($toast);`
      ]);

      powershell.on('error', (error: any) => {
        logger.debug('PowerShell toast notification failed:', error);
      });
    } catch (error) {
      logger.debug('Windows toast notification failed:', error);
    }
  }
}

// Export singleton instance
export const notificationUtility = new NotificationUtility();
