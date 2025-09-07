/**
 * Tasky - Electron Main Process
 *
 * Responsibilities:
 * - Creates the main settings window (frameless) and system tray
 * - Initializes storage, reminder scheduler, assistant window, and task manager
 * - Exposes IPC for reminders, settings, tasks, file pickers, and terminal helpers
 * - Orchestrates app lifecycle and applies persisted settings at startup
 */

import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell, OpenDialogReturnValue, globalShortcut } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { spawn, ChildProcess } from 'child_process';
import logger from './lib/logger';
import { MainWindow, TrayIcon } from './types/electron';
import { Storage } from './electron/storage';
import ReminderScheduler from './electron/scheduler';
import { ChatSqliteStorage } from './core/storage/ChatSqliteStorage';
import TaskyAssistant from './electron/assistant';
import { ElectronTaskManager } from './electron/task-manager';
import { notificationUtility } from './electron/notification-utility';
import { PomodoroService } from './electron/pomodoro-service';
import type { Reminder, Settings } from './types/index';

// Vite globals for Electron
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Extend app object with custom properties
(app as any).isQuiting = false;

// Tasky uses bubble notifications only; no OS-specific setup required

// Global application state
let mainWindow: MainWindow | null = null;        // Main settings/UI window
let tray: TrayIcon | null = null;               // System tray instance
let scheduler: any = null;  // Reminder scheduling service (will be typed later)
let store: Storage | null = null;      // Persistent data storage service
let assistant: any = null;  // Desktop companion/assistant (will be typed later)
let taskManager: ElectronTaskManager | null = null;  // Task management system
let pomodoroService: PomodoroService | null = null;  // Pomodoro timer service
let chatStorage: ChatSqliteStorage | null = null; // Chat transcript storage
let mcpServerProcess: ChildProcess | null = null; // MCP server subprocess

/**
 * Creates a simple HTTP server for MCP integration
 */
// MCP server integration using stdio protocol (replaces HTTP approach)
// The MCP tool functionality will be handled via IPC to the MCP subprocess

/**
 * Starts the local MCP server subprocess
 */
const startMcpServer = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const mcpPath = path.join(process.cwd(), 'tasky-mcp-agent');
    const serverScript = path.join(mcpPath, 'src', 'mcp-server.ts');
    
    logger.info('Starting MCP server with stdio transport at:', serverScript);
    
    // Use npm run start:local from the MCP directory with stdio
    mcpServerProcess = spawn('npm', ['run', 'start:local'], {
      cwd: mcpPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        TASKY_DB_PATH: path.join(process.cwd(), 'data', 'tasky.db'),
        CHCP: '65001' // Set UTF-8 encoding for Windows
      },
      shell: true // Use shell on Windows
    });

    let serverStarted = false;

    // Set encoding for streams
    if (mcpServerProcess.stdout) mcpServerProcess.stdout.setEncoding('utf8');
    if (mcpServerProcess.stderr) mcpServerProcess.stderr.setEncoding('utf8');

    mcpServerProcess.stdout?.on('data', (data) => {
      const output = data.toString('utf8');
      logger.debug('MCP Server stdout:', output.trim());
      
      // Handle MCP protocol messages here if needed
    });

    mcpServerProcess.stderr?.on('data', (data) => {
      const error = data.toString('utf8');
      logger.info('MCP Server stderr:', error.trim());
      
      // Check if server has started (stdio transport doesn't bind to ports)
      if (error.includes('connected via stdio') || error.includes('Starting Tasky MCP server')) {
        if (!serverStarted) {
          serverStarted = true;
          logger.info('MCP server started successfully with stdio transport');
          resolve();
        }
      }
    });

    mcpServerProcess.on('error', (error) => {
      logger.error('Failed to start MCP server:', error);
      if (!serverStarted) {
        reject(error);
      }
    });

    mcpServerProcess.on('exit', (code) => {
      logger.info(`MCP server exited with code ${code}`);
      mcpServerProcess = null;
    });

    // Timeout after 10 seconds if server doesn't start
    setTimeout(() => {
      if (!serverStarted) {
        logger.error('MCP server startup timeout');
        reject(new Error('MCP server startup timeout'));
      }
    }, 10000);
  });
};

