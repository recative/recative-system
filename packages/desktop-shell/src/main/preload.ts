import { contextBridge, ipcRenderer, shell } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer:{...ipcRenderer,on:ipcRenderer.on},
  shell,
});