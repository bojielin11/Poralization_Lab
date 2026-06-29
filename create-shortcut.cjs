// Creates a Windows desktop shortcut for the Electron app
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const workingDir = __dirname;
const shortcutPath = path.join(os.homedir(), 'Desktop', '偏振光虚拟实验系统.lnk');

const psScript = `
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut("${shortcutPath.replace(/\\/g, '\\\\')}")
$Shortcut.TargetPath = "cmd.exe"
$Shortcut.Arguments = "/c cd /d ${workingDir.replace(/\\/g, '\\\\')} && npx electron ."
$Shortcut.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"
$Shortcut.Description = "偏振光虚拟实验系统 — 大学物理光学仿真平台"
$Shortcut.WindowStyle = 1
$Shortcut.Save()
Write-Host "Shortcut created"
`;

const ps = spawn('powershell', ['-Command', psScript], { stdio: 'inherit' });
ps.on('close', (code) => {
  if (code === 0) {
    console.log(`\n桌面快捷方式已创建: ${shortcutPath}`);
    console.log('双击 "偏振光虚拟实验系统" 即可启动。');
  } else {
    console.error('\n快捷方式创建失败');
    console.log('手动启动: cd react-app && npx electron .');
  }
});
