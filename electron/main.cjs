const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');

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
// Auto-update  (GitHub Releases → download → replace → restart)
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

/**
 * HTTPS GET → parsed JSON.
 */
function httpsGetJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': `${REPO_NAME}/update-check`, Accept: 'application/vnd.github+json' },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/**
 * Download `url` to `destPath`, calling `onProgress({ downloaded, total, percent })`.
 * Follows redirects (HTTP 3xx).
 */
function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let downloaded = 0;

    function attempt(dlUrl) {
      https.get(dlUrl, {
        headers: { 'User-Agent': `${REPO_NAME}/update-check`, Accept: 'application/octet-stream' },
      }, (res) => {
        // Follow redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(destPath, () => {});
          attempt(res.headers.location);
          return;
        }

        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const total = parseInt(res.headers['content-length'] || '0', 10);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          if (onProgress && total > 0) {
            onProgress({ downloaded, total, percent: Math.round((downloaded / total) * 100) });
          }
        });

        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
      }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
    }

    attempt(url);
  });
}

/**
 * Show a frameless progress window during download.
 * Returns a function: updateProgress({ percent, downloaded, total }).
 */
function createProgressWindow(newVersion) {
  const progWin = new BrowserWindow({
    width: 420,
    height: 170,
    resizable: false,
    closable: false,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    backgroundColor: '#faf8f5',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  // Center on parent
  if (win && !win.isDestroyed()) {
    const [pw, ph] = win.getSize();
    const [px, py] = win.getPosition();
    progWin.setPosition(
      px + Math.round((pw - 420) / 2),
      py + Math.round((ph - 170) / 2),
    );
  } else {
    progWin.center();
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Microsoft YaHei", sans-serif; background: #faf8f5; padding: 28px 30px; color: #1a1a1a; user-select: none; }
  h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
  .sub { font-size: 12px; color: #999; margin-bottom: 18px; }
  .bar-bg { background: #e8e4dd; border-radius: 6px; height: 8px; overflow: hidden; }
  .bar-fill { background: #c75b39; height: 100%; width: 0%; border-radius: 6px; transition: width 0.15s linear; }
  .pct { text-align: right; font-size: 12px; color: #aaa; margin-top: 6px; }
</style></head><body>
  <h3>正在下载更新 &mdash; v${newVersion}</h3>
  <div class="sub" id="status">准备下载&hellip;</div>
  <div class="bar-bg"><div class="bar-fill" id="bar"></div></div>
  <div class="pct" id="pct">0%</div>
  <script>
    // Exposed on window so main process can call it
    window.__updateProgress = function(p) {
      document.getElementById('bar').style.width = p.percent + '%';
      document.getElementById('pct').textContent = p.percent + '%';
      var dlMB = (p.downloaded / 1024 / 1024).toFixed(1);
      var totMB = (p.total / 1024 / 1024).toFixed(1);
      document.getElementById('status').textContent = dlMB + ' MB / ' + totMB + ' MB';
    };
  </script>
</body></html>`;

  progWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  return {
    update(p) {
      if (progWin.isDestroyed()) return;
      progWin.webContents.executeJavaScript(`window.__updateProgress(${JSON.stringify(p)})`).catch(() => {});
    },
    close() {
      if (!progWin.isDestroyed()) progWin.close();
    },
  };
}

/**
 * Core update check: compare current version against latest GitHub Release.
 * If newer → ask user → download .exe → replace portable .exe → restart.
 */
async function checkForUpdates() {
  const localVersion = app.getVersion();

  let release;
  try {
    release = await httpsGetJSON(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
    );
  } catch (_) {
    return; // network error → silent skip
  }

  const tag = release.tag_name || '';
  const remoteVersion = tag.startsWith('v') ? tag.slice(1) : tag;
  if (!remoteVersion) return;
  if (semverCompare(remoteVersion, localVersion) <= 0) return; // already up to date

  // Find the .exe asset in the release
  const exeAsset = release.assets.find(a => a.name.endsWith('.exe'));
  if (!exeAsset) return;

  // Release notes (trimmed for dialog display)
  const notes = (release.body || '').replace(/\r\n/g, '\n').slice(0, 600);

  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    title: '发现新版本',
    message: `新版本 v${remoteVersion} 可用（当前 v${localVersion}）`,
    detail: notes || undefined,
    buttons: ['立即更新', '稍后提醒', '查看更新详情'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 2) {
    // Open GitHub release page
    shell.openExternal(release.html_url || `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    return;
  }
  if (response === 1) return; // remind later

  // response === 0 → download & install
  await downloadAndInstall(exeAsset.browser_download_url, remoteVersion);
}

/**
 * Download new .exe → show progress → replace current portable exe → restart.
 */
async function downloadAndInstall(downloadUrl, newVersion) {
  // Safety: only auto-replace when running as a packaged portable exe
  if (!app.isPackaged) {
    dialog.showMessageBox(win, {
      type: 'info',
      title: '发现新版本',
      message: `新版本 v${newVersion} 可用`,
      detail: '开发模式下无法自动安装更新，请前往 GitHub Releases 手动下载。',
      buttons: ['前往下载', '稍后'],
      defaultId: 0,
    }).then(({ response }) => {
      if (response === 0) shell.openExternal(`https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/latest`);
    });
    return;
  }
  // --- Progress window ---
  const progWin = createProgressWindow(newVersion);

  // --- Download ---
  const tmpDir = app.getPath('temp');
  const newExePath = path.join(tmpDir, `偏振光虚拟实验系统-${newVersion}-update.exe`);

  let downloadOk = false;
  try {
    await downloadFile(downloadUrl, newExePath, p => progWin.update(p));
    downloadOk = true;
  } catch (err) {
    progWin.close();
    dialog.showErrorBox('下载失败', `无法下载更新，请稍后重试。\n\n错误信息：${err.message}`);
    return;
  }

  progWin.close();

  if (!downloadOk) return;

  // --- Confirm install ---
  const { response } = await dialog.showMessageBox(win, {
    type: 'info',
    title: '下载完成',
    message: `v${newVersion} 已下载完成`,
    detail: '点击「立即重启」关闭当前程序并自动安装更新。',
    buttons: ['立即重启', '稍后'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response !== 0) return;

  // --- Write PowerShell updater script ---
  // The portable .exe path is stored in this env var by electron-builder
  const targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const scriptPath = path.join(tmpDir, 'polarization-update.ps1');

  // Escape single quotes for PowerShell string literals
  const esc = s => s.replace(/'/g, "''");

  const psScript = `# Polarization Lab — Auto-updater
$ErrorActionPreference = 'Stop'

$newExe   = '${esc(newExePath)}'
$targetExe = '${esc(targetExe)}'

# Wait for the old app to fully exit
Start-Sleep -Seconds 3

try {
    # Verify the downloaded file exists
    if (-not (Test-Path $newExe)) {
        throw "Downloaded file not found: $newExe"
    }

    Write-Host "Replacing old exe with new version..."
    Move-Item -Force -Path $newExe -Destination $targetExe

    Write-Host "Launching updated application..."
    Start-Process -FilePath $targetExe
}
catch {
    Write-Host "ERROR: $_"

    # Fallback: try to launch the downloaded exe directly
    if (Test-Path $newExe) {
        Write-Host "Launching downloaded exe directly as fallback..."
        Start-Process -FilePath $newExe
    }
    else {
        # Show error dialog (one-line message, no newline backticks)
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "自动更新失败，请手动下载新版本。错误：$_",
            "更新失败",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
    }
}
finally {
    # Self-delete this script
    Start-Sleep -Seconds 2
    Remove-Item -Force -LiteralPath $MyInvocation.MyCommand.Path -ErrorAction SilentlyContinue
}
`;

  fs.writeFileSync(scriptPath, psScript, 'utf8');

  // --- Execute updater script detached → quit ---
  spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass',
    '-NoProfile',
    '-WindowStyle', 'Hidden',
    '-File', scriptPath,
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();

  // Slight delay so the child process can start before we quit
  setTimeout(() => { app.quit(); }, 500);
}

// ============================================================
// App lifecycle
// ============================================================

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
