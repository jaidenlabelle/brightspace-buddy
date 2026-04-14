// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type Channels =
  | 'ipc-example'
  | 'open-login-window'
  | 'login-successful'
  | 'login-cancelled'
  | 'logout-requested'
  | 'logout-successful'
  | 'download-content-item';

export type IpcInvokeChannels =
  | 'get-auth-status'
  | 'get-courses'
  | 'get-dashboard-data'
  | 'get-assignments'
  | 'get-content'
  | 'get-course-description'
  | 'get-course-instructors'
  | 'get-cached-content-summary'
  | 'get-cached-assignment-summaries'
  | 'summarize-content-item'
  | 'download-file-attachment'
  | 'summarize-file-attachment'
  | 'summarize-assignment-full';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke(channel: IpcInvokeChannels, ...args: unknown[]) {
      return ipcRenderer.invoke(channel, ...args);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronHandler);

export type ElectronHandler = typeof electronHandler;
