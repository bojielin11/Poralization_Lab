const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const PORT = 18080;
const DIST_DIR = path.join(__dirname, '..', 'dist');
const UPDATE_CHECK_DELAY = 3000;

let win;
let server;
let progressWin = null;

// ── MIME ────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// ── Static file server ──────────────────────────────────────
function startServer() {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      let filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
      if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end(); return; }
      try { if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html'); } catch (_) {}
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) {
          fs.readFile(path.join(DIST_DIR, 'index.html'), (_e, html) => {
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
        server.listen(PORT + 1, '127.0.0.1', () => {
          console.log(`[polarization-lab] Server on http://127.0.0.1:${PORT + 1}`);
          resolve();
        });
        server.on('error', () => resolve());
        return;
      }
      resolve();
    });
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[polarization-lab] Server on http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

// ── Window ──────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: '偏振光虚拟实验系统',
    backgroundColor: '#0a0e12',
    icon: path.join(__dirname, '..', 'dist', 'icon.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    autoHideMenuBar: true,
  });
  win.loadURL(`http://127.0.0.1:${PORT}`);
  Menu.setApplicationMenu(null);
  win.on('closed', () => { win = null; });
}

// ── Update progress window ──────────────────────────────────
function createProgressWin(version) {
  if (progressWin && !progressWin.isDestroyed()) return progressWin;

  progressWin = new BrowserWindow({
    width: 420,
    height: 170,
    resizable: false,
    closable: false,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#faf8f5',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  if (win && !win.isDestroyed()) {
    const [pw, ph] = win.getSize();
    const [px, py] = win.getPosition();
    progressWin.setPosition(px + Math.round((pw - 420) / 2), py + Math.round((ph - 170) / 2));
  } else {
    progressWin.center();
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;background:#faf8f5;padding:28px 30px;color:#1a1a1a;user-select:none}
  h3{font-size:15px;font-weight:600;margin-bottom:4px}
  .sub{font-size:12px;color:#999;margin-bottom:18px}
  .bar-bg{background:#e8e4dd;border-radius:6px;height:8px;overflow:hidden}
  .bar-fill{background:#c75b39;height:100%;width:0;border-radius:6px;transition:width .15s linear}
  .pct{text-align:right;font-size:12px;color:#aaa;margin-top:6px}
</style></head><body>
  <h3>正在下载更新 — v${version}</h3>
  <div class="sub" id="status">准备下载...</div>
  <div class="bar-bg"><div class="bar-fill" id="bar"></div></div>
  <div class="pct" id="pct">0%</div>
  <script>
    window.__upd = function(p) {
      document.getElementById('bar').style.width = p.percent + '%';
      document.getElementById('pct').textContent = p.percent + '%';
      document.getElementById('status').textContent =
        (p.transferred / 1048576).toFixed(1) + ' MB / ' + (p.total / 1048576).toFixed(1) + ' MB  (' +
        (p.bytesPerSecond / 1024).toFixed(0) + ' KB/s)';
    };
  </script>
</body></html>`;

  progressWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  return progressWin;
}

function closeProgressWin() {
  if (progressWin && !progressWin.isDestroyed()) progressWin.close();
  progressWin = null;
}

// ── Auto-update (electron-updater + GitHub Releases) ────────
function setupAutoUpdater() {
  // Don't auto-download; let the user decide
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', async (info) => {
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      title: '发现新版本',
      message: `新版本 v${info.version} 可用（当前 v${app.getVersion()}）`,
      detail: (info.releaseNotes || '').replace(/<[^>]+>/g, '').slice(0, 500) || undefined,
      buttons: ['立即更新', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      createProgressWin(info.version);
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('download-progress', (p) => {
    if (progressWin && !progressWin.isDestroyed()) {
      progressWin.webContents.executeJavaScript(
        `window.__upd(${JSON.stringify(p)})`
      ).catch(() => {});
    }
  });

  autoUpdater.on('update-downloaded', async () => {
    closeProgressWin();
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      title: '下载完成',
      message: '更新已下载完成',
      detail: '点击「立即重启」关闭当前程序并安装更新。',
      buttons: ['立即重启', '稍后'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (err) => {
    closeProgressWin();
    console.error('[polarization-lab] Update error:', err.message);
  });
}

// ── Lifecycle ───────────────────────────────────────────────
app.whenReady().then(async () => {
  await startServer();
  createWindow();
  setupAutoUpdater();
  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, UPDATE_CHECK_DELAY);
});

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
