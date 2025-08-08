/**
 * Tasky - Desktop Reminder Application
 * 
 * A tray-based reminder application with an animated desktop assistant.
 * Features include recurring       if (!(app as any).isQuiting) {
      e.preventDefault();
      mainWindow?.hide();f (!(app as any).isQuiting) {
      e.preventDefault();
      mainWindow?.hide();inders, notification sounds, and a customizable
 * desktop companion that delivers reminders with personality.
 * 
 * @author Tasky Team
 * @version 1.0.0
 * @license MIT
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell, Notification, OpenDialogReturnValue } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { MainWindow, TrayIcon } from './types/electron';
import { Storage } from './electron/storage';
import ReminderScheduler from './electron/scheduler';
import TaskyAssistant from './electron/assistant';
import { ElectronTaskManager } from './electron/task-manager';
import type { Reminder, Settings } from './types/index';

// Vite globals for Electron
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Extend app object with custom properties
(app as any).isQuiting = false;

// Set AppUserModelID for Windows notifications to ensure proper notification behavior
if (process.platform === 'win32') {
  app.setAppUserModelId('com.tasky.reminderapp');
}

// Global application state
let mainWindow: MainWindow | null = null;        // Main settings/UI window
let tray: TrayIcon | null = null;               // System tray instance
let scheduler: any = null;  // Reminder scheduling service (will be typed later)
let store: Storage | null = null;      // Persistent data storage service
let assistant: any = null;  // Desktop companion/assistant (will be typed later)
let taskManager: ElectronTaskManager | null = null;  // Task management system

/**
 * Creates the main application window for settings and configuration.
 * The window is initially hidden as this is primarily a tray application.
 */
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 650,
    minWidth: 450,
    maxWidth: 450,
    minHeight: 650,
    maxHeight: 650,
    resizable: false, // Disable window resizing
    minimizable: true, // Ensure window can be minimized
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    show: false, // Don't show initially as this is a tray app
    skipTaskbar: false, // Show in taskbar when minimized
    alwaysOnTop: false, // Don't stay on top so it can be minimized properly
    frame: false, // Remove the entire window frame
    titleBarStyle: 'hidden',
    movable: true, // Enable window dragging
    autoHideMenuBar: true, // Hide the menu bar
  });

  // Remove the menu bar completely
  mainWindow.setMenuBarVisibility(false);
  
  // Force window to show in taskbar even when frameless
  mainWindow.setSkipTaskbar(false);

  // and load the index.html of the app.
  if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // In production, determine the correct path based on whether we're packaged or not
    let indexPath;
    if (app.isPackaged) {
      // Try multiple possible paths for packaged app
      const possiblePaths = [
        path.join(process.resourcesPath, 'app.asar', 'src', 'renderer', 'dist', 'index.html'),
        path.join(app.getAppPath(), 'src', 'renderer', 'dist', 'index.html'),
        path.join(__dirname, '..', '..', 'src', 'renderer', 'dist', 'index.html'),
        path.join(process.resourcesPath, 'src', 'renderer', 'dist', 'index.html')
      ];
      
      const fs = require('fs');
      for (const testPath of possiblePaths) {
        try {
          if (fs.existsSync(testPath)) {
            indexPath = testPath;
            break;
          }
        } catch (err) {
          // Continue to next path
        }
      }
      
      if (!indexPath) {
        indexPath = possiblePaths[0]; // Use first as fallback
      }
    } else {
      // In development/unpackaged, use the source directory
      indexPath = path.join(process.cwd(), 'src/renderer/dist/index.html');
    }
    mainWindow.loadFile(indexPath).catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to load renderer file:', err);
        console.error('Attempted path:', indexPath);
      }
      
      // Emergency fallback - load a basic HTML page
      const fallbackHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tasky - Loading Error</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              background: #333; 
              color: white; 
              text-align: center;
            }
            .error { color: #ff6b6b; }
            .path { background: #444; padding: 10px; margin: 10px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>Tasky</h1>
          <p class="error">Failed to load main interface</p>
          <p>Attempted path:</p>
          <div class="path">${indexPath}</div>
          <p>Please check the console for more details.</p>
        </body>
        </html>
      `;
      mainWindow?.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fallbackHtml));
    });
  }

  // Open DevTools only in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Hide window instead of closing
  mainWindow.on('close', (event) => {
    if (!(app as any).isQuiting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Request notification permissions for Windows
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.tasky.reminderapp');
    
    // Check notification permissions
    const { Notification } = require('electron');
    if (process.env.NODE_ENV === 'development') {
      console.log('Notification support:', Notification.isSupported());
    }
  }
  
  // Initialize storage
  store = new Storage();
  store.migrate(); // Run any necessary migrations
  
  // Initialize task manager
  taskManager = new ElectronTaskManager();
  await taskManager.initialize();
  
  // Initialize scheduler
  scheduler = new ReminderScheduler();
  
  // Load saved reminders and settings
  const savedReminders = store.getReminders();
  const settings = store.getAllSettings();
  
  // Initialize Tasky assistant with saved avatar
  assistant = new TaskyAssistant();
  const savedAvatar = settings.selectedAvatar || 'Tasky';
  assistant.setAvatar(savedAvatar);
  
  // If it's a custom avatar, set the custom path
  if (savedAvatar === 'Custom' || savedAvatar.startsWith('custom_')) {
    const customPath = settings.customAvatarPath;
    if (customPath) {
      setTimeout(() => {
        if (assistant && assistant.window) {
          assistant.setCustomAvatarPath(customPath);
        }
      }, 3000);
    }
  }
  
  // Apply dragging setting
  const enableDragging = settings.enableDragging !== undefined ? settings.enableDragging : true;
  assistant.setDraggingMode(enableDragging);
  // If dragging is disabled, allow clicks to pass through by default
  
  // Apply bubble side setting
  const bubbleSide = settings.bubbleSide || 'left';
  assistant.setBubbleSide(bubbleSide);
  
  // Apply notification color setting
  const notificationColor = settings.notificationColor || '#7f7f7c';
  assistant.setNotificationColor(notificationColor);
  
  // Apply notification font setting
  const notificationFont = settings.notificationFont || 'system';
  assistant.setNotificationFont(notificationFont);
  
  // Apply notification text color setting
  const notificationTextColor = settings.notificationTextColor || '#ffffff';
  assistant.setNotificationTextColor(notificationTextColor);
  
  // Apply layer setting - defer until window is created
  const assistantLayer = settings.assistantLayer || 'above';
  
  // Apply animation setting
  const enableAnimation = settings.enableAnimation !== undefined ? settings.enableAnimation : true;
  setTimeout(() => {
    if (assistant && assistant.window) {
      assistant.window.webContents.send('toggle-animation', enableAnimation);
    }
  }, 3000);
  
  // Apply settings to scheduler
  scheduler.toggleNotifications(settings.enableNotifications);
  scheduler.toggleSound(settings.enableSound);
  scheduler.setNotificationType(settings.notificationType || 'custom');
  
  // Configure auto-launch if enabled
  if (settings.autoStart) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      name: 'Tasky',
      args: ['--hidden']
    });
  }
  
  // Load reminders into scheduler
  scheduler.loadReminders(savedReminders);
  
  // Show desktop companion if enabled
  if (settings.enableAssistant) {
    setTimeout(() => {
      try {
        if (assistant) {
          assistant.show();
          
          setTimeout(() => {
            assistant.setLayer(assistantLayer);
          }, 1000);
          
          setTimeout(() => {
            assistant.speak("Hello! I'm Tasky your reminder companion! 📋✨");
          }, 3000);
        }
      } catch (error) {
        console.error('Error starting desktop companion:', error);
      }
    }, 2000); // Increased delay to ensure everything is loaded
  }
  
  createWindow();
  createTray();
  
  // If launched with --hidden argument, don't show the window initially
  if (process.argv.includes('--hidden')) {
    if (mainWindow) {
      mainWindow.hide();
    }
  }

  // Make mainWindow and assistant globally available for scheduler
  global.mainWindow = mainWindow;
  global.assistant = assistant;

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', (e: Event) => {
  // Prevent quitting when windows are closed (tray app behavior)
  e.preventDefault();
});

/**
 * Creates the system tray icon and context menu.
 * Provides access to settings, notification toggle, and application exit.
 */
const createTray = () => {
  // Create a simple 16x16 reminder icon using data URL
  const iconDataURL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAdgAAAHYBTnsmCAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAGESURBVDiNpZM7SwNBFIWfgwQLwcJCG1sLwcJCG1sLG0uxsLG0sLGwsLGwsLBQsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsLGwsA==';
  let trayIcon;
  
  // Try to load custom icon first, fallback to data URL
  // Try multiple possible paths for the tray icon
  const possiblePaths = [
    path.join(__dirname, '../assets/tray-icon.png'),
    path.join(__dirname, '../../src/assets/tray-icon.png'),
    path.join(process.cwd(), 'src/assets/tray-icon.png')
  ];
  
  let iconPath = null;
  for (const testPath of possiblePaths) {
    if (require('fs').existsSync(testPath)) {
      iconPath = testPath;
      if (process.env.NODE_ENV === 'development') {
        console.log('Found tray icon at:', iconPath);
      }
      break;
    }
  }
  
  try {
    if (iconPath) {
      trayIcon = nativeImage.createFromPath(iconPath);
      if (trayIcon.isEmpty()) {
        throw new Error('Icon file is empty');
      }
    } else {
      throw new Error('No icon file found');
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Using fallback icon data URL');
    }
    // Use fallback data URL icon
    trayIcon = nativeImage.createFromDataURL(iconDataURL);
  }
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Tasky - Your Reminder Assistant');
  
  // Create context menu
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '📋 Open Settings',
      click: () => showSettingsWindow()
    },
    {
      label: '🔔 Notifications',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        // Toggle notifications
        if (scheduler) {
          scheduler.toggleNotifications(menuItem.checked);
        }
      }
    },
    {
      type: 'separator'
    },
    {
      label: '❌ Exit',
      click: () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Tray exit clicked, forcing app quit...');
        }
        (app as any).isQuiting = true;
        
        // Cleanup components first
        if (assistant) {
          assistant.destroy();
        }
        if (scheduler) {
          scheduler.destroy();
        }
        
        // Force quit after short delay to allow cleanup
        setTimeout(() => {
          if (process.platform === 'win32') {
            // Force kill the process on Windows if app.quit() doesn't work
            process.exit(0);
          } else {
            app.quit();
          }
        }, 500);
        
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  
  // Handle double-click to open settings
  tray.on('double-click', () => {
    showSettingsWindow();
  });
};

/**
 * Shows the settings window. Creates it if it doesn't exist.
 */
const showSettingsWindow = () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  } else {
    createWindow();
  }
};

// Cleanup when app is about to quit
app.on('before-quit', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('App is about to quit, cleaning up...');
  }
  if (scheduler) {
    scheduler.destroy();
  }
  if (assistant) {
    assistant.destroy();
  }
  if (taskManager) {
    taskManager.cleanup();
  }
});

// Force quit all processes when app is quitting
app.on('will-quit', (event) => {
  // Kill any lingering child processes on Windows
  if (process.platform === 'win32') {
    const { spawn } = require('child_process');
    try {
      spawn('taskkill', ['/f', '/im', 'powershell.exe', '/fi', `PID ne ${process.pid}`], { windowsHide: true });
    } catch (error) {
      // Silently handle errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Error killing child processes:', error);
      }
    }
  }
});

// IPC handlers for renderer communication
ipcMain.handle('get-reminders', () => {
  return store ? store.getReminders() : [];
});

ipcMain.on('add-reminder', (event, reminder) => {
  try {
    if (!reminder || typeof reminder !== 'object') return;
    const { message, time, days } = reminder as any;
    if (typeof message !== 'string' || typeof time !== 'string' || !Array.isArray(days)) return;
    if (store && scheduler) {
      store.addReminder(reminder);
      scheduler.scheduleReminder(reminder);
    }
  } catch {
    // noop
  }
});

ipcMain.on('remove-reminder', (event, id) => {
  if (store && scheduler) {
    store.removeReminder(id);
    scheduler.removeReminder(id);
  }
});

ipcMain.on('update-reminder', (event, id, reminder) => {
  try {
    if (typeof id !== 'string' || !reminder || typeof reminder !== 'object') return;
    if (store && scheduler) {
      store.updateReminder(id, reminder);
      scheduler.updateReminder(id, reminder);
    }
  } catch {
    // noop
  }
});

ipcMain.handle('get-setting', (event, key) => {
  return store ? store.getSetting(key) : undefined;
});

ipcMain.on('set-setting', (event, key, value) => {
  if (store) {
    store.setSetting(key, value);
    
    // Apply setting changes to scheduler
    if (scheduler) {
      switch (key) {
        case 'enableNotifications':
          scheduler.toggleNotifications(value);
          break;
        case 'enableSound':
          scheduler.toggleSound(value);
          break;
        case 'enableAssistant':
          if (value && assistant) {
            if (!assistant.isVisible) {
              assistant.show();
              setTimeout(() => {
                assistant.speak("I'm back! Ready to help with your reminders! 😊");
              }, 1000);
            }
          } else if (assistant && assistant.window) {
            assistant.window.hide();
            assistant.isVisible = false;
          }
          break;
        case 'autoStart':
          app.setLoginItemSettings({
            openAtLogin: value,
            openAsHidden: value,
            name: 'Tasky',
            args: value ? ['--hidden'] : []
          });
          break;
        case 'notificationType':
          if (scheduler) {
            scheduler.setNotificationType(value);
          }
          break;
        case 'selectedAvatar':
          // Avatar change is handled by the change-avatar IPC call
          break;
        case 'enableAnimation':
          if (assistant && assistant.window) {
            assistant.window.webContents.send('toggle-animation', value);
          }
          break;
        case 'assistantLayer':
          if (assistant) {
            assistant.setLayer(value);
          }
          break;
        case 'enableDragging':
          if (assistant) {
            assistant.setDraggingMode(value);
          }
          break;
        case 'bubbleSide':
          if (assistant) {
            assistant.setBubbleSide(value);
          }
          break;
        case 'notificationColor':
          if (assistant) {
            assistant.setNotificationColor(value);
          }
          break;
        case 'notificationFont':
          if (assistant) {
            assistant.setNotificationFont(value);
          }
          break;
        case 'notificationTextColor':
          if (assistant) {
            assistant.setNotificationTextColor(value);
          }
          break;
      }
    }
  }
});

ipcMain.on('toggle-reminders', (event, enabled) => {
  console.log('Toggle reminders called with:', enabled);
  if (scheduler) {
    scheduler.toggleNotifications(enabled);
    console.log('Scheduler notifications set to:', enabled);
  }
  if (store) {
    store.setSetting('enableNotifications', enabled);
    console.log('Settings saved: enableNotifications =', enabled);
  }
});

ipcMain.on('test-notification', () => {
  if (scheduler) {
    scheduler.testNotification();
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Add a force quit handler
ipcMain.on('force-quit', () => {
  console.log('Force quit requested via IPC');
  (app as any).isQuiting = true;
  
  // Cleanup components
  if (assistant) {
    assistant.destroy();
  }
  if (scheduler) {
    scheduler.destroy();
  }
  
  // Force quit after cleanup
  setTimeout(() => {
    if (process.platform === 'win32') {
      process.exit(0);
    } else {
      app.quit();
    }
  }, 500);
  
  app.quit();
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) {
    try {
      mainWindow.setSkipTaskbar(false);
      mainWindow.minimize();
    } catch (error) {
      console.error('Minimize failed:', error);
    }
  }
});

ipcMain.on('show-assistant', (event, message) => {
  if (assistant) {
    assistant.speak(message);
  }
});

ipcMain.on('hide-assistant', () => {
  if (assistant) {
    assistant.hide();
  }
});

ipcMain.on('set-bubble-side', (event, side) => {
  console.log('Set bubble side called with:', side);
  if (assistant) {
    assistant.setBubbleSide(side);
    console.log('Assistant bubble side set to:', side);
  }
  if (store) {
    store.setSetting('bubbleSide', side);
    console.log('Settings saved: bubbleSide =', side);
  }
});

ipcMain.on('change-avatar', (event, avatar) => {
  if (assistant) {
    // Simply change the avatar without destroying the assistant
    assistant.setAvatar(avatar);
    
    // If it's a custom avatar, also send the path immediately
    if (avatar === 'Custom' || avatar.startsWith('custom_')) {
      const customPath = store?.getSetting('customAvatarPath');
      if (customPath) {
        setTimeout(() => {
          if (assistant && assistant.window) {
            assistant.setCustomAvatarPath(customPath);
          }
        }, 1000);
      }
    }
    
    // Send a message from the new avatar
    setTimeout(() => {
      if (avatar === 'Custom' || avatar.startsWith('custom_')) {
        assistant.speak(`Hi! I'm your custom companion! ✨`);
      } else {
        assistant.speak(`Hi! I'm your new ${avatar} companion! 🎉`);
      }
    }, 500);
  }
});

