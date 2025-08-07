
const character = document.getElementById('tasky-character');
const bubble = document.getElementById('notification-bubble');
const { ipcRenderer } = require('electron');

let isDelivering = false;
let bubbleSide = 'left';
let notificationColor = '#7f7f7c';
let notificationFont = 'system';
let notificationTextColor = '#ffffff';
let bubbleVisible = false;
let draggingEnabled = true;
let lastIgnoreState = null;

// Simple IPC handlers
// Ensure we request initial avatar in case the timing of set-initial-avatar is late
window.addEventListener('DOMContentLoaded', () => {
  try {
    ipcRenderer.invoke('get-tasky-avatar-data-url').then((dataUrl) => {
      // If character is still empty and no child image exists, set Tasky immediately and fade in
      if (character && character.children.length === 0 && character.textContent === '') {
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          img.style.webkitUserSelect = 'none';
          img.style.mozUserSelect = 'none';
          img.style.msUserSelect = 'none';
          img.style.userSelect = 'none';
          img.style.webkitAppRegion = 'drag';
          img.draggable = false;
          character.appendChild(img);
          requestAnimationFrame(() => {
            character.style.opacity = '1';
          });
        }
      }
    }).catch(() => {
      // noop
    });
  } catch (_) {}
});
ipcRenderer.on('set-initial-avatar', (event, data) => {
  if (character && data && data.avatars && data.selectedAvatar) {
    if (data.selectedAvatar === 'Tasky') {
      // Use the proper Tasky image instead of emoji
      character.innerHTML = '';
      
      // Request tasky.png data URL from main process
      ipcRenderer.invoke('get-tasky-avatar-data-url').then(dataUrl => {
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          img.style.webkitUserSelect = 'none';
          img.style.mozUserSelect = 'none';
          img.style.msUserSelect = 'none';
          img.style.userSelect = 'none';
          img.style.webkitAppRegion = 'drag';
          img.draggable = false;
          character.appendChild(img);
          // Fade in after image is ready
          requestAnimationFrame(() => {
            character.style.opacity = '1';
          });
        } else {
          console.error('Failed to load Tasky image, falling back to emoji');
          character.textContent = '🤖';
          character.style.opacity = '1';
        }
      }).catch(error => {
        console.error('Failed to load Tasky avatar data URL:', error);
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

ipcRenderer.on('tasky-speak', (event, message) => {
  if (bubble) {
    // Bubble visible; hit-test will ensure capture
    bubble.style.position = 'absolute';
    bubble.style.background = notificationColor;
    bubble.style.color = notificationTextColor;
    bubble.style.padding = '12px 16px';
    bubble.style.borderRadius = '20px';
    bubble.style.top = '50%';
    bubble.style.transform = 'translateY(-50%)';
    bubble.style.zIndex = '1000';
    bubble.style.opacity = '1';
    bubble.style.display = 'block';
    bubble.style.fontSize = '14px';
    bubble.style.wordWrap = 'break-word';
    bubble.style.wordBreak = 'break-word';
    bubble.style.overflowWrap = 'break-word';
    bubble.style.whiteSpace = 'normal';
    bubble.style.width = 'auto';
    bubble.style.minWidth = '180px';
    
    // Apply custom font
    if (notificationFont === 'system') {
      bubble.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    } else {
      bubble.style.fontFamily = notificationFont;
    }
    
    // Position bubble based on bubbleSide setting
    // Window: 800px wide, avatar container ~200-400px. Keep consistent offsets.
    if (bubbleSide === 'right') {
      bubble.style.left = '420px';
      bubble.style.right = 'auto';
      bubble.style.maxWidth = '350px';
    } else {
      bubble.style.left = '20px';
      bubble.style.right = 'auto';
      bubble.style.maxWidth = '160px';
    }
    
    bubble.textContent = message;
    
    bubbleVisible = true;
    try { ipcRenderer.send('assistant:bubble-visible', true); } catch {}
    setTimeout(() => {
      bubble.style.display = 'none';
      // When bubble hides, allow click-through again if not dragging
      bubbleVisible = false;
      // Hit-test loop will restore ignore state
      try { ipcRenderer.send('assistant:bubble-visible', false); } catch {}
    }, 5000);
  }
});

ipcRenderer.on('tasky-change-avatar', (event, avatarName) => {
  if (character) {
    // Update the avatar display based on the name
    // The Tasky assistant is the official mascot for this task management application
    if (avatarName === 'Tasky') {
      // Use the proper Tasky image
      character.innerHTML = '';
      
      // Request tasky.png data URL from main process
      ipcRenderer.invoke('get-tasky-avatar-data-url').then(dataUrl => {
        if (dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.style.width = '80px';
          img.style.height = '80px';
          img.style.objectFit = 'cover';
          img.style.display = 'block';
          img.style.webkitUserSelect = 'none';
          img.style.mozUserSelect = 'none';
          img.style.msUserSelect = 'none';
          img.style.userSelect = 'none';
          img.style.webkitAppRegion = 'drag';
          img.draggable = false;
          character.appendChild(img);
          requestAnimationFrame(() => {
            character.style.opacity = '1';
          });
        } else {
          console.error('Failed to load Tasky image, falling back to emoji');
          character.textContent = '🤖';
          character.style.opacity = '1';
        }
      }).catch(error => {
        console.error('Failed to load Tasky avatar data URL:', error);
        character.textContent = '🤖';
        character.style.opacity = '1';
      });
    } else if (avatarName === 'Custom' || avatarName.startsWith('custom_')) {
      // Custom avatar will be handled by separate IPC message
      character.textContent = '';
    } else {
      // Fallback to robot emoji for other cases
      character.textContent = '🤖';
      character.style.opacity = '1';
    }
  }
});

ipcRenderer.on('tasky-set-custom-avatar', (event, filePath) => {
  if (character && filePath) {
    character.innerHTML = '';
    character.textContent = '';
    
    // Request data URL from main process
    const { ipcRenderer: ipc } = require('electron');
    ipc.invoke('get-avatar-data-url', filePath).then(dataUrl => {
      if (dataUrl) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';
        img.style.display = 'block';
        img.style.webkitUserSelect = 'none';
        img.style.mozUserSelect = 'none';
        img.style.msUserSelect = 'none';
        img.style.userSelect = 'none';
        img.style.webkitAppRegion = 'drag';
        img.draggable = false;
        character.appendChild(img);
        requestAnimationFrame(() => {
          character.style.opacity = '1';
        });
      }
    }).catch(error => {
      console.error('Failed to load custom avatar data URL:', error);
    });
  }
});

ipcRenderer.on('set-dragging-mode', (event, enabled) => {
  const container = document.getElementById('tasky-container');
  
  if (container && character) {
    draggingEnabled = !!enabled;
    if (enabled) {
      // Enable dragging
      container.style.webkitAppRegion = 'drag';
      container.style.cursor = 'move';
      character.style.webkitAppRegion = 'drag';
      character.style.cursor = 'move';
      character.style.opacity = '1';
      // Default to click-through; will re-enable capture on hover
      try { ipcRenderer.send('assistant:set-ignore-mouse-events', true); } catch {}
      container.style.pointerEvents = 'auto';
      character.style.pointerEvents = 'auto';
    } else {
      // Disable dragging and set to pointer-events none; clicks pass through
      container.style.webkitAppRegion = 'no-drag';
      container.style.cursor = 'default';
      character.style.webkitAppRegion = 'no-drag';
      character.style.cursor = 'default';
      container.style.pointerEvents = 'none';
      character.style.pointerEvents = 'none';
      character.style.opacity = '1';
      try { ipcRenderer.send('assistant:set-ignore-mouse-events', true); } catch {}
    }
  }
  // If re-enabled, restore pointer events
  if (enabled && container && character) {
    container.style.pointerEvents = 'auto';
    character.style.pointerEvents = 'auto';
  }
});

// Hover hit-testing focused on the character only: capture on hover, release on leave
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('tasky-container');
  const getAvatarRect = () => {
    const img = document.querySelector('#tasky-character img');
    return img ? img.getBoundingClientRect() : document.getElementById('tasky-character')?.getBoundingClientRect();
  };
  const getBubbleRect = () => (bubble && bubble.style.display === 'block') ? bubble.getBoundingClientRect() : null;

  const hitTest = (x, y) => {
    const a = getAvatarRect();
    const b = getBubbleRect();
    const inAvatar = !!a && x >= a.left && x <= a.right && y >= a.top && y <= a.bottom;
    const inBubble = !!b && x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    return inAvatar || inBubble;
  };

  const onMove = (e) => {
    const shouldCapture = hitTest(e.clientX, e.clientY);
    const ignore = !shouldCapture;
    if (lastIgnoreState !== ignore) {
      lastIgnoreState = ignore;
      try { ipcRenderer.send('assistant:set-ignore-mouse-events', ignore); } catch {}
    }
  };

  document.addEventListener('mousemove', onMove);
  // Initialize ignore state based on initial position (capture by default)
  try { ipcRenderer.send('assistant:set-ignore-mouse-events', false); } catch {}

  // Ensure avatar receives events; container stays passive by default
  const avatar = document.getElementById('tasky-character');
  if (avatar) {
    avatar.style.pointerEvents = 'auto';
    // Force capture while dragging
    avatar.addEventListener('mousedown', () => {
      lastIgnoreState = false;
      try { ipcRenderer.send('assistant:set-ignore-mouse-events', false); } catch {}
    });
  }
  if (container) {
    container.style.pointerEvents = 'auto';
  }

  // On mouseup, restore based on current hit-test
  window.addEventListener('mouseup', (e) => {
    const shouldCapture = hitTest(e.clientX, e.clientY);
    const ignore = !shouldCapture;
    if (lastIgnoreState !== ignore) {
      lastIgnoreState = ignore;
      try { ipcRenderer.send('assistant:set-ignore-mouse-events', ignore); } catch {}
    }
  });
});

ipcRenderer.on('toggle-animation', (event, enabled) => {
  if (character) {
    if (enabled) {
      // Enable animations
      character.style.animation = 'bounce 2s infinite';
    } else {
      // Disable animations
      character.style.animation = 'none';
      character.style.transform = 'scale(1)';
    }
  }
});

ipcRenderer.on('tasky-set-bubble-side', (event, side) => {
  bubbleSide = side;
  console.log('Bubble side changed to:', side);
  
  // If there's currently a visible bubble, update its position immediately
  if (bubble && bubble.style.display === 'block') {
    if (bubbleSide === 'right') {
      bubble.style.left = '420px';
      bubble.style.right = 'auto';
      bubble.style.maxWidth = '350px';
    } else {
      bubble.style.left = '20px';
      bubble.style.right = 'auto';
      bubble.style.maxWidth = '160px';
    }
  }
});

ipcRenderer.on('tasky-set-notification-color', (event, color) => {
  notificationColor = color;
  console.log('Notification color changed to:', color);
});

ipcRenderer.on('tasky-set-notification-font', (event, font) => {
  notificationFont = font;
  console.log('Notification font changed to:', font);
});

ipcRenderer.on('tasky-set-notification-text-color', (event, color) => {
  notificationTextColor = color;
  console.log('Notification text color changed to:', color);
});

