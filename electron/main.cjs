const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 18080;
const DIST_DIR = path.join(__dirname, '..', 'dist');

let win;
let server;

// MIME types for static serving
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
      // Security: prevent directory traversal
      if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end(); return; }
      // If path points to a directory, serve index.html
      try { if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html'); } catch (e) {}
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback: serve index.html for unknown routes
          fs.readFile(path.join(DIST_DIR, 'index.html'), (err2, html) => {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html || '');
          });
        } else {
          res.writeHead(200, { 'Content-Type': mime });
          res.end(data);
        }
      });
    });
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[polarization-lab] Server on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '偏振光虚拟实验系统',
    backgroundColor: '#0a0e12',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
  });

  win.loadURL(`http://127.0.0.1:${PORT}`);
  Menu.setApplicationMenu(null);
  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
