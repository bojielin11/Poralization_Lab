const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const fs = require('fs');
const { spawn } = require('child_process');

const PORT = 18080;
const DIST_DIR = path.join(__dirname, '..', 'dist');

// ── Update config ──────────────────────────────────────────
const REPO_OWNER = 'bojielin11';
const REPO_NAME = 'Poralization_Lab';
const UPDATE_CHECK_DELAY = 3000;

let win;
let server;

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
  return new Promise(function (resolve) {
    server = http.createServer(function (req, res) {
      var filePath = path.join(DIST_DIR, req.url === '/' ? '/index.html' : req.url.split('?')[0]);
      if (!filePath.startsWith(DIST_DIR)) { res.writeHead(403); res.end(); return; }
      try { if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html'); } catch (_) {}
      var ext = path.extname(filePath).toLowerCase();
      var mime = MIME[ext] || 'application/octet-stream';
      fs.readFile(filePath, function (err, data) {
        if (err) {
          fs.readFile(path.join(DIST_DIR, 'index.html'), function (_e, html) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(html || '');
          });
        } else {
          res.writeHead(200, { 'Content-Type': mime });
          res.end(data);
        }
      });
    });
    server.on('error', function (err) {
      console.error('[polarization-lab] Server error:', err.message);
      if (err.code === 'EADDRINUSE') {
        server.listen(PORT + 1, '127.0.0.1', function () {
          console.log('[polarization-lab] Server on http://127.0.0.1:' + (PORT + 1));
          resolve();
        });
        server.on('error', function () { resolve(); });
        return;
      }
      resolve();
    });
    server.listen(PORT, '127.0.0.1', function () {
      console.log('[polarization-lab] Server on http://127.0.0.1:' + PORT);
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
  win.loadURL('http://127.0.0.1:' + PORT);
  Menu.setApplicationMenu(null);
  win.on('closed', function () { win = null; });
}

// ── Helpers ─────────────────────────────────────────────────
function semverCompare(a, b) {
  var pa = a.split('.').map(Number);
  var pb = b.split('.').map(Number);
  for (var i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
  }
  return 0;
}

function httpsGetJSON(url) {
  return new Promise(function (resolve, reject) {
    https.get(url, {
      headers: { 'User-Agent': REPO_NAME + '/update-check', Accept: 'application/vnd.github+json' },
    }, function (res) {
      var body = '';
      res.on('data', function (chunk) { body += chunk; });
      res.on('end', function () {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, destPath, onProgress) {
  var downloaded = 0;
  var lastTick = Date.now();
  var lastBytes = 0;

  function attempt(dlUrl) {
    return new Promise(function (resolve, reject) {
      var file = fs.createWriteStream(destPath);
      https.get(dlUrl, {
        headers: { 'User-Agent': REPO_NAME + '/update-check', Accept: 'application/octet-stream' },
      }, function (res) {
        // Follow redirect
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlink(destPath, function () {
            attempt(res.headers.location).then(resolve).catch(reject);
          });
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, function () {});
          reject(new Error('HTTP ' + res.statusCode));
          return;
        }
        var total = parseInt(res.headers['content-length'] || '0', 10);
        res.on('data', function (chunk) {
          downloaded += chunk.length;
          if (onProgress) {
            var now = Date.now();
            var dt = (now - lastTick) / 1000 || 1;
            var bytesPerSecond = Math.round((downloaded - lastBytes) / dt);
            lastTick = now;
            lastBytes = downloaded;
            onProgress({
              downloaded: downloaded,
              total: total || downloaded,
              percent: total > 0 ? Math.round((downloaded / total) * 100) : 0,
              bytesPerSecond: bytesPerSecond,
            });
          }
        });
        res.pipe(file);
        file.on('finish', function () { file.close(); resolve(); });
        file.on('error', function (err) { fs.unlink(destPath, function () {}); reject(err); });
      }).on('error', function (err) { fs.unlink(destPath, function () {}); reject(err); });
    });
  }
  return attempt(url);
}

// ── Progress window ─────────────────────────────────────────
function createProgressWin(version) {
  var progWin = new BrowserWindow({
    width: 420, height: 170,
    resizable: false, closable: false, frame: false,
    alwaysOnTop: true,
    backgroundColor: '#faf8f5',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  if (win && !win.isDestroyed()) {
    var pw = win.getSize()[0], ph = win.getSize()[1];
    var px = win.getPosition()[0], py = win.getPosition()[1];
    progWin.setPosition(px + Math.round((pw - 420) / 2), py + Math.round((ph - 170) / 2));
  } else {
    progWin.center();
  }

  var html =
    '<!DOCTYPE html>' +
    '<html><head><meta charset="utf-8"><style>' +
    '*{margin:0;padding:0;box-sizing:border-box}' +
    'body{font-family:system-ui,-apple-system,"Microsoft YaHei",sans-serif;background:#faf8f5;padding:28px 30px;color:#1a1a1a;user-select:none}' +
    'h3{font-size:15px;font-weight:600;margin-bottom:4px}' +
    '.sub{font-size:12px;color:#999;margin-bottom:18px}' +
    '.bar-bg{background:#e8e4dd;border-radius:6px;height:8px;overflow:hidden}' +
    '.bar-fill{background:#c75b39;height:100%;width:0;border-radius:6px;transition:width .15s linear}' +
    '.pct{text-align:right;font-size:12px;color:#aaa;margin-top:6px}' +
    '</style></head><body>' +
    '<h3>正在下载更新 &mdash; v' + version + '</h3>' +
    '<div class="sub" id="status">准备下载...</div>' +
    '<div class="bar-bg"><div class="bar-fill" id="bar"></div></div>' +
    '<div class="pct" id="pct">0%</div>' +
    '<script>window.__upd=function(p){' +
    'document.getElementById("bar").style.width=p.percent+"%";' +
    'document.getElementById("pct").textContent=p.percent+"%";' +
    'var speed=p.bytesPerSecond>0?(p.bytesPerSecond/1024).toFixed(0)+" KB/s":"...";' +
    'document.getElementById("status").textContent=' +
    '(p.downloaded/1048576).toFixed(1)+" MB / "+(p.total/1048576).toFixed(1)+" MB  ("+speed+")";' +
    '};<\/script>' +
    '</body></html>';

  progWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

  return {
    update: function (p) {
      if (progWin.isDestroyed()) return;
      progWin.webContents.executeJavaScript('window.__upd(' + JSON.stringify(p) + ')').catch(function () {});
    },
    close: function () {
      if (!progWin.isDestroyed()) progWin.close();
    },
  };
}

function esc(s) { return s.replace(/'/g, "''"); }

function buildUpdateScript(newExePath, targetExe) {
  return [
    '# Polarization Lab -- Auto-updater',
    '$ErrorActionPreference = "Stop"',
    '',
    "$newExe    = '" + esc(newExePath) + "'",
    "$targetExe = '" + esc(targetExe) + "'",
    '',
    '# Wait for the old app to fully exit',
    'Start-Sleep -Seconds 3',
    '',
    'try {',
    '    if (-not (Test-Path $newExe)) { throw "Downloaded file not found" }',
    '    Write-Host "Replacing old exe with new version..."',
    '    Move-Item -Force -Path $newExe -Destination $targetExe',
    '    Write-Host "Launching updated application..."',
    '    Start-Process -FilePath $targetExe',
    '}',
    'catch {',
    '    Write-Host "ERROR: $_"',
    '    if (Test-Path $newExe) {',
    '        Write-Host "Launching downloaded exe directly as fallback..."',
    '        Start-Process -FilePath $newExe',
    '    } else {',
    '        Add-Type -AssemblyName System.Windows.Forms',
    '        [System.Windows.Forms.MessageBox]::Show(',
    '            "Update failed: " + $_.Exception.Message,',
    '            "Update Error",',
    '            [System.Windows.Forms.MessageBoxButtons]::OK,',
    '            [System.Windows.Forms.MessageBoxIcon]::Error',
    '        )',
    '    }',
    '}',
    'finally {',
    '    Start-Sleep -Seconds 2',
    '    Remove-Item -Force -LiteralPath $MyInvocation.MyCommand.Path -ErrorAction SilentlyContinue',
    '}',
  ].join('\r\n');
}

// ── Auto-update ─────────────────────────────────────────────
async function checkForUpdates() {
  var localVersion = app.getVersion();

  var release;
  try {
    release = await httpsGetJSON(
      'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/releases/latest'
    );
  } catch (_) { return; }

  var tag = release.tag_name || '';
  var remoteVersion = tag.startsWith('v') ? tag.slice(1) : tag;
  if (!remoteVersion) return;
  if (semverCompare(remoteVersion, localVersion) <= 0) return;

  var exeAsset = release.assets.find(function (a) { return a.name.endsWith('.exe'); });
  if (!exeAsset) return;

  var notes = (release.body || '').replace(/\r\n/g, '\n').slice(0, 600);

  var response = await dialog.showMessageBox(win, {
    type: 'info',
    title: '发现新版本',
    message: '新版本 v' + remoteVersion + ' 可用（当前 v' + localVersion + '）',
    detail: notes || undefined,
    buttons: ['立即更新', '稍后提醒', '查看详情'],
    defaultId: 0,
    cancelId: 1,
  });

  if (response.response === 2) {
    shell.openExternal(release.html_url || 'https://github.com/' + REPO_OWNER + '/' + REPO_NAME + '/releases/latest');
    return;
  }
  if (response.response === 1) return;

  // Download & install
  if (!app.isPackaged) {
    dialog.showMessageBox(win, {
      type: 'info', title: '发现新版本',
      message: '新版本 v' + remoteVersion + ' 可用',
      detail: '开发模式下无法自动安装，请前往 GitHub 手动下载。',
      buttons: ['前往下载', '稍后'],
    }).then(function (r) {
      if (r.response === 0) shell.openExternal('https://github.com/' + REPO_OWNER + '/' + REPO_NAME + '/releases/latest');
    });
    return;
  }

  var progWin = createProgressWin(remoteVersion);
  var tmpDir = app.getPath('temp');
  var newExePath = path.join(tmpDir, 'PolarizationLab-' + remoteVersion + '-update.exe');

  try {
    await downloadFile(exeAsset.browser_download_url, newExePath, function (p) { progWin.update(p); });
  } catch (err) {
    progWin.close();
    dialog.showErrorBox('下载失败', '无法下载更新，请稍后重试。\n\n' + err.message);
    return;
  }
  progWin.close();

  var result = await dialog.showMessageBox(win, {
    type: 'info', title: '下载完成',
    message: 'v' + remoteVersion + ' 已下载完成',
    detail: '点击「立即重启」关闭程序并自动安装更新。',
    buttons: ['立即重启', '稍后'],
    defaultId: 0, cancelId: 1,
  });
  if (result.response !== 0) return;

  var targetExe = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  var scriptPath = path.join(tmpDir, 'polarization-update.ps1');
  fs.writeFileSync(scriptPath, buildUpdateScript(newExePath, targetExe), 'utf8');

  spawn('powershell.exe', [
    '-ExecutionPolicy', 'Bypass', '-NoProfile', '-WindowStyle', 'Hidden', '-File', scriptPath,
  ], {
    detached: true, stdio: 'ignore', windowsHide: true,
  }).unref();

  setTimeout(function () { app.quit(); }, 500);
}

// ── Lifecycle ───────────────────────────────────────────────
app.whenReady().then(async function () {
  await startServer();
  createWindow();
  setTimeout(checkForUpdates, UPDATE_CHECK_DELAY);
});

app.on('window-all-closed', function () {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