/**
 * Stops the MCP server subprocess
 */
const stopMcpServer = () => {
  if (mcpServerProcess) {
    logger.info('Stopping MCP server...');
    mcpServerProcess.kill('SIGTERM');
    mcpServerProcess = null;
  }
};

/**
 * Send a message to the MCP server via stdio and await response
 */
const sendMcpMessage = async (message: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (!mcpServerProcess || !mcpServerProcess.stdin || !mcpServerProcess.stdout) {
      reject(new Error('MCP server not available'));
      return;
    }

    const messageStr = JSON.stringify(message) + '\n';
    
    // Set up response handler
    const responseHandler = (data: Buffer) => {
      try {
        const response = JSON.parse(data.toString().trim());
        if (response.id === message.id) {
          mcpServerProcess!.stdout!.removeListener('data', responseHandler);
          resolve(response);
        }
      } catch (error) {
        // Not a JSON response, ignore
      }
    };

    mcpServerProcess.stdout.on('data', responseHandler);
    
    // Send message
    mcpServerProcess.stdin.write(messageStr);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      mcpServerProcess!.stdout!.removeListener('data', responseHandler);
      reject(new Error('MCP message timeout'));
    }, 5000);
  });
};

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
      logger.debug('Failed to load renderer file:', err as any);
      logger.debug('Attempted path:', indexPath);
      
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
  const WANT_DEVTOOLS = process.env.NODE_ENV === 'development' || process.env.TASKY_DEVTOOLS === '1';
  if (WANT_DEVTOOLS) {
    try { mainWindow.webContents.openDevTools({ mode: 'detach' }); } catch {}
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
  // No desktop notification permission required; Tasky uses bubble notifications
  
  // Initialize storage
  store = new Storage();
  store.migrate(); // Run any necessary migrations
  
  // Initialize task manager
  taskManager = new ElectronTaskManager();
  await taskManager.initialize();

  // Initialize pomodoro service
  pomodoroService = new PomodoroService(store);

  // Set up pomodoro event forwarding to renderer
  pomodoroService.on('tick', (state: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('pomodoro:tick', state);
    }
  });

  pomodoroService.on('sessionComplete', (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('pomodoro:session-complete', data);
    }
  });

  pomodoroService.on('started', (state: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('pomodoro:started', state);
    }
  });

  pomodoroService.on('paused', (state: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('pomodoro:paused', state);
    }
  });

  pomodoroService.on('reset', (state: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('pomodoro:reset', state);
    }
  });

  pomodoroService.on('resetAll', (state: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('pomodoro:reset-all', state);
    }
  });



  pomodoroService.on('assistantMessage', (message: string) => {
    if (assistant) {
      assistant.showMessage(message);
    }
  });

  // Initialize chat storage (shares TASKY_DB_PATH)
  try {
    const envDbPath = process.env.TASKY_DB_PATH;
    const dbPath = envDbPath && typeof envDbPath === 'string' && envDbPath.trim().length > 0
      ? (path.isAbsolute(envDbPath) ? envDbPath : path.join(process.cwd(), envDbPath))
      : path.join(process.cwd(), 'data', 'tasky.db');
    chatStorage = new ChatSqliteStorage(dbPath);
    chatStorage.initialize();
  } catch {}
  
  // Start local MCP server
  try {
    await startMcpServer();
    logger.info('MCP server integration ready');
  } catch (error) {
    logger.error('Failed to start MCP server:', error);
    // Don't fail startup if MCP server fails - the app can still work without it
  }
  
  // MCP server integration ready - using stdio protocol
  logger.info('MCP server integration ready');
  
  // Initialize scheduler
  scheduler = new ReminderScheduler();
  
  // Load saved reminders and settings
  const savedReminders = store.getReminders();
  const settings = store.getAllSettings();
  
  // Initialize Tasky assistant with saved avatar
  assistant = new TaskyAssistant();
  const savedAvatar = settings.selectedAvatar || 'Tasky';
  assistant.setAvatar(savedAvatar);
  
  // Notification utility now gets assistant reference from global scope automatically
  
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
    
    // Apply notification settings to notification utility
    notificationUtility.toggleNotifications(settings.enableNotifications);
    notificationUtility.toggleSound(settings.enableSound);
  
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
          
          // Disable system context menu on the assistant window
          const assistantWindow = (assistant as any).window;
          if (assistantWindow) {
            assistantWindow.setMenu(null);
            assistantWindow.webContents.on('context-menu', (event: any) => {
              event.preventDefault();
            });
          }
          
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

  // Register global devtools toggle: Ctrl/Cmd+Shift+I
  try {
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        if (!win) return;
        if (win.webContents.isDevToolsOpened()) win.webContents.closeDevTools();
        else win.webContents.openDevTools({ mode: 'detach' });
      } catch {}
    });
  } catch {}

  // IPC handlers for chat transcripts
  try {
    ipcMain.handle('chat:create', async (_event: any, title?: string) => {
      if (!chatStorage) throw new Error('Chat storage not initialized');
      return chatStorage.createChat(title);
    });
    ipcMain.handle('chat:list', async (_event: any, limit?: number) => {
      if (!chatStorage) throw new Error('Chat storage not initialized');
      return chatStorage.listChats(typeof limit === 'number' ? limit : 20);
    });
    ipcMain.handle('chat:load', async (_event: any, chatId: string) => {
      if (!chatStorage) throw new Error('Chat storage not initialized');
      if (!chatId || typeof chatId !== 'string') throw new Error('chatId is required');
      return chatStorage.loadMessages(chatId);
    });
    ipcMain.handle('chat:save', async (_event: any, chatId: string, messages: Array<{ role: 'user' | 'assistant'; content: string }>) => {
      if (!chatStorage) throw new Error('Chat storage not initialized');
      if (!chatId || typeof chatId !== 'string') throw new Error('chatId is required');
      if (!Array.isArray(messages)) throw new Error('messages must be an array');
      chatStorage.saveTranscript(chatId, messages);
      return { success: true };
    });
    ipcMain.handle('chat:delete', async (_event: any, chatId: string) => {
      if (!chatStorage) throw new Error('Chat storage not initialized');
      if (!chatId || typeof chatId !== 'string') throw new Error('chatId is required');
      chatStorage.deleteChat(chatId);
      return { success: true };
    });
    ipcMain.handle('chat:reset', async () => {
      if (!chatStorage) throw new Error('Chat storage not initialized');
      chatStorage.resetAll();
      return { success: true };
    });

    // MCP IPC handlers for stdio communication
    ipcMain.handle('mcp:tools/list', async () => {
      try {
        const message = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/list'
        };
        const response = await sendMcpMessage(message);
        return response.result;
      } catch (error) {
        logger.error('MCP tools/list error:', error);
        throw error;
      }
    });

    ipcMain.handle('mcp:tools/call', async (event, toolName: string, toolArgs: any) => {
      try {
        const message = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: toolArgs
          }
        };
        const response = await sendMcpMessage(message);
        
        // Handle notifications for task/reminder creation
        if (response.result && !response.error) {
          if (toolName === 'tasky_create_task' && toolArgs?.title) {
            // Show notification for created task
            notificationUtility.showTaskCreatedNotification(toolArgs.title, toolArgs.description);
            // Notify UI to refresh tasks
            try { 
              if (mainWindow) mainWindow.webContents.send('tasky:tasks-updated'); 
            } catch (e) {
              logger.warn('Failed to send tasks-updated event:', e);
            }
          } else if (toolName === 'tasky_create_reminder' && toolArgs?.message) {
            // Show notification for created reminder
            notificationUtility.showReminderCreatedNotification(
              toolArgs.message, 
              toolArgs.time || '', 
              toolArgs.days || []
            );
            // Notify UI to refresh reminders
            try { 
              if (mainWindow) mainWindow.webContents.send('tasky:reminders-updated'); 
            } catch (e) {
              logger.warn('Failed to send reminders-updated event:', e);
            }
          } else if (toolName.includes('update_task') || toolName.includes('delete_task')) {
            // Refresh tasks for update/delete operations
            try { 
              if (mainWindow) mainWindow.webContents.send('tasky:tasks-updated'); 
            } catch (e) {
              logger.warn('Failed to send tasks-updated event:', e);
            }
          } else if (toolName.includes('update_reminder') || toolName.includes('delete_reminder')) {
            // Refresh reminders for update/delete operations
            try { 
              if (mainWindow) mainWindow.webContents.send('tasky:reminders-updated'); 
            } catch (e) {
              logger.warn('Failed to send reminders-updated event:', e);
            }
          }
        }
        
        return response.result;
      } catch (error) {
        logger.error(`MCP tools/call error for ${toolName}:`, error);
        throw error;
      }
    });
  } catch {}

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
      logger.debug('Found tray icon at:', iconPath);
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
    logger.debug('Using fallback icon data URL');
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
      label: '🤖 Show/Hide Assistant',
      click: () => {
        if (assistant) {
          assistant.toggle();
        }
      }
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
        logger.debug('Tray exit clicked, forcing app quit...');
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
  logger.debug('App is about to quit, cleaning up...');
  if (scheduler) {
    scheduler.destroy();
  }
  if (assistant) {
    assistant.destroy();
  }
  if (taskManager) {
    taskManager.cleanup();
  }
  if (pomodoroService) {
    pomodoroService.destroy();
  }
  // Stop MCP server
  stopMcpServer();
});

