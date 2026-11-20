'use strict';
// Groundsmith desktop shell: loads app/index.html over a private app:// origin
// (stable localStorage between versions), keeps the renderer locked down, and
// provides a native "save file" dialog for the game's PNG export.
const { app, BrowserWindow, Menu, protocol, net, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const APP_DIR = path.join(__dirname, 'app');
const ORIGIN = 'app://groundsmith';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } }
]);

// Steam launches Linux builds inside a container where Chromium's sandbox can fail.
if (process.platform === 'linux' && process.env.SteamAppId) app.commandLine.appendSwitch('no-sandbox');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 800, minHeight: 560,
    backgroundColor: '#14181f',
    title: 'Groundsmith',
    icon: path.join(__dirname, 'build', 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  win.once('ready-to-show', () => win.show());
  win.loadURL(ORIGIN + '/index.html');

  // Never navigate away from the game; open web links in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(ORIGIN)) e.preventDefault(); });

  // The web build saves pictures through window.claude.use('downloads'); give it a native equivalent.
  win.webContents.on('dom-ready', () => {
    win.webContents.executeJavaScript(`(function () {
      if (window.claude) return;
      const dl = { save: async function (o) {
        const buf = o.data && o.data.arrayBuffer ? await o.data.arrayBuffer() : new TextEncoder().encode(String(o.data)).buffer;
        const r = await window.groundsmithNative.saveFile(o.filename, buf);
        if (!r) { const e = new Error('cancelled'); e.code = 'declined'; throw e; }
      } };
      window.claude = { use: async function (n) { return n === 'downloads' ? dl : null; } };
    })();`).catch(() => {});
  });
  win.on('closed', () => { win = null; });
}

ipcMain.handle('save-file', async (event, filename, data) => {
  if (!win || event.sender !== win.webContents) return false;
  const safe = path.basename(String(filename || 'stadium.png')).replace(/[^\w.\- ]/g, '_');
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('pictures'), safe) });
  if (r.canceled || !r.filePath) return false;
  fs.writeFileSync(r.filePath, Buffer.from(data));
  return true;
});

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.normalize(path.join(APP_DIR, rel));
    if (file !== APP_DIR && !file.startsWith(APP_DIR + path.sep)) return new Response('Forbidden', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });

  // F11 / Ctrl+Cmd+F: fullscreen; no menu bar clutter.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
    { role: 'windowMenu' }
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
