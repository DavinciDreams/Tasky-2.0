import { contextBridge, ipcRenderer } from 'electron';

// Minimal, isolated bridge for the assistant window
// Exposes a limited IPC surface to the isolated world
contextBridge.exposeInMainWorld('assistantAPI', {
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, listener: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, listener);
    // Return an unsubscribe function for convenience
    return () => ipcRenderer.removeListener(channel, listener);
  },
});

export {};