ipcMain.on('toggle-assistant-dragging', (event, enabled) => {
  if (assistant) {
    assistant.setDraggingMode(enabled);
  }
});

ipcMain.on('set-assistant-layer', (event, layer) => {
  if (assistant) {
    assistant.setLayer(layer);
  }
});

ipcMain.handle('select-avatar-file', async () => {
  if (!mainWindow) return null;
  
  try {
    // Use non-destructured approach for compatibility
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Avatar Image',
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
      ],
      properties: ['openFile']
    });

    // Handle result as any to work around type issues
    const dialogResult = result as any;
    
    if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
      return null;
    }

    const filePath = dialogResult.filePaths[0];
    
    // Test if file exists
    if (fs.existsSync(filePath)) {
      console.log('✅ File exists and is accessible');
      return filePath;
    } else {
      console.error('❌ File does not exist or is not accessible');
      return null;
    }
  } catch (error) {
    console.error('Error selecting avatar file:', error);
    return null;
  }
});

ipcMain.handle('get-avatar-data-url', async (event, filePath) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist');
    }
    
    const imageBuffer = fs.readFileSync(filePath);
    const extname = path.extname(filePath).toLowerCase();
    
    // Determine MIME type
    let mimeType = 'image/png'; // default
    switch (extname) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.bmp':
        mimeType = 'image/bmp';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
    }
    
    const base64Image = imageBuffer.toString('base64');
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    console.error('Error reading avatar file:', error);
    return null;
  }
});

