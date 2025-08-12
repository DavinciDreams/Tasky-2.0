/**
 * ReminderScheduler - Handles scheduling and triggering of reminders
 * 
 * This class manages cron-based scheduling of reminders, handles notification
 * display, and plays notification sounds. It provides fallback mechanisms
 * for cross-platform compatibility.
 */

import * as cron from 'node-cron';
import { Notification, app, shell, BrowserWindow } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import logger from '../lib/logger';
import type { Reminder } from '../types/index';

declare global {
  var assistant: any;
  var mainWindow: BrowserWindow | null;
}

/**
 * ReminderScheduler
 *
 * Manages cron-based reminder scheduling, cross-platform notification delivery
 * (desktop notifications, Windows PowerShell/Toast fallback), and optional
 * sound playback with multiple fallbacks. Timezone is configurable via settings
 * (defaults to system timezone).
 */
class ReminderScheduler {
  private scheduledTasks: Map<string, cron.ScheduledTask>;
  private notificationsEnabled: boolean;
  private soundEnabled: boolean;
  private notificationType: string;
  private bubbleSide?: string;

  constructor() {
    this.scheduledTasks = new Map();    // Maps reminder IDs to cron tasks
    this.notificationsEnabled = true;   // Global notification toggle
    this.soundEnabled = true;           // Global sound toggle
    this.notificationType = 'custom';   // Legacy setting for compatibility
    // Load timezone from settings if available
    try {
      const { Storage } = require('./storage');
      const store = new Storage();
      const tz = store.getSetting('timezone');
      if (typeof tz === 'string' && tz.length > 0) {
        this.bubbleSide = this.bubbleSide; // no-op to keep ts happy
      }
    } catch {}
  }

  /**
   * Converts an array of day names and time into a cron pattern
   * @param days - Array of day names (e.g., ['monday', 'tuesday'])
   * @param time - Time in HH:MM format
   * @returns Cron pattern string
   */
  daysToCronPattern(days: string[], time: string): string {
    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };

    const [hours, minutes] = time.split(':');
    const cronDays = days.map(day => dayMap[day.toLowerCase()]).sort().join(',');
    
