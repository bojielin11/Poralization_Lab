const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');

const PORT = 18080;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// --- Update config ---
const REPO_OWNER = 'bojielin11';
const REPO_NAME = 'Poralization_Lab';
const UPDATE_CHECK_DELAY = 3000; // ms, wait after window ready

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
    server.on('error', (err) => {
      console.error(`[polarization-lab] Server error: ${err.message}`);
      if (err.code === 'EADDRINUSE') {
        console.error(`[polarization-lab] Port ${PORT} is already in use. Please close the other application using this port.`);
        // Try a different port
        const altPort = PORT + 1;
        server.listen(altPort, '127.0.0.1', () => {
          console.log(`[polarization-lab] Server on http://127.0.0.1:${altPort}`);
          resolve();
        });
        server.on('error', () => { resolve(); }); // give up
        return;
      }
      resolve(); // continue anyway
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
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
  });

  win.loadURL(`http://127.0.0.1:${PORT}`);
  Menu.setApplicationMenu(null);
  win.on('closed', () => { win = null; });
}

// ============================================================
// Auto-update check  (GitHub Releases)
// ============================================================
function semverCompare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function checkForUpdates() {
  const localVersion = app.getVersion(); // reads from package.json

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    headers: { 'User-Agent': `${REPO_NAME}/update-check`, Accept: 'application/vnd.github+json' },
  };

  https.get(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      try {
        const release = JSON.parse(body);
        const tag = release.tag_name || '';
        const remoteVersion = tag.startsWith('v') ? tag.slice(1) : tag;
        if (!remoteVersion) return;

        if (semverCompare(remoteVersion, localVersion) > 0) {
          const downloadUrl = release.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

          dialog.showMessageBox(win, {
            type: 'info',
            title: '发现新版本',
            message: `新版本 v${remoteVersion} 可用（当前 v${localVersion}）`,
            detail: '点击"下载"前往 GitHub Releases 页面获取最新版本。',
            buttons: ['下载', '稍后提醒'],
            defaultId: 0,
            cancelId: 1,
          }).then(({ response }) => {
            if (response === 0) shell.openExternal(downloadUrl);
          });
        }
      } catch (_) { /* 网络异常或 JSON 解析失败，静默跳过 */ }
    });
  }).on('error', () => { /* 无网络，跳过 */ });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
  setTimeout(checkForUpdates, UPDATE_CHECK_DELAY);
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