// Handler for getting the built-in Tasky avatar
ipcMain.handle('get-tasky-avatar-data-url', async () => {
  try {
    // Try multiple possible paths for the tasky.png file
    const possiblePaths = [
      // Development paths
      path.join(__dirname, '..', 'src', 'assets', 'tasky.png'),
      path.join(process.cwd(), 'src', 'assets', 'tasky.png'),
      path.join(__dirname, '..', '..', 'src', 'assets', 'tasky.png'),
      // Packaged app paths
      path.join(process.resourcesPath, 'app.asar', 'src', 'assets', 'tasky.png'),
      path.join(process.resourcesPath, 'src', 'assets', 'tasky.png'),
      path.join(app.getAppPath(), 'src', 'assets', 'tasky.png'),
      // Additional fallback paths
      path.join(process.resourcesPath, 'app', 'src', 'assets', 'tasky.png')
    ];
    
    let taskyImagePath: string | null = null;
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        taskyImagePath = testPath;
        console.log('✓ Found Tasky avatar at:', taskyImagePath);
        break;
      }
    }
    
    if (!taskyImagePath) {
      console.error('❌ Tasky avatar not found in any of the expected locations');
      return null;
    }
    
    const imageBuffer = fs.readFileSync(taskyImagePath);
    const base64Image = imageBuffer.toString('base64');
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    console.error('Error reading Tasky avatar file:', error);
    return null;
  }
});

