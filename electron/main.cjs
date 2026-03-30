const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_START_URL;

const dataPath = path.join(process.cwd(), 'data', 'trades.json');

async function ensureDataFile() {
  const dir = path.dirname(dataPath);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(dataPath);
  } catch {
    await fs.writeFile(dataPath, '[]', 'utf-8');
  }
}

async function readTrades() {
  await ensureDataFile();
  const raw = await fs.readFile(dataPath, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeTrades(trades) {
  await ensureDataFile();
  await fs.writeFile(dataPath, JSON.stringify(trades, null, 2), 'utf-8');
  return trades;
}

function createWindow() {
  if (process.env.ELECTRON_NO_WINDOW === '1') {
    console.log('Electron window creation skipped (ELECTRON_NO_WINDOW=1).');
    return;
  }

  const showWindow = process.env.ELECTRON_SHOW_WINDOW !== '0';
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    show: showWindow,
    webPreferences: {
      preload: path.join(process.cwd(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (!showWindow) {
    win.hide();
  }

  if (isDev) {
    win.loadURL('http://localhost:5173');
    if (showWindow) {
      win.webContents.openDevTools();
    }
  } else {
    win.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  await ensureDataFile();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('trades:load', async () => {
  return await readTrades();
});

ipcMain.handle('trades:save', async (_, trades) => {
  return await writeTrades(trades);
});
