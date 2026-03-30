const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tradeSage', {
  loadTrades: () => ipcRenderer.invoke('trades:load'),
  saveTrades: (trades) => ipcRenderer.invoke('trades:save', trades)
});

contextBridge.exposeInMainWorld('updater', {
  check: () => ipcRenderer.invoke('updater:check'),
  onUpdateAvailable: (cb) => ipcRenderer.on('update-available', cb),
  onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),
  onUpdateError: (cb) => ipcRenderer.on('update-error', cb),
  onUpdateProgress: (cb) => ipcRenderer.on('update-progress', cb)
});