// File import helpers for tasks
ipcMain.handle('select-import-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Tasks File',
    filters: [
      { name: 'Data Files', extensions: ['json', 'csv', 'yaml', 'yml', 'xml'] }
    ],
    properties: ['openFile']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('read-import-file', async (_e, filePath: string) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    return `data:application/octet-stream;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
});

ipcMain.handle('parse-yaml', async (_e, text: string) => {
  try {
    const yaml = require('yaml');
    return yaml.parse(text);
  } catch {
    return null;
  }
});

ipcMain.handle('parse-xml', async (_e, text: string) => {
  try {
    const xml2js = require('xml2js');
    let parsed: any = null;
    await xml2js.parseStringPromise(text).then((res: any) => parsed = res);
    return parsed;
  } catch {
    return null;
  }
});

// Directory picker for executionPath
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Directory',
    properties: ['openDirectory']
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Multi-file picker for affectedFiles
ipcMain.handle('select-files', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Files',
    properties: ['openFile', 'multiSelections']
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return result.filePaths;
});

// Open terminal at a path with agent context (best-effort)
ipcMain.handle('open-terminal', async (_e, directory: string, agent: string) => {
  try {
    const cwd = directory && typeof directory === 'string' ? directory : process.cwd();
    if (process.platform === 'win32') {
      // Open PowerShell in directory and print agent name
      spawn('cmd.exe', ['/c', 'start', 'powershell', '-NoExit', '-Command', `Set-Location -Path \"${cwd}\"; Write-Host \"Agent: ${agent || ''}\"`], { windowsHide: false });
    } else if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Terminal', cwd]);
    } else {
      spawn('x-terminal-emulator', [], { cwd, detached: true });
    }
    return true;
  } catch (e) {
    console.error('Failed to open terminal:', e);
    return false;
  }
});

ipcMain.on('get-upcoming-notifications', (event) => {
  console.log('Getting upcoming notifications...');
  if (store) {
    const reminders = store.getReminders();
    const enabledReminders = reminders.filter((r: Reminder) => r.enabled);
    
    if (assistant && assistant.window) {
      assistant.window.webContents.send('upcoming-notifications-response', enabledReminders);
    }
  }
});

// Export for use in other modules
module.exports = { showSettingsWindow };
