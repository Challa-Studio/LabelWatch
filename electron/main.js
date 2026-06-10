const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let win = null;
let tray = null;

function createWindow() {
  win = new BrowserWindow({
    width: 320,
    height: 750,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity since it's a local personal app
    },
  });

  ipcMain.on('resize-window', (event, { width, height }) => {
    if (win) win.setSize(width, height, true);
  });

  // Handle Save Dialog
  ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(win, options);
    return result;
  });

  if (process.env.NODE_ENV !== 'production') {
    win.loadURL('http://localhost:5173').catch(() => {
      win.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Setup Auto Updater
  // This will automatically download updates in the background if available on GitHub
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Restart', 'Later'],
      title: 'Update Ready',
      message: 'A new version of LabelWatch has been downloaded!',
      detail: 'Would you like to restart the app to install the update now?'
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Initialize Tray
  const icon = nativeImage.createEmpty(); // Empty image, relying on title text
  tray = new Tray(icon);
  tray.setTitle('00:00:00');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Start / Stop Timer', click: () => {
        if (win) win.webContents.send('toggle-timer');
      }
    },
    { type: 'separator' },
    { label: 'Show App', click: () => {
        if (win) {
          win.show();
          win.focus();
        }
      }
    },
    { label: 'Hide App', click: () => {
        if (win) win.hide();
      }
    },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setContextMenu(contextMenu);

  ipcMain.on('update-tray', (event, timeStr) => {
    if (tray) tray.setTitle(timeStr);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
