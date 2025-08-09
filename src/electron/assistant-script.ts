/**
 * Assistant window script (executed in the assistant BrowserWindow)
 *
 * Runs in the DOM context and communicates with main via a minimal preload bridge
 * exposed as `window.assistantAPI`. Avoids Node APIs for security.
 */

declare global {
  interface Window {
    assistantAPI: {
      send: (channel: string, ...args: any[]) => void;
      invoke: (channel: string, ...args: any[]) => Promise<any>;
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    };
  }
}

const character = document.getElementById('tasky-character') as HTMLElement | null;
const bubble = document.getElementById('notification-bubble') as HTMLElement | null;
const containerEl = document.getElementById('tasky-container') as HTMLElement | null;
function getAvatarRectNow(): DOMRect | null {
  const img = document.querySelector('#tasky-character img') as HTMLElement | null;
  const el = img || (document.getElementById('tasky-character') as HTMLElement | null);
  return el ? el.getBoundingClientRect() : null;
}
// Access IPC via preload-injected bridge for security
const ipcRenderer = window.assistantAPI;

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
  const leftGap = 56; // preferred spacing from avatar when bubble is on the left
  const rightGap = 56; // preferred spacing from avatar when bubble is on the right
  const minGap = 24; // minimum spacing we'll ever allow to preserve width
  const fixedWidth = 260; // target fixed bubble width for consistent sizing
  bubble.style.maxWidth = `${fixedWidth}px`;
  const avatarRect = getAvatarRectNow();
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const padding = 8;
  // Start from fixed width to keep visual consistency; shrink only if absolutely required to fit viewport
  const minWidth = 180;
  let width = fixedWidth;
  let left = bubbleSide === 'right' ? 380 : 180;
  let top = 0;
  if (avatarRect) {
    // Prefer keeping width fixed; adjust gap first, then shrink width only if still not enough space
    const preferredGap = bubbleSide === 'left' ? leftGap : rightGap;
    const availableWithPreferred =
      bubbleSide === 'left'
        ? Math.max(0, avatarRect.left - preferredGap - padding)
        : Math.max(0, viewportWidth - (avatarRect.right + preferredGap) - padding);

    let gapUsed = preferredGap;
    if (availableWithPreferred < fixedWidth) {
      const availableWithMinGap =
        bubbleSide === 'left'
          ? Math.max(0, avatarRect.left - minGap - padding)
          : Math.max(0, viewportWidth - (avatarRect.right + minGap) - padding);
      if (availableWithMinGap >= fixedWidth) {
        // Keep width fixed; reduce gap just enough to fit
        gapUsed = Math.max(
          minGap,
          bubbleSide === 'left'
            ? avatarRect.left - fixedWidth - padding
            : viewportWidth - fixedWidth - padding - avatarRect.right
        );
      } else {
        // Still not enough room; shrink width as a last resort
        gapUsed = minGap;
        width = Math.max(minWidth, Math.floor(availableWithMinGap));
      }
    }

    // Vertically center relative to avatar, slight upward nudge; use width to reflow and then measure
    bubble.style.width = `${width}px`;
    const bubbleHeight = Math.max(40, Math.ceil(bubble.getBoundingClientRect().height) || 40);
    top = Math.round(avatarRect.top + (avatarRect.height - bubbleHeight) / 2) - 12;

    // Compute left strictly on the selected side without flipping; keep computed gap
    if (bubbleSide === 'left') {
      left = Math.max(padding, Math.round(avatarRect.left - width - gapUsed));
    } else {
      left = Math.min(viewportWidth - width - padding, Math.round(avatarRect.right + gapUsed));
    }
  } else {
    // No avatar rect available; still ensure on-screen
    left = Math.max(padding, Math.min(left, viewportWidth - width - padding));
  }

  bubble.style.width = `${width}px`;
  bubble.style.left = `${Math.round(left)}px`;
  if (top) bubble.style.top = `${top}px`;
  (bubble.style as any).right = 'auto';
}
// Ensure we request initial avatar in case the timing of set-initial-avatar is late
window.addEventListener('DOMContentLoaded', () => {
  try {
    ipcRenderer
      .invoke('get-tasky-avatar-data-url')
      .then((dataUrl) => {
        // If character is still empty and no child image exists, set Tasky immediately and fade in
        if (character && character.children.length === 0 && character.textContent === '') {
          if (dataUrl) {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            (img as any).draggable = false;
            character.appendChild(img);
            requestAnimationFrame(() => {
              character.style.opacity = '1';
            });
          }
        }
      })
      .catch(() => {
        // noop
      });
  } catch (_) {}
});

ipcRenderer.on('set-initial-avatar', (_event, data) => {
  if (character && data && data.avatars && data.selectedAvatar) {
    if (data.selectedAvatar === 'Tasky') {
      // Use the proper Tasky image instead of emoji
      character.innerHTML = '';
      // Request tasky.png data URL from main process
      ipcRenderer
        .invoke('get-tasky-avatar-data-url')
        .then((dataUrl) => {
          if (dataUrl) {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            (img as any).draggable = false;
            character.appendChild(img);
            // Fade in after image is ready
            requestAnimationFrame(() => {
              character.style.opacity = '1';
            });
          } else {
            character.textContent = '🤖';
            character.style.opacity = '1';
          }
        })
        .catch(() => {
          character.textContent = '🤖';
          character.style.opacity = '1';
        });
    } else {
      const avatarChar = data.avatars[data.selectedAvatar] || '🤖';
      character.textContent = avatarChar;
      character.style.opacity = '1';
    }
  }
});