// Removed forced killing of shell processes on quit to avoid terminating user terminals

// IPC handlers for renderer communication
ipcMain.handle('get-reminders', () => {
  const reminders = store ? store.getReminders() : [];
  return reminders;
});

ipcMain.handle('reminder:last-updated', () => {
  const timestamp = store ? store.getRemindersLastUpdated() : Date.now();
  return timestamp;
});

ipcMain.on('add-reminder', (event, reminder) => {
  try {
    if (!reminder || typeof reminder !== 'object') return;
    const { message, time, days } = reminder as any;
    if (typeof message !== 'string' || typeof time !== 'string' || !Array.isArray(days)) return;
    if (store && scheduler) {
      store.addReminder(reminder);
      scheduler.scheduleReminder(reminder);
      
      // Show creation notification
      notificationUtility.showReminderCreatedNotification(message, time, days);
      // Notify renderer to refresh reminders
      if (mainWindow) {
        try { mainWindow.webContents.send('tasky:reminders-updated'); } catch {}
      }
    }
  } catch {
    // noop
  }
});

ipcMain.on('remove-reminder', (event, id) => {
  if (store && scheduler) {
    store.removeReminder(id);
    scheduler.removeReminder(id);
    if (mainWindow) {
      try { mainWindow.webContents.send('tasky:reminders-updated'); } catch {}
    }
  }
});

