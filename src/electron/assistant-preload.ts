import { contextBridge, ipcRenderer } from 'electron';

// Channel allowlists — only these channels may be used from the assistant window
const ALLOWED_SEND_CHANNELS = [
  'assistant:set-ignore-mouse-events',
  'assistant:open-chat',
  'assistant:open-settings',
];

const ALLOWED_INVOKE_CHANNELS = [
  'get-tasky-avatar-data-url',
];

const ALLOWED_ON_CHANNELS = [
  'tasky-speak',
  'tasky-change-avatar',
  'tasky-set-custom-avatar',
  'tasky-set-bubble-side',
  'tasky-set-notification-color',
  'tasky-set-notification-font',
  'tasky-set-notification-text-color',
  'toggle-animation',
];

// Secure, isolated bridge for the assistant window with explicit channel validation
contextBridge.exposeInMainWorld('assistantAPI', {
  send: (channel: string, ...args: any[]) => {
    if (ALLOWED_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  invoke: (channel: string, ...args: any[]) => {
    if (ALLOWED_INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Channel not allowed: ${channel}`));
  },
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    if (ALLOWED_ON_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    }
    return () => {};
  },
});

export {};
