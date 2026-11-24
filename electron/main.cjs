const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { createApiRouter } = require('../server/api.cjs');

let mainWindow;

// 1. Embedded Server Bootstrapper (Runs inside Electron process)
async function startEmbeddedServer() {
  try {
    const serverApp = express();
    const PORT = 4200;

    serverApp.use(cors());
    serverApp.use(express.json());

    // License and business data persist inside Electron's per-user appData
    // directory, not the (read-only, reinstall-wiped) install directory.
    const userDataPath = app.getPath('userData');
    const licenseFile = path.join(userDataPath, 'zia_license.dat');
    const dbFile = path.join(userDataPath, 'zia-billing.db');
    // Legacy location business data may have been saved to before this fix,
    // so existing users' data gets imported into the new database on first run.
    const legacyDataFile = path.join(__dirname, '../server/data.json');

    // Mount unified API routes
    serverApp.use('/api', await createApiRouter({ licenseFile, dbFile, dataFile: legacyDataFile }));

    const serverInstance = serverApp.listen(PORT, '127.0.0.1', () => {
      console.log(`Internal Server listening on http://127.0.0.1:${PORT}`);
    });

    serverInstance.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} already active; using running backend server.`);
      } else {
        console.error('Embedded server error:', err);
      }
    });
  } catch (err) {
    console.error('Failed to start internal server:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Zia-Billing - Enterprise Billing & Invoicing System',
    icon: path.join(__dirname, '../assets/logo.jpg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // Correctly resolve dist/index.html in packaged app
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Error loading index.html:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startEmbeddedServer();
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
