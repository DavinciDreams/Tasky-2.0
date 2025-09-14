/**
 * TaskyAssistant (main process)
 *
 * Creates and manages the assistant BrowserWindow (transparent, always-on-top),
 * loads a local script via data URL, and exposes only a minimal preload bridge.
 * Handles bubble UI, drag/click-through behavior, and appearance preferences.
 */

import { BrowserWindow, screen, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../lib/logger';

interface AvatarData {
  selectedAvatar: string;
  avatars: Record<string, string>;
}

class TaskyAssistant {
  private window: BrowserWindow | null;
  public isVisible: boolean;
  private isPersistent: boolean;
  private isDelivering: boolean;
  private selectedAvatar: string;
  private bubbleSide: string;
  private notificationColor: string;
  private notificationFont: string;
  private notificationTextColor: string;
  private bubbleVisible: boolean = false;
  private hitTestTimer: NodeJS.Timeout | null = null;
  private draggingEnabled: boolean = true;

  constructor() {
    this.window = null;
    this.isVisible = false;
    this.isPersistent = true; // Always show as desktop companion
    this.isDelivering = false; // Track if currently delivering notification
    this.selectedAvatar = 'Tasky'; // Default avatar
    this.bubbleSide = 'left'; // Default bubble side
    this.notificationColor = '#ffffff'; // Default notification color (white/button color)
    this.notificationFont = 'system'; // Default notification font
    this.notificationTextColor = '#000000'; // Default notification text color (black/contrast of white)
  }

  create(): BrowserWindow {
    if (this.window) {
      return this.window;
    }

    this.window = new BrowserWindow({
      width: 800, // Increased to accommodate larger speech bubbles
      height: 200,
      frame: false,
      transparent: true,
      alwaysOnTop: true, // Start with always on top, will be adjusted by layer setting
      skipTaskbar: true,
      resizable: false,
      movable: true, // Enable dragging
      minimizable: false,
      maximizable: false,
      closable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true,
        preload: path.join(__dirname, 'assistant-preload.js'),
        backgroundThrottling: false // Prevent performance throttling
      },
      show: false,
      opacity: 1.0 // Ensure full opacity
    });

    // Default to click-through mode (dragging disabled)
    // This will be set properly by setDraggingMode() from main.js

    // Create assistant HTML using separate method to avoid template literal issues
    const clippyHtml = this.createAssistantHTML();

    this.window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(clippyHtml)}`);

    // Let renderer decide ignore/capture based on hit-testing; default capture on start
    try { this.window.setIgnoreMouseEvents(false); } catch {}

    // Open DevTools if requested
    try {
      const WANT_DEVTOOLS = process.env.NODE_ENV === 'development' || process.env.TASKY_DEVTOOLS === '1';
      if (WANT_DEVTOOLS) {
        this.window.webContents.openDevTools({ mode: 'detach' });
      }
    } catch {}

    // Register per-window mouse pass-through toggle listener (once per window)
    const toggleIgnoreChannel = 'assistant:set-ignore-mouse-events';
    const toggleHandler = (_event: any, ignore: boolean) => {
      if (this.window && !this.window.isDestroyed()) {
        try {
          this.window.setIgnoreMouseEvents(!!ignore, { forward: true });
        } catch {}
      }
    };
    ipcMain.on(toggleIgnoreChannel, toggleHandler);

    // Track bubble visibility from renderer
    const bubbleVisChannel = 'assistant:bubble-visible';
    const bubbleHandler = (_event: any, visible: boolean) => {
      this.bubbleVisible = !!visible;
    };
    ipcMain.on(bubbleVisChannel, bubbleHandler);

    // Add DOM ready event to verify content loads
    this.window.webContents.once('dom-ready', () => {
      // Send initial avatar data
      setTimeout(() => {
        const avatarData: AvatarData = {
          selectedAvatar: this.selectedAvatar,
          avatars: {
            'Tasky': 'image' // Indicates to use the tasky.png image
          }
        };
        this.window?.webContents.send('set-initial-avatar', avatarData);
        
        // Send initial bubble side setting
        this.window?.webContents.send('tasky-set-bubble-side', this.bubbleSide);
        
        // Send initial notification settings
        this.window?.webContents.send('tasky-set-notification-color', this.notificationColor);
        this.window?.webContents.send('tasky-set-notification-font', this.notificationFont);
        this.window?.webContents.send('tasky-set-notification-text-color', this.notificationTextColor);
      }, 100);
    });

    this.window.webContents.on('did-finish-load', () => {
      // Content loaded successfully
    });

    this.window.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logger.debug('❌ Clippy window failed to load:', errorCode, errorDescription);
    });

    this.window.on('closed', () => {
      this.window = null;
      this.isVisible = false;
      // Clean up listener for this window
      try {
        ipcMain.removeListener(toggleIgnoreChannel, toggleHandler);
      } catch {}
      try {
        ipcMain.removeListener(bubbleVisChannel, bubbleHandler);
      } catch {}
      if (this.hitTestTimer) {
        clearInterval(this.hitTestTimer);
        this.hitTestTimer = null;
      }
    });

    // DevTools removed for production

    // Start main-process hit testing loop to ensure reliable capture/click-through
    this.startHitTestLoop();

    return this.window;
  }

  private startHitTestLoop(): void {
    if (this.hitTestTimer) {
      clearInterval(this.hitTestTimer);
    }
    this.hitTestTimer = setInterval(() => {
      if (!this.window || this.window.isDestroyed()) return;
      // If neither dragging nor bubble is active, keep pass-through and skip work
      if (!this.draggingEnabled && !this.bubbleVisible) {
        try { this.window.setIgnoreMouseEvents(true, { forward: true }); } catch {}
        return;
      }
      try {
        const bounds = this.window.getBounds();
        const cursor = screen.getCursorScreenPoint();
        const localX = cursor.x - bounds.x;
        const localY = cursor.y - bounds.y;
        const withinWindow = localX >= 0 && localY >= 0 && localX <= bounds.width && localY <= bounds.height;
        let shouldCapture = false;
        if (withinWindow) {
          // Avatar area (approximate 80x80 image centered in 200x200 container at x=200..400)
          // Centered image ~ x:260..340, y:60..140. Slight padding for usability.
          const inAvatar = localX >= 255 && localX <= 345 && localY >= 55 && localY <= 145;
          let inBubble = false;
          if (this.bubbleVisible) {
            if (this.bubbleSide === 'right') {
              inBubble = localX >= 420 && localX <= Math.min(bounds.width - 20, 770) && localY >= 0 && localY <= 200;
            } else {
              inBubble = localX >= 20 && localX <= 180 && localY >= 0 && localY <= 200;
            }
          }
          shouldCapture = (this.draggingEnabled && inAvatar) || inBubble;
        }
        this.window.setIgnoreMouseEvents(!shouldCapture, { forward: true });
      } catch {
        // ignore
      }
    }, 100);
  }

  private createAssistantHTML(): string {
    const scriptPath = path.join(__dirname, 'assistant-script.js');
    let scriptContent = '';
    try {
      scriptContent = fs.readFileSync(scriptPath, 'utf-8');
    } catch (e) {
      logger.debug('Failed to read assistant-script.js:', e as any);
    }
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tasky Assistant</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      -webkit-app-region: no-drag;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    #tasky-container {
      position: absolute;
      width: 200px;
      height: 200px;
      left: 200px;
      top: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-app-region: drag;
      cursor: move;
      z-index: 20;
    }
    
    #tasky-character {
      font-size: 80px;
      animation: bounce 2s infinite;
      cursor: move;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      -webkit-app-region: drag;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    @keyframes bounce {
      0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-10px); }
      60% { transform: translateY(-5px); }
    }
    
    .notification-bubble {
      position: absolute;
      background: #7f7f7c;
      color: white;
      padding: 12px 16px;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 350px;
      min-width: 180px;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      font-size: 14px;
      font-weight: 500;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      pointer-events: none;
      white-space: normal;
      line-height: 1.4;
      -webkit-app-region: no-drag;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    #tasky-character img {
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-app-region: drag;
    }
  </style>
</head>
<body>
  <div id="notification-bubble" class="notification-bubble"></div>
  <div id="tasky-container">
    <div id="tasky-character"></div>
  </div>
  <script>(function(){${scriptContent}\n})();</script>
</body>
</html>`;
  }

  show(message?: string): void {
    if (!this.window) {
      this.create();
    }

    // At this point window cannot be null due to create() call
    if (!this.window) return; // Extra safety check for TypeScript

    // Position in center of screen as desktop companion
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    
    // Center the window on screen
    const xPos = Math.round((width - 800) / 2);   // Center horizontally (800px window width)
    const yPos = Math.round((height - 200) / 2);  // Center vertically (200px window height)
    
    this.window.setPosition(xPos, yPos);
    this.window.show();
    this.window.focus(); // Ensure window gets focus
    this.isVisible = true;
    
    // Assistant window positioned and ready
    
    // Layer setting will be applied by main.js after window creation

    // Send message to Tasky with better error handling
    if (message) {
      setTimeout(() => {
        if (this.window && this.window.webContents) {
          this.window.webContents.send('tasky-speak', message);
        }
      }, 1000); // Reduced wait time since we're not loading external library
    }
  }

  hide(): void {
    if (this.window) {
      this.window.hide();
      this.isVisible = false;
    }
  }

  speak(message: string): void {
    if (!this.isVisible) {
      this.show();
      setTimeout(() => {
        if (this.window && this.window.webContents && !this.window.webContents.isDestroyed()) {
          this.window.webContents.send('tasky-speak', message);
        }
      }, 1500);
    } else if (this.window && this.window.webContents && !this.window.webContents.isDestroyed()) {
      this.window.webContents.send('tasky-speak', message);
    }
  }

  animate(animation: string = 'Congratulate'): void {
    if (this.window && this.isVisible) {
      this.window.webContents.send('tasky-animate', animation);
    }
  }

  destroy(): void {
    if (this.window) {
      this.window.close();
      this.window = null;
      this.isVisible = false;
    }
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  setAvatar(avatarName: string): void {
    this.selectedAvatar = avatarName;
    
    if (this.window) {
      this.window.webContents.send('tasky-change-avatar', avatarName);
      
      // If it's a custom avatar, also send the custom path immediately
      if (avatarName === 'Custom' || avatarName.startsWith('custom_')) {
        setTimeout(() => {
          const { Storage } = require('./storage');
          const store = new Storage();
          const customPath = store.getSetting('customAvatarPath');
          if (customPath) {
            this.setCustomAvatarPath(customPath);
          }
        }, 200);
      }
    }
  }

  setBubbleSide(side: string): void {
    // Store the bubble side preference
    this.bubbleSide = side;
    
    // Send to window if it exists (whether visible or not)
    if (this.window && this.window.webContents && !this.window.webContents.isDestroyed()) {
      this.window.webContents.send('tasky-set-bubble-side', side);
    }
  }

  setNotificationColor(color: string): void {
    // Store the notification color preference
    this.notificationColor = color;
    
    // Send to window if it exists (whether visible or not)
    if (this.window && this.window.webContents && !this.window.webContents.isDestroyed()) {
      this.window.webContents.send('tasky-set-notification-color', color);
    }
  }

  setNotificationFont(font: string): void {
    // Store the notification font preference
    this.notificationFont = font;
    
    // Send to window if it exists (whether visible or not)
    if (this.window && this.window.webContents && !this.window.webContents.isDestroyed()) {
      this.window.webContents.send('tasky-set-notification-font', font);
    }
  }

  setNotificationTextColor(color: string): void {
    // Store the notification text color preference
    this.notificationTextColor = color;
    
    // Send to window if it exists (whether visible or not)
    if (this.window && this.window.webContents && !this.window.webContents.isDestroyed()) {
      this.window.webContents.send('tasky-set-notification-text-color', color);
    }
  }

  setDraggingMode(enabled: boolean): void {
    this.draggingEnabled = enabled;
    if (this.window && this.window.webContents) {
      this.window.webContents.send('set-dragging-mode', enabled);
    }
  }

  setCustomAvatarPath(filePath: string): void {
    if (this.window) {
      setTimeout(() => {
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('tasky-set-custom-avatar', filePath);
        }
      }, 100);
    }
  }

  setLayer(layer: string): void {
    if (this.window) {
      try {
        if (layer === 'below') {
          // Set window below other windows
          this.window.setAlwaysOnTop(false);
          // For Windows, try to set to desktop level
          if (process.platform === 'win32') {
            // Windows-specific: try to set window behind other windows
            this.window.setSkipTaskbar(true);
            this.window.blur(); // Remove focus so it goes behind
          } else if (typeof (this.window as any).setLevel === 'function') {
            (this.window as any).setLevel('desktop');
          }
        } else {
          // Set window above other windows (default)
          this.window.setAlwaysOnTop(true);
          this.window.setSkipTaskbar(true);
          if (process.platform === 'win32') {
            // Additional Windows-specific settings
            this.window.setVisibleOnAllWorkspaces(true);
          }
        }
      } catch (error) {
        // Fallback to basic always on top behavior
        if (layer === 'below') {
          this.window.setAlwaysOnTop(false);
        } else {
          this.window.setAlwaysOnTop(true);
        }
      }
    }
  }
}

export default TaskyAssistant;
