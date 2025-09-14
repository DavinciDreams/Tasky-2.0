/**
 * Assistant window script (executed in the assistant BrowserWindow)
 *
 * Runs in the DOM context and communicates with main via a minimal preload bridge
 * exposed as `window.assistantAPI`. Avoids Node APIs for security.
 */

// Global interface declaration
interface AssistantAPI {
  send: (channel: string, ...args: any[]) => void;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
}

const character = document.getElementById('tasky-character') as HTMLElement | null;
const bubble = document.getElementById('notification-bubble') as HTMLElement | null;
const containerEl = document.getElementById('tasky-container') as HTMLElement | null;

function getAvatarRectNow(): DOMRect | null {
  const character = document.getElementById('tasky-character') as HTMLElement | null;
  if (!character) return null;
  
  // Get the actual character element (whether it's text or contains an image)
  return character.getBoundingClientRect();
}

// Access IPC via preload-injected bridge for security
const ipcRenderer = (window as any).assistantAPI as AssistantAPI;

let isDelivering = false;
let bubbleSide: 'left' | 'right' = 'left';
let notificationColor = '#7f7f7c';
let notificationFont = 'system';
let notificationTextColor = '#ffffff';
let bubbleVisible = false;
let draggingEnabled = true;
let lastIgnoreState: boolean | null = null;

// Simple IPC handlers
function positionBubble() {
  if (!bubble) return;
  
  const avatarRect = getAvatarRectNow();
  if (!avatarRect) return;
  
  const gap = 50; // MUCH larger gap to prevent any overlap
  const bubbleWidth = 250; // slightly smaller bubble width
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportPadding = 15; // more padding from screen edges
  
  // Set bubble width
  bubble.style.width = `${bubbleWidth}px`;
  bubble.style.maxWidth = `${bubbleWidth}px`;
  bubble.style.minWidth = `180px`; // minimum width if needed
  
  let leftPosition: number;
  
  if (bubbleSide === 'left') {
    // Position bubble to the left of avatar with large gap
    leftPosition = avatarRect.left - gap - bubbleWidth;
    
    // If bubble would go off-screen, place it with minimum padding
    if (leftPosition < viewportPadding) {
      leftPosition = viewportPadding;
      // Reduce bubble width if necessary to maintain gap from avatar
      const availableWidth = avatarRect.left - gap - viewportPadding;
      if (availableWidth < bubbleWidth && availableWidth > 180) {
        bubble.style.width = `${availableWidth}px`;
        bubble.style.maxWidth = `${availableWidth}px`;
      }
    }
  } else {
    // Position bubble to the right of avatar with large gap
    leftPosition = avatarRect.right + gap;
    
    // If bubble would go off-screen, adjust position and width
    if (leftPosition + bubbleWidth > viewportWidth - viewportPadding) {
      const availableWidth = viewportWidth - viewportPadding - (avatarRect.right + gap);
      if (availableWidth > 180) {
        bubble.style.width = `${Math.min(bubbleWidth, availableWidth)}px`;
        bubble.style.maxWidth = `${Math.min(bubbleWidth, availableWidth)}px`;
      } else {
        // Not enough space on right, force to left with padding
        leftPosition = avatarRect.left - gap - bubbleWidth;
        if (leftPosition < viewportPadding) {
          leftPosition = viewportPadding;
        }
      }
    }
  }
  
  // Set position
  bubble.style.left = `${leftPosition}px`;
  bubble.style.right = 'auto';
  bubble.style.top = `${avatarRect.top + avatarRect.height / 2}px`;
  bubble.style.transform = 'translateY(-50%)';
  

}

function showBubble(text: string) {
  if (!bubble) return;
  
  // Log current notification appearance settings
  console.log('🎨 Notification Appearance Settings:');
  console.log('  Background Color:', notificationColor);
  console.log('  Text Color:', notificationTextColor);
  console.log('  Font:', notificationFont);
  console.log('  Bubble Side:', bubbleSide);
  
  bubble.textContent = text;
  bubble.style.background = notificationColor;
  bubble.style.color = notificationTextColor;
  bubble.style.fontFamily = notificationFont === 'system' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : notificationFont;
  bubble.style.display = 'block';
  positionBubble();
  
  // Trigger animation
  setTimeout(() => {
    bubble.style.opacity = '1';
    bubble.style.transform = 'translateY(-50%) scale(1)';
  }, 10);
  
  bubbleVisible = true;
}