ipcMain.on('update-reminder', (event, id, reminder) => {
  try {
    if (typeof id !== 'string' || !reminder || typeof reminder !== 'object') return;
    if (store && scheduler) {
      store.updateReminder(id, reminder);
      scheduler.updateReminder(id, reminder);
    if (mainWindow) {
      try { mainWindow.webContents.send('tasky:reminders-updated'); } catch {}
    }
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
          notificationUtility.toggleNotifications(value);
          break;
        case 'enableSound':
          scheduler.toggleSound(value);
          notificationUtility.toggleSound(value);
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
        case 'llmSystemPrompt':
          // No immediate side-effects; renderer will read this on next send
          break;
        case 'enableAnimation': {
          const anim = !!value;
          if (assistant && assistant.window) {
            assistant.window.webContents.send('toggle-animation', anim);
          }
          break;
        }
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

// Pomodoro timer IPC handlers
ipcMain.handle('pomodoro:get-state', () => {
  if (pomodoroService) {
    return pomodoroService.getTimerDisplay();
  }
  return null;
});

ipcMain.handle('pomodoro:start', () => {
  if (pomodoroService) {
    return pomodoroService.startTimer();
  }
  return false;
});

ipcMain.handle('pomodoro:pause', () => {
  if (pomodoroService) {
    return pomodoroService.pauseTimer();
  }
  return false;
});

ipcMain.handle('pomodoro:reset-current', () => {
  if (pomodoroService) {
    return pomodoroService.resetCurrentSession();
  }
  return false;
});

ipcMain.handle('pomodoro:reset-all', () => {
  if (pomodoroService) {
    return pomodoroService.resetAllSessions();
  }
  return false;
});



// Pomodoro task IPC handlers
ipcMain.handle('pomodoro:get-tasks', () => {
  if (store) {
    return store.getPomodoroTasks();
  }
  return [];
});

ipcMain.handle('pomodoro:add-task', (event, taskData) => {
  if (store) {
    return store.addPomodoroTask(taskData);
  }
  return null;
});

ipcMain.handle('pomodoro:update-task', (event, id, updates) => {
  if (store) {
    return store.updatePomodoroTask(id, updates);
  }
  return false;
});

ipcMain.handle('pomodoro:delete-task', (event, id) => {
  if (store && pomodoroService) {
    // Stop timer if this task was active
    pomodoroService.stopTimerForDeletedTask(id);
    return store.deletePomodoroTask(id);
  }
  return false;
});

ipcMain.handle('pomodoro:set-active-task', (event, id) => {
  if (store) {
    return store.setActivePomodoroTask(id);
  }
  return false;
});

ipcMain.handle('pomodoro:get-active-task', () => {
  if (store) {
    return store.getActivePomodoroTask();
  }
  return null;
});

ipcMain.handle('pomodoro:reorder-task', (event, taskId, direction) => {
  if (store) {
    return store.reorderPomodoroTask(taskId, direction);
  }
  return false;
});

ipcMain.handle('pomodoro:get-next-task', () => {
  if (store) {
    return store.getNextPomodoroTask();
  }
  return null;
});



ipcMain.on('close-window', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// Add a force quit handler
ipcMain.on('force-quit', () => {
  logger.debug('Force quit requested via IPC');
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
      logger.debug('Minimize failed:', error as any);
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
  logger.debug('Set bubble side called with:', side);
  if (assistant) {
    assistant.setBubbleSide(side);
    logger.debug('Assistant bubble side set to:', side);
  }
  if (store) {
    store.setSetting('bubbleSide', side);
    logger.debug('Settings saved: bubbleSide =', side);
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

// Assistant IPC handlers
try {
  ipcMain.on('assistant:open-settings', () => {
    showSettingsWindow();
  });
} catch {}

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
      logger.debug('✅ File exists and is accessible');
      return filePath;
    } else {
      logger.debug('❌ File does not exist or is not accessible');
      return null;
    }
  } catch (error) {
    logger.debug('Error selecting avatar file:', error as any);
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
    logger.debug('Error reading avatar file:', error as any);
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
        logger.debug('✓ Found Tasky avatar at:', taskyImagePath);
        break;
      }
    }
    
    if (!taskyImagePath) {
      logger.debug('❌ Tasky avatar not found in any of the expected locations');
      return null;
    }
    
    const imageBuffer = fs.readFileSync(taskyImagePath);
    const base64Image = imageBuffer.toString('base64');
    return `data:image/png;base64,${base64Image}`;
  } catch (error) {
    logger.debug('Error reading Tasky avatar file:', error as any);
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

// Removed duplicate parsing IPC (import is handled centrally by 'task:import')

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
  logger.debug('Getting upcoming notifications...');
  if (store) {
    const reminders = store.getReminders();
    const enabledReminders = reminders.filter((r: Reminder) => r.enabled);
    
    if (assistant && assistant.window) {
      assistant.window.webContents.send('upcoming-notifications-response', enabledReminders);
    }
  }
});

// Export for use in other modules
export { showSettingsWindow };