    // Cron pattern: minute hour * * day-of-week
    return `${minutes} ${hours} * * ${cronDays}`;
  }

  /**
   * Schedule a new reminder
   */
  scheduleReminder(reminder: Reminder): void {
    const { id, message, time, days, enabled } = reminder;
    
    if (!enabled || !this.notificationsEnabled) {
      return;
    }

    // Remove existing task if it exists
    this.removeReminder(id);

    try {
      const cronPattern = this.daysToCronPattern(days, time);
      logger.debug(`Scheduling reminder ${id} with pattern: ${cronPattern}`);
      
      // Prefer user-configured timezone from settings, else system default
      let configuredTz: string | undefined;
      try {
        const { Storage } = require('./storage');
        const store = new Storage();
        const tz = store.getSetting('timezone');
        if (typeof tz === 'string' && tz.length > 0) configuredTz = tz;
      } catch {}
      const systemTz = configuredTz || Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      const task = cron.schedule(cronPattern, () => {
        this.triggerReminder(reminder);
      }, {
        scheduled: true,
        timezone: systemTz
      });

      this.scheduledTasks.set(id, task);
      logger.debug(`Reminder ${id} scheduled successfully`);
    } catch (error) {
      logger.debug(`Failed to schedule reminder ${id}:`, error as any);
    }
  }

  /**
   * Remove a scheduled reminder
   */
  removeReminder(id: string): void {
    const task = this.scheduledTasks.get(id);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(id);
      if (process.env.NODE_ENV === 'development') {
        // quiet
      }
    }
  }

  /**
   * Update an existing reminder
   */
  updateReminder(id: string, reminder: Reminder): void {
    this.removeReminder(id);
    this.scheduleReminder(reminder);
  }

  /**
   * Toggle all notifications on/off
   */
  toggleNotifications(enabled: boolean): void {
    this.notificationsEnabled = enabled;
    logger.debug(`Notifications ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle sound on/off
   */
  toggleSound(enabled: boolean): void {
    this.soundEnabled = enabled;
    logger.debug(`Sound ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set notification type (legacy - now only used for Clippy bubble side)
   */
  setNotificationType(type: string): void {
    // Convert old notification types to bubble sides
    if (type === 'native') {
      this.bubbleSide = 'right';
    } else {
      this.bubbleSide = 'left';
    }
    logger.debug(`Clippy bubble side set to: ${this.bubbleSide}`);
    
    // Update Clippy bubble side
    if (global.assistant) {
      global.assistant.setBubbleSide(this.bubbleSide);
    }
  }

  /**
   * Get all active reminders
   */
  getActiveReminders(): string[] {
    return Array.from(this.scheduledTasks.keys());
  }

  /**
   * Trigger a reminder (show notification, play sound, etc.)
   */
  triggerReminder(reminder: Reminder): void {
    logger.debug('Triggering reminder:', reminder.message);
    
    if (!this.notificationsEnabled) {
      return;
    }
    
    // Play sound if enabled
    if (this.soundEnabled) {
      this.playNotificationSound();
    }
    
    // Emit event for other components
    if (global.mainWindow && global.mainWindow.webContents) {
      global.mainWindow.webContents.send('reminder-triggered', reminder);
    }
    
    // Use Clippy for notifications if available, otherwise fall back to native notifications
    if (global.assistant && global.assistant.isVisible) {
      global.assistant.speak(reminder.message);
    } else {
      this.showNotification(reminder);
    }
  }

  /**
   * Show native system notification
   */
  showNotification(reminder: Reminder): void {
    try {
      // Check if notifications are supported
      if (!Notification.isSupported()) {
        if (process.env.NODE_ENV === 'development') {
          
        }
        this.showFallbackNotification(reminder);
        return;
      }
      const notification = new Notification({
        title: '📋 Tasky Reminder',
        body: reminder.message,
        urgency: 'normal',
        timeoutType: 'default',
        silent: false,
        icon: path.join(__dirname, '../assets/app-icon.png')
      });

      notification.show();
      
      notification.on('click', () => {
        if (global.mainWindow) {
          global.mainWindow.show();
          global.mainWindow.focus();
        }
      });

      // Note: 'failed' event doesn't exist on Notification, 
      // we handle errors through try-catch instead

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        
      }
      this.showFallbackNotification(reminder);
    }
  }

  /**
   * Fallback notification method using Tasky's notification system
   */
  showFallbackNotification(reminder: Reminder): void {
    try {
      // Use Tasky's notification utility for proper desktop notifications
      const { notificationUtility } = require('./notification-utility');
      notificationUtility.showNotification({
        title: '🔔 Reminder',
        body: reminder.message,
        type: 'info',
        clickable: true
      });
      
      // Also try Tasky assistant bubble notification
      const assistant: any = (global as any).assistant;
      if (assistant && typeof assistant.speak === 'function') {
        assistant.speak(`Reminder: ${reminder.message}`);
      }
      
      // Console fallback for all platforms
      console.log(`[REMINDER] ${reminder.message} - ${reminder.time} on ${reminder.days.join(', ')}`);
    } catch (error) {
      logger.debug('Fallback notification failed:', error);
      // Final fallback to console
      console.log(`[REMINDER] ${reminder.message} - ${reminder.time} on ${reminder.days.join(', ')}`);
    }
  }

  /**
   * Play notification sound
   */
  playNotificationSound(): void {
    logger.debug('playNotificationSound called, soundEnabled:', this.soundEnabled);
    if (!this.soundEnabled) {
      logger.debug('Sound is disabled, skipping');
      return;
    }

    try {
      // Try multiple possible paths for the notification.mp3 file
      const possiblePaths = [
        // Development paths
        path.join(__dirname, '../assets/notification.mp3'),
        path.join(__dirname, '../../src/assets/notification.mp3'),
        path.join(process.cwd(), 'src/assets/notification.mp3'),
        path.join(__dirname, '../../assets/notification.mp3'),
        // Packaged app paths
        path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'notification.mp3'),
        path.join(process.resourcesPath, 'src', 'assets', 'notification.mp3'),
        path.join(app.getAppPath(), 'src', 'assets', 'notification.mp3'),
        // Additional fallback paths for different packaging configurations
        path.join(process.resourcesPath, 'app', 'src', 'assets', 'notification.mp3'),
        path.join(__dirname, '..', '..', '..', 'src', 'assets', 'notification.mp3')
      ];
      
      let customSoundPath: string | null = null;
      
      logger.debug('Checking for notification.mp3 in paths...');
      for (const testPath of possiblePaths) {
        logger.debug('Testing path:', testPath);
        if (fs.existsSync(testPath)) {
          customSoundPath = testPath;
          logger.debug('✓ Found notification sound at:', customSoundPath);
          break;
        } else {
          logger.debug('✗ Path not found:', testPath);
        }
      }
      
      if (customSoundPath) {
        // Try multiple approaches for playing sound
        this.playSoundWithElectron(customSoundPath)
          .catch(() => {
            logger.debug('Electron audio failed, trying alternative method...');
            return this.playSoundWithAudioContext(customSoundPath);
          })
          .catch(() => {
            logger.debug('All audio methods failed, using system sound');
            this.playSystemSound();
          });
      } else {
        this.playSystemSound();
      }
    } catch (error) {
      logger.debug('Exception in playNotificationSound:', error as any);
      this.playSystemSound();
    }
  }

  /**
   * Play sound using Electron's built-in capabilities
   */
  private playSoundWithElectron(soundPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create a hidden browser window to play the sound
        const soundWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false // Allow file:// URLs to work properly
          }
        });

        // Convert Windows path to proper file URL
        let fileUrl: string;
        if (process.platform === 'win32') {
          // Handle Windows paths properly
          fileUrl = `file:///${soundPath.replace(/\\/g, '/').replace(/^([A-Z]):/, '$1:')}`;
        } else {
          fileUrl = `file://${soundPath}`;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Using audio file URL:', fileUrl);
        }
        
        // Load HTML with audio element
        const audioHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Sound Player</title>
          </head>
          <body>
            <audio id="audio" preload="auto" autoplay>
              <source src="${fileUrl}" type="audio/mpeg">
              <source src="${fileUrl}" type="audio/mp3">
              <source src="${fileUrl}" type="audio/wav">
            </audio>
            <script>
              
              const audio = document.getElementById('audio');
              
              // Set volume
              audio.volume = 0.7;
              
              // Add event listeners
              
              audio.addEventListener('ended', () => {
                
                setTimeout(() => window.close(), 100);
              });
              audio.addEventListener('error', (e) => {
                
                setTimeout(() => window.close(), 100);
              });
              
              // Try to play immediately
              
              const playPromise = audio.play();
              
              if (playPromise !== undefined) {
                playPromise
                  .then(() => {
                    
                    // Auto-close after audio duration + buffer
                    setTimeout(() => {
                      if (!soundWindow || !soundWindow.isDestroyed()) {
                        window.close();
                      }
                    }, 3000);
                  })
                  .catch(error => {
                    
                    window.close();
                  });
              }
              
              // Emergency close after 8 seconds
              setTimeout(() => window.close(), 8000);
            </script>
          </body>
          </html>
        `;

        soundWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(audioHtml)}`);
        
        soundWindow.webContents.once('did-finish-load', () => {
        logger.debug('✓ Sound window loaded, attempting audio playback');
        });

        soundWindow.on('closed', () => {
          logger.debug('Sound window closed');
          resolve();
        });

        // Fallback: close window after 10 seconds and reject
        setTimeout(() => {
          if (soundWindow && !soundWindow.isDestroyed()) {
            logger.debug('Force closing sound window after timeout');
            soundWindow.close();
            reject(new Error('Audio playback timeout'));
          }
        }, 10000);

      } catch (error) {
        logger.debug('Electron sound playback failed:', error as any);
        reject(error);
      }
    });
  }

  /**
   * Alternative sound method using AudioContext
   */
  private playSoundWithAudioContext(soundPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Read the audio file
        const audioBuffer = fs.readFileSync(soundPath);
        const base64Audio = audioBuffer.toString('base64');
        
        const soundWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
          }
        });

        const audioContextHtml = `
          <!DOCTYPE html>
          <html>
          <head><title>Audio Context Player</title></head>
          <body>
            <script>
              
              
              const audioData = 'data:audio/mpeg;base64,${base64Audio}';
              
              fetch(audioData)
                .then(response => response.arrayBuffer())
                .then(data => {
                  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  return audioContext.decodeAudioData(data);
                })
                .then(audioBuffer => {
                  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                  const source = audioContext.createBufferSource();
                  source.buffer = audioBuffer;
                  
                  const gainNode = audioContext.createGain();
                  gainNode.gain.value = 0.7;
                  
                  source.connect(gainNode);
                  gainNode.connect(audioContext.destination);
                  
                  source.onended = () => {
                    
                    setTimeout(() => window.close(), 100);
                  };
                  
                  source.start();
                  
                })
                .catch(error => {
                  
                  setTimeout(() => window.close(), 100);
                });
              
              setTimeout(() => window.close(), 5000);
            </script>
          </body>
          </html>
        `;

        soundWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(audioContextHtml)}`);
        
        soundWindow.webContents.once('did-finish-load', () => {
          logger.debug('✓ AudioContext window loaded');
          resolve();
        });

        soundWindow.on('closed', () => {
          logger.debug('AudioContext window closed');
        });

        setTimeout(() => {
          if (soundWindow && !soundWindow.isDestroyed()) {
            soundWindow.close();
            reject(new Error('AudioContext timeout'));
          }
        }, 6000);

      } catch (error) {
        logger.debug('AudioContext method failed:', error as any);
        reject(error);
      }
    });
  }
  
  /**
   * Fallback system sound method
   */
  private playSystemSound(): void {
    logger.debug('Playing system notification sound as fallback');
    try {
      // Use Electron's shell.beep() if available, or create a simple beep sound
      if (shell && typeof shell.beep === 'function') {
        shell.beep();
        logger.debug('✓ Played system beep via Electron shell');
        return;
      }

      // Alternative: Create a simple beep using Web Audio API in a hidden window
      const beepWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      const beepHtml = `
        <!DOCTYPE html>
        <html>
        <head><title>Beep</title></head>
        <body>
          <script>
            try {
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.frequency.value = 800;
              oscillator.type = 'sine';
              
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
              
              oscillator.start(audioContext.currentTime);
              oscillator.stop(audioContext.currentTime + 0.5);
              
              setTimeout(() => window.close(), 1000);
            } catch (error) {
              
              window.close();
            }
          </script>
        </body>
        </html>
      `;

      beepWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(beepHtml)}`);
      
      beepWindow.on('closed', () => {
        logger.debug('✓ System beep completed');
      });

      // Fallback: close after 2 seconds
      setTimeout(() => {
        if (beepWindow && !beepWindow.isDestroyed()) {
          beepWindow.close();
        }
      }, 2000);

    } catch (error) {
      // Ultimate fallback - ASCII bell
      try {
        process.stdout.write('\u0007');
        logger.debug('Used ASCII bell as ultimate fallback');
      } catch (e) {
        logger.debug('Even ASCII bell failed:', e as any);
      }
    }
  }

  /**
   * Test notification
   */
  testNotification(): void {
    const testReminder: Reminder = {
      id: 'test',
      message: 'This is a test notification from Tasky! 🎉',
      time: new Date().toTimeString().slice(0, 5),
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      enabled: true
    };
    
    logger.debug('Notifications enabled:', this.notificationsEnabled);
    logger.debug('Sound enabled:', this.soundEnabled);
    logger.debug('Global assistant available:', !!global.assistant);
    logger.debug('Global mainWindow available:', !!global.mainWindow);
    logger.debug('Test reminder object:', testReminder);
    
    if (!this.notificationsEnabled) {
      logger.debug('⚠️ Test notification blocked - notifications are disabled in settings');
      return;
    }
    
    logger.debug('Calling triggerReminder with test data...');
    this.triggerReminder(testReminder);
  }

  /**
   * Load and schedule multiple reminders
   */
  loadReminders(reminders: Reminder[]): void {
    if (process.env.NODE_ENV === 'development') {
      
    }
    
    // Clear existing tasks
    this.scheduledTasks.forEach((task, id) => {
      task.stop();
    });
    this.scheduledTasks.clear();

    // Schedule new reminders
    reminders.forEach(reminder => {
      if (reminder.enabled) {
        this.scheduleReminder(reminder);
      }
    });
  }

  /**
   * Get next scheduled time for a reminder (for UI display)
   */
  getNextScheduledTime(reminder: Reminder): string {
    try {
      const cronPattern = this.daysToCronPattern(reminder.days, reminder.time);
      const task = cron.schedule(cronPattern, () => {}, { scheduled: false });
      
      // This is a simplified version - you'd need a more sophisticated
      // library like node-cron-tz to get actual next execution times
      return `Next: ${reminder.time} on ${reminder.days.join(', ')}`;
    } catch (error) {
      return 'Invalid schedule';
    }
  }

  /**
   * Clean up all scheduled tasks
   */
  destroy(): void {
    if (process.env.NODE_ENV === 'development') {
      
    }
    this.scheduledTasks.forEach((task, id) => {
      try {
        task.stop();
        (task as any).destroy?.();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          
        }
      }
    });
    this.scheduledTasks.clear();
    
    // Kill any lingering PowerShell processes on Windows
    if (process.platform === 'win32') {
      try {
        // Don't wait for this to complete, just fire and forget
        spawn('taskkill', ['/f', '/im', 'powershell.exe', '/fi', 'WINDOWTITLE eq Windows PowerShell'], { 
          windowsHide: true,
          detached: true,
          stdio: 'ignore'
        }).unref();
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          
        }
      }
    }
  }
}

export default ReminderScheduler;