function hideBubble() {
  if (!bubble || !bubbleVisible) return;
  
  bubble.style.opacity = '0';
  bubble.style.transform = 'translateY(-50%) scale(0.9)';
  
  setTimeout(() => {
    bubble.style.display = 'none';
    bubbleVisible = false;
  }, 300);
}

// Ensure we request initial avatar in case the timing of set-initial-avatar is late
window.addEventListener('DOMContentLoaded', () => {
  try {
    ipcRenderer
      .invoke('get-tasky-avatar-data-url')
      .then((dataUrl: string) => {
        // If character is still empty and no child image exists, set Tasky immediately and fade in
        if (character && !character.querySelector('img') && dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = 'Tasky';
          img.style.width = '80px';
          img.style.height = '80px';
          img.draggable = false;
          character.appendChild(img);
          
          // Fade in
          setTimeout(() => {
            character.style.opacity = '1';
          }, 100);
        }
      })
      .catch((e: any) => {
        console.warn('Failed to get avatar data URL:', e);
        // Fallback: show default emoji
        if (character && !character.querySelector('img') && !character.textContent) {
          character.textContent = '📋';
          character.style.opacity = '1';
        }
      });
  } catch (e: any) {
    console.warn('Failed to invoke get-tasky-avatar-data-url:', e);
    // Fallback: show default emoji
    if (character && !character.querySelector('img') && !character.textContent) {
      character.textContent = '📋';
      character.style.opacity = '1';
    }
  }
});

// IPC message handlers
ipcRenderer.on('tasky-speak', (event: any, text: string) => {
  if (isDelivering) return; // Prevent overlapping messages
  
  isDelivering = true;
  showBubble(text);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    hideBubble();
    setTimeout(() => {
      isDelivering = false;
    }, 300);
  }, 5000);
});

ipcRenderer.on('tasky-change-avatar', (event: any, avatarName: string) => {
  if (!character) return;
  
  // Clear existing content
  character.innerHTML = '';
  character.textContent = '';
  
  if (avatarName === 'Custom') {
    // Will be handled by set-custom-avatar
    return;
  }
  
  if (avatarName === 'Tasky') {
    // Load the proper Tasky image
    ipcRenderer.invoke('get-tasky-avatar-data-url')
      .then((dataUrl: string) => {
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = 'Tasky';
          img.style.width = '80px';
          img.style.height = '80px';
          img.draggable = false;
          character.appendChild(img);
          character.style.opacity = '1';
        } else {
          // Fallback only if image loading fails
          character.textContent = '📋';
          character.style.opacity = '1';
        }
      })
      .catch((e: any) => {
        console.warn('Failed to load Tasky avatar:', e);
        character.textContent = '📋';
        character.style.opacity = '1';
      });
  } else {
    // Handle other built-in avatars as emojis (these are intentional)
    const avatarMap: Record<string, string> = {
      'Robot': '🤖',
      'Cat': '🐱',
      'Dog': '🐶',
      'Bear': '🐻',
      'Panda': '🐼'
    };
    
    const emoji = avatarMap[avatarName] || '📋';
    character.textContent = emoji;
    character.style.opacity = '1';
  }
});

ipcRenderer.on('tasky-set-custom-avatar', (event: any, dataUrl: string) => {
  if (!character) return;
  
  // Clear existing content
  character.innerHTML = '';
  character.textContent = '';
  
  const img = document.createElement('img');
  img.src = dataUrl;
  img.alt = 'Custom Avatar';
  img.style.width = '80px';
  img.style.height = '80px';
  img.draggable = false;
  character.appendChild(img);
  character.style.opacity = '1';
});

ipcRenderer.on('tasky-set-bubble-side', (event: any, side: 'left' | 'right') => {
  console.log('🔄 Bubble side updated to:', side);
  bubbleSide = side;
  if (bubbleVisible) {
    console.log('📍 Repositioning visible bubble to', side, 'side');
    positionBubble();
  }
});

