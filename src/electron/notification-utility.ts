/**
 * NotificationUtility - Centralized notification system for Tasky
 * 
 * Provides notifications for task and reminder creation events,
 * using Tasky's built-in notification system with desktop notifications.
 */

import { app, Notification } from 'electron';
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
    // Get assistant reference from global scope
    this.assistant = (global as any).assistant;
  }

  /**
   * Toggle notifications globally
   */
  toggleNotifications(enabled: boolean): void {
    this.notificationsEnabled = enabled;
    logger.debug('Notifications toggled:', enabled);
  }

  /**
   * Toggle sound globally
   */
  toggleSound(enabled: boolean): void {
    this.soundEnabled = enabled;
    logger.debug('Sound toggled:', enabled);
  }

  /**
   * Show task creation notification
   */
  showTaskCreatedNotification(title: string, description?: string): void {
    const options: NotificationOptions = {
      title: '📋 New Task Created',
      body: description ? `${title}\n\n${description}` : title,
      type: 'task-created',
      clickable: true
    };

    this.showNotification(options);
  }

  /**
   * Show reminder creation notification
   */
  showReminderCreatedNotification(message: string, time: string, days: string[]): void {
    const daysText = days.join(', ');
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
      // Show desktop notification first
      this.showDesktopNotification(options);
      
      // Show Tasky assistant bubble notification
      this.showAssistantBubble(options);
      
      // Show console notification as fallback
      this.showConsoleNotification(options);
    } catch (error) {
      logger.warn('Error showing notification:', error);
      this.showConsoleNotification(options);
    }
  }

  /**
   * Show desktop notification using Electron's built-in system
   */
  private showDesktopNotification(options: NotificationOptions): void {
    try {
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: options.title,
          body: options.body,
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
      }
    } catch (error) {
      logger.debug('Desktop notification failed:', error);
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
   * Show console notification as fallback
   */
  private showConsoleNotification(options: NotificationOptions): void {
    try {
      // Console fallback for all platforms
      console.log(`[${options.type.toUpperCase()}] ${options.title}: ${options.body}`);
    } catch (error) {
      // Final fallback to console
      console.log(`[${options.type.toUpperCase()}] ${options.title}: ${options.body}`);
    }
  }
}

// Export singleton instance
export const notificationUtility = new NotificationUtility();
