const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  printOrder: (data) => ipcRenderer.invoke('print-order', data),
  getVersion: () => ipcRenderer.invoke('get-version'),
});