ipcRenderer.on('tasky-set-notification-color', (event: any, color: string) => {
  console.log('🎨 Notification background color updated to:', color);
  notificationColor = color;
  if (bubbleVisible && bubble) {
    bubble.style.background = color;
  }
});

ipcRenderer.on('tasky-set-notification-font', (event: any, font: string) => {
  console.log('🎨 Notification font updated to:', font);
  notificationFont = font;
  if (bubbleVisible && bubble) {
    bubble.style.fontFamily = font === 'system' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : font;
  }
});

ipcRenderer.on('tasky-set-notification-text-color', (event: any, color: string) => {
  console.log('🎨 Notification text color updated to:', color);
  notificationTextColor = color;
  if (bubbleVisible && bubble) {
    bubble.style.color = color;
  }
});

// Hover hit-testing focused on the character only: capture on hover, release on leave
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('tasky-container') as HTMLElement | null;
  const getAvatarRect = () => {
    return getAvatarRectNow();
  };
  
  const getBubbleRect = () => {
    const bubble = document.getElementById('notification-bubble');
    return bubble && bubble.style.display !== 'none' ? bubble.getBoundingClientRect() : null;
  };
  
  const hitTest = (x: number, y: number) => {
    const a = getAvatarRect();
    const b = getBubbleRect();
    const inAvatar = !!a && x >= a.left && x <= a.right && y >= a.top && y <= a.bottom;
    const inBubble = !!b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    return inAvatar || inBubble;
  };

  const onMove = (e: MouseEvent) => {
    const shouldCapture = hitTest(e.clientX, e.clientY);
    const ignore = !shouldCapture;
    if (lastIgnoreState !== ignore) {
      lastIgnoreState = ignore;
      try {
        ipcRenderer.send('assistant:set-ignore-mouse-events', ignore);
      } catch {}
    }
  };

  document.addEventListener('mousemove', onMove);
  try {
    ipcRenderer.send('assistant:set-ignore-mouse-events', false);
  } catch {}

  // NUCLEAR OPTION: Completely disable ALL mouse right-click events
  const disableRightClick = (e: MouseEvent) => {
    if (e.button === 2) { // Right mouse button
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  };

  // Disable context menu events at all levels
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true); // Use capture phase

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true);

  // Block right mouse button events entirely
  document.addEventListener('mousedown', disableRightClick, true);
  document.addEventListener('mouseup', disableRightClick, true);
  document.addEventListener('click', disableRightClick, true);
  window.addEventListener('mousedown', disableRightClick, true);
  window.addEventListener('mouseup', disableRightClick, true);
  window.addEventListener('click', disableRightClick, true);

  // Block on all elements
  document.body.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true);

  document.documentElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }, true);

  const avatar = document.getElementById('tasky-character') as HTMLElement | null;
  if (avatar) {
    (avatar.style as any).pointerEvents = 'auto';
    
    avatar.addEventListener('mousedown', () => {
      lastIgnoreState = false;
      try {
        ipcRenderer.send('assistant:set-ignore-mouse-events', false);
      } catch {}
    });
  }
  if (container) {
    (container.style as any).pointerEvents = 'auto';
  }

  window.addEventListener('mouseup', (e: MouseEvent) => {
    const shouldCapture = hitTest(e.clientX, e.clientY);
    const ignore = !shouldCapture;
    if (lastIgnoreState !== ignore) {
      lastIgnoreState = ignore;
      try {
        ipcRenderer.send('assistant:set-ignore-mouse-events', ignore);
      } catch {}
    }
  });

  // Listen for reposition requests (e.g., side changed)
  window.addEventListener('tasky-reposition', () => {
    if (!bubble || bubble.style.display !== 'block') return;
    positionBubble();
  });
});

ipcRenderer.on('toggle-animation', (_event: any, enabled: boolean) => {
  if (character) {
    if (enabled) {
      (character.style as any).animation = 'bounce 2s infinite';
    } else {
      (character.style as any).animation = 'none';
      (character.style as any).transform = 'scale(1)';
    }
  }
});

// Handle window resize
window.addEventListener('resize', () => {
  if (bubbleVisible) {
    positionBubble();
  }
});

// Assistant script loaded