ipcRenderer.on('tasky-speak', (_event, message: string) => {
  if (bubble) {
    // Bubble visible; hit-test will ensure capture
    bubble.style.position = 'absolute';
    bubble.style.background = notificationColor;
    bubble.style.color = notificationTextColor;
    bubble.style.padding = '12px 16px';
    bubble.style.boxSizing = 'border-box';
    bubble.style.borderRadius = '20px';
    // top will be set precisely in positionBubble(); clear any centering transform
    bubble.style.transform = 'none';
    bubble.style.zIndex = '1000';
    bubble.style.opacity = '1';
    bubble.style.display = 'block';
    bubble.style.fontSize = '14px';
    (bubble.style as any).wordWrap = 'break-word';
    (bubble.style as any).wordBreak = 'break-word';
    (bubble.style as any).overflowWrap = 'break-word';
    bubble.style.whiteSpace = 'normal';
    bubble.style.width = 'auto';
    bubble.style.minWidth = '180px';

    // Apply custom font
    if (notificationFont === 'system') {
      bubble.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    } else {
      bubble.style.fontFamily = notificationFont;
    }

    // Position after content applied to avoid overlap using actual width/height
    requestAnimationFrame(positionBubble);

    bubble.textContent = message;

    bubbleVisible = true;
    try {
      ipcRenderer.send('assistant:bubble-visible', true);
    } catch {}
    setTimeout(() => {
      bubble.style.display = 'none';
      // When bubble hides, allow click-through again if not dragging
      bubbleVisible = false;
      // Hit-test loop will restore ignore state
      try {
        ipcRenderer.send('assistant:bubble-visible', false);
      } catch {}
    }, 5000);
  }
});

ipcRenderer.on('tasky-change-avatar', (_event, avatarName: string) => {
  if (character) {
    if (avatarName === 'Tasky') {
      character.innerHTML = '';
      ipcRenderer
        .invoke('get-tasky-avatar-data-url')
        .then((dataUrl) => {
          if (dataUrl) {
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.display = 'block';
            (img as any).draggable = false;
            character.appendChild(img);
            requestAnimationFrame(() => {
              character.style.opacity = '1';
            });
          } else {
            character.textContent = '🤖';
            character.style.opacity = '1';
          }
        })
        .catch(() => {
          character.textContent = '🤖';
          character.style.opacity = '1';
        });
    } else if (avatarName === 'Custom' || avatarName.startsWith('custom_')) {
      character.textContent = '';
    } else {
      character.textContent = '🤖';
      character.style.opacity = '1';
    }
  }
});

ipcRenderer.on('tasky-set-custom-avatar', (_event, filePath: string) => {
  if (character && filePath) {
    character.innerHTML = '';
    character.textContent = '';
    ipcRenderer
      .invoke('get-avatar-data-url', filePath)
      .then((dataUrl) => {
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          (img as any).draggable = false;
          character.appendChild(img);
          requestAnimationFrame(() => {
            character.style.opacity = '1';
          });
        }
      })
      .catch(() => {});
  }
});

ipcRenderer.on('set-dragging-mode', (_event, enabled: boolean) => {
  const container = document.getElementById('tasky-container') as HTMLElement | null;
  if (container && character) {
    draggingEnabled = !!enabled;
    if (enabled) {
      container.style.setProperty('-webkit-app-region', 'drag');
      container.style.cursor = 'move';
      character.style.setProperty('-webkit-app-region', 'drag');
      (character.style as any).cursor = 'move';
      character.style.opacity = '1';
      try {
        ipcRenderer.send('assistant:set-ignore-mouse-events', true);
      } catch {}
      (container.style as any).pointerEvents = 'auto';
      (character.style as any).pointerEvents = 'auto';
    } else {
      container.style.setProperty('-webkit-app-region', 'no-drag');
      (container.style as any).cursor = 'default';
      character.style.setProperty('-webkit-app-region', 'no-drag');
      (character.style as any).cursor = 'default';
      (container.style as any).pointerEvents = 'none';
      (character.style as any).pointerEvents = 'none';
      character.style.opacity = '1';
      try {
        ipcRenderer.send('assistant:set-ignore-mouse-events', true);
      } catch {}
    }
  }
  if (enabled && container && character) {
    (container.style as any).pointerEvents = 'auto';
    (character.style as any).pointerEvents = 'auto';
  }
});

// Hover hit-testing focused on the character only: capture on hover, release on leave
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('tasky-container') as HTMLElement | null;
  const getAvatarRect = () => {
    const img = document.querySelector('#tasky-character img') as HTMLElement | null;
    return img ? img.getBoundingClientRect() : (document.getElementById('tasky-character') as HTMLElement | null)?.getBoundingClientRect();
  };
  const getBubbleRect = () => (bubble && bubble.style.display === 'block' ? bubble.getBoundingClientRect() : null);

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

ipcRenderer.on('toggle-animation', (_event, enabled: boolean) => {
  if (character) {
    if (enabled) {
      (character.style as any).animation = 'bounce 2s infinite';
    } else {
      (character.style as any).animation = 'none';
      (character.style as any).transform = 'scale(1)';
    }
  }
});

ipcRenderer.on('tasky-set-bubble-side', (_event, side: 'left' | 'right') => {
  bubbleSide = side;
  // Reposition immediately if visible
  if (bubble && bubble.style.display === 'block') {
    const evt = new Event('tasky-reposition');
    window.dispatchEvent(evt);
  }
});

ipcRenderer.on('tasky-set-notification-color', (_event, color: string) => {
  notificationColor = color;
});

ipcRenderer.on('tasky-set-notification-font', (_event, font: string) => {
  notificationFont = font;
});

ipcRenderer.on('tasky-set-notification-text-color', (_event, color: string) => {
  notificationTextColor = color;
});

export {};