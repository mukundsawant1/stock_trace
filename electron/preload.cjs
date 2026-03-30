const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tradeSage', {
  loadTrades: () => ipcRenderer.invoke('trades:load'),
  saveTrades: (trades) => ipcRenderer.invoke('trades:save', trades)
});
